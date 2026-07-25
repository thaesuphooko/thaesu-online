import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';

// ========== Rate Limiter (In‑memory) ==========
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + 60000;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  return entry.count <= 30; // 30 requests per minute
}

// ========== Dynamic Redis Client ==========
let redis = null;
let redisError = null;

async function getRedisClient() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token || !url.startsWith('https://')) {
    redisError = 'Redis URL or token missing/invalid';
    console.warn('⚠️  Auto‑Heal: Redis not configured –', redisError);
    return null;
  }

  try {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({ url, token });
    // Test connection
    await redis.ping();
    redisError = null;
    console.log('✅ Auto‑Heal: Redis connected');
    return redis;
  } catch (err) {
    redisError = err.message;
    console.error('❌ Auto‑Heal: Redis connection failed –', err.message);
    redis = null;
    return null;
  }
}

// ========== System Utilities ==========
async function getSystemHealth() {
  const health = {
    redis: 'unavailable',
    db: 'unavailable',
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  // Check Redis
  const r = await getRedisClient();
  if (r) {
    try {
      await r.ping();
      health.redis = 'ok';
    } catch (e) {
      health.redis = 'error';
    }
  }

  // Check Database (simple query)
  try {
    const { default: pool } = await import('@/lib/db');
    const start = Date.now();
    await pool.query('SELECT 1');
    health.db = { status: 'ok', latency: `${Date.now() - start}ms` };
  } catch (e) {
    health.db = { status: 'error', message: e.message };
  }

  return health;
}

async function performAutoHeal() {
  const actions = [];
  // Example: clear old pending orders
  try {
    const { default: pool } = await import('@/lib/db');
    const res = await pool.query(
      "UPDATE orders SET status = 'cancelled' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 days'"
    );
    actions.push(`Cancelled ${res.rowCount} stale pending orders`);
  } catch (e) {
    actions.push(`Order cleanup failed: ${e.message}`);
  }

  // Example: flush Redis cache if needed (be careful)
  const r = await getRedisClient();
  if (r) {
    try {
      // Uncomment to clear specific keys
      // await r.flushdb();
      // actions.push('Redis cache flushed');
      const keys = await r.keys('*');
      actions.push(`Redis contains ${keys.length} keys`);
    } catch (e) {
      actions.push(`Redis action failed: ${e.message}`);
    }
  }

  return actions;
}

// ========== API Handlers ==========

// GET – Health status
export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const health = await getSystemHealth();
    return NextResponse.json({ health, redis_error: redisError });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST – Trigger auto‑heal
export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const actions = await performAutoHeal();
    return NextResponse.json({ success: true, actions });
  } catch (error) {
    console.error('Auto‑heal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE – Clear Redis cache (optional)
export async function DELETE(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const r = await getRedisClient();
    if (!r) {
      return NextResponse.json({ error: 'Redis not available' }, { status: 500 });
    }
    await r.flushdb();
    return NextResponse.json({ success: true, message: 'Redis cache cleared' });
  } catch (error) {
    console.error('Redis flush error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
