export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import db from '@/lib/db';

// Token Bucket Rate Limiter
class TokenBucket {
  constructor() {
    this.buckets = new Map();
    setInterval(() => this.evictStale(), 5 * 60_000);
  }
  consume(key, maxTokens = 30, windowMs = 60_000) {
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

function withAdminAuth(handler) {
  return async (request, context) => {
    const auth = checkAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return handler(request, context);
  };
}
function withRateLimit(handler) {
  return async (request, context) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimiter.consume(ip)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    return handler(request, context);
  };
}
const withAuthAndRateLimit = (handler) => withAdminAuth(withRateLimit(handler));

// Ensure webhook_configs table exists
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        webhook_type VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (webhook_type IN ('slack','discord','telegram','custom')),
        webhook_url TEXT NOT NULL,
        bot_token TEXT,
        chat_id TEXT,
        is_active BOOLEAN DEFAULT true,
        events JSONB DEFAULT '["crawl_started","crawl_completed","crawl_failed"]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
  } catch (e) {
    console.error('Webhook table creation error:', e.message);
  }
}
ensureTable();

async function listWebhooks(request) {
  const { rows } = await db.query('SELECT * FROM webhook_configs ORDER BY created_at DESC');
  return NextResponse.json(rows);
}

async function createWebhook(request) {
  const body = await request.json();
  const { name, webhook_type, webhook_url, bot_token, chat_id, events } = body;
  if (!name || !webhook_url) return NextResponse.json({ error: 'name and webhook_url required' }, { status: 400 });

  const { rows: [webhook] } = await db.query(
    `INSERT INTO webhook_configs (name, webhook_type, webhook_url, bot_token, chat_id, events)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, webhook_type || 'custom', webhook_url, bot_token || null, chat_id || null, JSON.stringify(events || ['crawl_started', 'crawl_completed', 'crawl_failed'])]
  );
  return NextResponse.json(webhook, { status: 201 });
}

async function updateWebhook(request) {
  const body = await request.json();
  const { id, name, webhook_type, webhook_url, bot_token, chat_id, events, is_active } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { rows: [webhook] } = await db.query(
    `UPDATE webhook_configs SET name=$1, webhook_type=$2, webhook_url=$3, bot_token=$4, chat_id=$5, events=$6, is_active=$7, updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [name, webhook_type, webhook_url, bot_token, chat_id, JSON.stringify(events), is_active, id]
  );
  if (!webhook) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(webhook);
}

async function deleteWebhook(request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.query('DELETE FROM webhook_configs WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}

async function testWebhook(request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { rows: [config] } = await db.query('SELECT * FROM webhook_configs WHERE id = $1', [id]);
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const { notifyCrawlEvent } = await import('@/lib/webhook-notifier');
    await notifyCrawlEvent({
      type: 'test',
      jobId: 'test',
      jobName: 'Test Job',
      status: 'completed',
      message: 'Webhook test successful! ✅',
      stats: { productCount: 0, duration: '0ms' },
    });
    return NextResponse.json({ success: true, message: 'Test notification sent' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = withAuthAndRateLimit(listWebhooks);
export const POST = withAuthAndRateLimit(createWebhook);
export const PATCH = withAuthAndRateLimit(updateWebhook);
export const DELETE = withAuthAndRateLimit(deleteWebhook);
export const PUT = withAuthAndRateLimit(testWebhook);
