export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import db from '@/lib/db';

// ╔═══════════════════════════════════════════════════════════════════╗
// ║  INFINITY PREMIUM ULTRA PRO MAX – Queue Management API          ║
// ╚═══════════════════════════════════════════════════════════════════╝

// Token Bucket Rate Limiter
class TokenBucket {
  constructor() {
    this.buckets = new Map();
    setInterval(() => this.evictStale(), 5 * 60_000);
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
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }
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

// Middleware helpers
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
    if (!rateLimiter.consume(ip)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
    return handler(request, context);
  };
}

const withAuthAndRateLimit = (handler) => withAdminAuth(withRateLimit(handler));

// ─── GET: List queue items with filters and pagination ───
async function listQueue(request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job_id');
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];
  if (jobId) {
    where += ' WHERE job_id = $' + (params.length + 1);
    params.push(jobId);
  }
  if (status) {
    where += (where ? ' AND' : ' WHERE') + ' status = $' + (params.length + 1);
    params.push(status);
  }

  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM crawl_queue ${where} ORDER BY priority DESC, created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*)::int FROM crawl_queue ${where}`, params),
  ]);

  return NextResponse.json({
    items: itemsResult.rows,
    total: countResult.rows[0].count,
    page,
    limit,
    totalPages: Math.ceil(countResult.rows[0].count / limit),
  });
}

// ─── PATCH: Bulk update queue items ───
async function bulkUpdateQueue(request) {
  const body = await request.json();
  const { ids, action, priority } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: 'Max 100 items per bulk operation' }, { status: 400 });
  }

  let result;
  switch (action) {
    case 'retry':
      result = await db.query(
        "UPDATE crawl_queue SET status = 'pending' WHERE id = ANY($1::uuid[])",
        [ids]
      );
      break;
    case 'skip':
      result = await db.query(
        "UPDATE crawl_queue SET status = 'done' WHERE id = ANY($1::uuid[])",
        [ids]
      );
      break;
    case 'remove':
      result = await db.query(
        'DELETE FROM crawl_queue WHERE id = ANY($1::uuid[])',
        [ids]
      );
      break;
    case 'set_priority':
      if (priority === undefined) {
        return NextResponse.json({ error: 'priority value required' }, { status: 400 });
      }
      result = await db.query(
        'UPDATE crawl_queue SET priority = $2 WHERE id = ANY($1::uuid[])',
        [ids, priority]
      );
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    affected: result.rowCount,
    action,
  });
}

// ─── DELETE: Clear queue for a job ───
async function clearQueue(request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 });

  const status = url.searchParams.get('status'); // optional: only clear specific status
  let query = 'DELETE FROM crawl_queue WHERE job_id = $1';
  const params = [jobId];
  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }

  const result = await db.query(query, params);
  return NextResponse.json({ success: true, deleted: result.rowCount });
}

// Export handlers
export const GET = withAuthAndRateLimit(listQueue);
export const PATCH = withAuthAndRateLimit(bulkUpdateQueue);
export const DELETE = withAuthAndRateLimit(clearQueue);
