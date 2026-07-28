import { NextResponse } from 'next/server';
import db from '@/lib/db';

// ════════════════════════════════════════════════════════════
//  GOD MODE – GET COMMENTS API (Ultra Max)
//  · UUID validation, rate limiting, retry on DB timeout,
//  · defensive null checks, proper error handling
// ════════════════════════════════════════════════════════════

// ─── Memory‑safe rate limiter (per IP) ──────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;       // 1 minute
const MAX_REQUESTS = 60;          // generous for read-only
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }
  rateLimitMap.set(ip, { start: now, count: 1 });
  return true;
}

// ─── UUID v4 validation ─────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Retry helper (for DB timeouts) ────────────
async function executeWithRetry(client, callback, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callback();
    } catch (error) {
      if (attempt === maxRetries || error.code !== '57P01') throw error;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export async function GET(req, { params }) {
  // ✅ Await params (required in Next.js App Router)
  const resolvedParams = await params;
  const postId = resolvedParams?.id;

  // 1. Validate post ID
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // 2. Rate limit (by IP)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  // 3. Execute query with retry
  const client = await db.connect();
  try {
    const result = await executeWithRetry(client, async () => {
      const { rows } = await client.query(
        `SELECT c.id, c.content, c.created_at, u.full_name AS user_name, u.uid, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $1
         ORDER BY c.created_at ASC`,
        [postId]
      );
      return rows;
    });

    return NextResponse.json({ comments: result });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
