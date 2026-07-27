export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import db from '@/lib/db';
import { startCrawlJob, stopCrawlJob, getCrawlProgress } from '@/lib/crawler';
import { startWattpadCrawl } from '@/lib/wattpadCrawler';

// ╔═══════════════════════════════════════════════════════════════════╗
// ║  TOP 1 INFINITY PREMIUM ULTRA PRO MAX – Crawler Job Detail      ║
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
function withAdmin(handler) {
  return async (req, ctx) => {
    const auth = checkAdmin(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return handler(req, ctx);
  };
}
function withRateLimit(handler) {
  return async (req, ctx) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimiter.consume(ip)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    return handler(req, ctx);
  };
}
const wrap = (h) => withAdmin(withRateLimit(h));

// ──────────────────────────────────────────────────────────────────────
// 3. Route Handlers
// ──────────────────────────────────────────────────────────────────────

/**
 * GET – Fetch comprehensive job details, logs, progress, queue stats, and Wattpad results.
 */
async function getJob(req, { params }) {
  const { jobId } = await params;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const logLevel = url.searchParams.get('level') || '';
  const wattpadPage = parseInt(url.searchParams.get('wattpadPage') || '1');
  const wattpadLimit = Math.min(parseInt(url.searchParams.get('wattpadLimit') || '50'), 200);
  const wattpadOffset = (wattpadPage - 1) * wattpadLimit;

  try {
    const [jobResult, logsResult, progress, queueStats, wattpadResult] = await Promise.all([
      db.query('SELECT * FROM crawl_jobs WHERE id = $1', [jobId]),
      db.query(
        logLevel
          ? 'SELECT * FROM crawl_logs WHERE job_id = $1 AND level = $2 ORDER BY created_at DESC LIMIT $3'
          : 'SELECT * FROM crawl_logs WHERE job_id = $1 ORDER BY created_at DESC LIMIT $2',
        logLevel ? [jobId, logLevel, limit] : [jobId, limit]
      ),
      getCrawlProgress(jobId),
      db.query('SELECT status, COUNT(*)::int FROM crawl_queue WHERE job_id = $1 GROUP BY status', [jobId]),
      db.query(
        'SELECT * FROM wattpad_cache ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [wattpadLimit, wattpadOffset]
      ),
    ]);

    const job = jobResult.rows[0];
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Get total Wattpad count for pagination
    const { rows: [wattpadCount] } = await db.query('SELECT COUNT(*)::int FROM wattpad_cache');

    return NextResponse.json(
      {
        job: { ...job, config: job.config || {} },
        logs: logsResult.rows,
        progress: {
          ...progress,
          byStatus: queueStats.rows.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {}),
        },
        wattpadStories: {
          items: wattpadResult.rows,
          total: parseInt(wattpadCount.count),
          page: wattpadPage,
          limit: wattpadLimit,
          totalPages: Math.ceil(parseInt(wattpadCount.count) / wattpadLimit),
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=10' } }
    );
  } catch (e) {
    console.error('Crawler detail error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH – Control job (start, stop, reset queue) or update config.
 */
async function patchJob(req, { params }) {
  const { jobId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { action, config } = body;

  // ── Config update ──
  if (config) {
    if (typeof config !== 'object') {
      return NextResponse.json({ error: 'Config must be a JSON object' }, { status: 400 });
    }
    try {
      const { rows: [updated] } = await db.query(
        'UPDATE crawl_jobs SET config = config || $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(config), jobId]
      );
      if (!updated) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      return NextResponse.json({ job: updated });
    } catch (e) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  // ── Actions ──
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  try {
    switch (action) {
      case 'start': {
        const job = (await db.query('SELECT * FROM crawl_jobs WHERE id = $1', [jobId])).rows[0];
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        const starter = job.type === 'wattpad' ? startWattpadCrawl : startCrawlJob;
        starter(jobId, job.start_url).catch(console.error);
        return NextResponse.json({ message: 'Crawl started' });
      }
      case 'stop': {
        await stopCrawlJob(jobId);
        return NextResponse.json({ message: 'Crawl stopped' });
      }
      case 'reset_queue': {
        await db.query(
          "UPDATE crawl_queue SET status = 'pending' WHERE job_id = $1 AND status IN ('failed','processing')",
          [jobId]
        );
        return NextResponse.json({ message: 'Queue reset' });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (e) {
    console.error('Crawler action error:', e);
    return NextResponse.json({ error: e.message || 'Action failed' }, { status: 500 });
  }
}

/**
 * DELETE – Remove a crawl job and its associated logs/queue.
 */
async function deleteJob(req, { params }) {
  const { jobId } = await params;
  try {
    await db.query('DELETE FROM crawl_jobs WHERE id = $1', [jobId]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Crawler delete error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export const GET = wrap(getJob);
export const PATCH = wrap(patchJob);
export const DELETE = wrap(deleteJob);
