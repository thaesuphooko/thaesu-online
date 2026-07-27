export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import db from '@/lib/db';

// ╔═══════════════════════════════════════════════════════════════════╗
// ║  TOP 1 INFINITY PREMIUM ULTRA PRO MAX – Crawler List/Create    ║
// ╚═══════════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────────────
// 1. Self‑cleaning Token Bucket Rate Limiter
// ──────────────────────────────────────────────────────────────────────
class TokenBucket {
  constructor() {
    this.buckets = new Map();
    this.cleanupTimer = setInterval(() => this.evictStale(), 5 * 60_000);
  }

  consume(key, maxTokens = 60, windowMs = 60_000) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refills = Math.floor(elapsed / windowMs) * maxTokens;
      if (refills > 0) {
        bucket.tokens = Math.min(maxTokens, bucket.tokens + refills);
        bucket.lastRefill = now;
      }
    }
    if (bucket.tokens > 0) { bucket.tokens--; return true; }
    return false;
  }

  evictStale() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 5 * 60_000) this.buckets.delete(key);
    }
  }
}

const rateLimiter = new TokenBucket();

// ──────────────────────────────────────────────────────────────────────
// 2. Higher‑Order Middleware
// ──────────────────────────────────────────────────────────────────────
function withAdminAuth(handler) {
  return async (request, context) => {
    const auth = checkAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return handler(request, context);
  };
}

function withRateLimit(handler, maxTokens = 60, windowMs = 60_000) {
  return async (request, context) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimiter.consume(ip, maxTokens, windowMs)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
    return handler(request, context);
  };
}

function withAdminAndRateLimit(handler, maxTokens = 60) {
  return withAdminAuth(withRateLimit(handler, maxTokens));
}

// ──────────────────────────────────────────────────────────────────────
// 3. Helpers
// ──────────────────────────────────────────────────────────────────────
function parseConfig(raw) {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { throw new Error('Invalid config JSON'); }
  }
  throw new Error('Config must be an object or a JSON string');
}

// ──────────────────────────────────────────────────────────────────────
// 4. Route Handlers
// ──────────────────────────────────────────────────────────────────────

async function listJobs(request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  let query = 'SELECT * FROM crawl_jobs';
  const params = [];
  const conditions = [];
  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (type) {
    conditions.push(`type = $${params.length + 1}`);
    params.push(type);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const { rows } = await db.query(query, params);
  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'private, max-age=15' },
  });
}

async function createJob(request) {
  const body = await request.json();
  const { name, start_url, config: rawConfig, type } = body;

  if (!start_url || typeof start_url !== 'string' || !/^https?:\/\/.+/.test(start_url)) {
    return NextResponse.json({ error: 'A valid start_url is required' }, { status: 400 });
  }

  let configObj;
  try {
    configObj = parseConfig(rawConfig);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // ✅ Ensure type is saved correctly
  const jobType = (type === 'wattpad') ? 'wattpad' : 'products';

  const { rows: [job] } = await db.query(
    `INSERT INTO crawl_jobs (name, start_url, config, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name || '', start_url, JSON.stringify(configObj), jobType]
  );
  return NextResponse.json(job, { status: 201 });
}

// ──────────────────────────────────────────────────────────────────────
// 5. Exported route handlers (wrapped with middleware)
// ──────────────────────────────────────────────────────────────────────
export const GET = withAdminAndRateLimit(listJobs);
export const POST = withAdminAndRateLimit(createJob);
