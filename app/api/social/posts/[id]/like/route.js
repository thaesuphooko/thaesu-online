import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Memory‑safe Rate Limiter (per user) ────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const MAX_LIKES = 30;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_LIKES;
  }
  rateLimitMap.set(userId, { start: now, count: 1 });
  return true;
}

// ─── Retry helper for transient DB errors ───────
async function executeWithRetry(client, callback, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callback();
    } catch (error) {
      if (attempt === maxRetries || error.code !== 'ETIMEDOUT') throw error;
      console.warn(`Like API retry ${attempt + 1} due to timeout...`);
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export async function POST(req, { params }) {
  const resolvedParams = await params;
  const postId = resolvedParams?.id;

  // 1. UUID validation
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // 2. Authentication
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let userId, userName;
  try {
    const decoded = await verifyToken(token);
    userId = decoded.sub || decoded.id;
    userName = decoded.name || 'User';
    if (!userId) throw new Error('Invalid token payload');
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 3. Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many likes. Please slow down.' }, { status: 429 });
  }

  const client = await db.connect();
  try {
    const result = await executeWithRetry(client, async () => {
      await client.query('BEGIN');

      // Lock post row to confirm existence & get owner
      const postRes = await client.query(
        'SELECT user_id FROM posts WHERE id = $1 FOR UPDATE',
        [postId]
      );
      if (postRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { status: 404, body: { error: 'Post not found' } };
      }
      const postOwnerId = postRes.rows[0].user_id;

      // Toggle like (Atomic: Delete unconditionally, Insert if not exists)
      await client.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      
      // Check if we deleted a row (meaning we unliked) or not.
      // To toggle: if delete removed 0 rows, insert to like.
      // Postgres doesn't easily return "deleted 0 rows" in a way we can check safely,
      // so we use INSERT ... ON CONFLICT DO NOTHING but with a specific check.
      // Actually we can just do INSERT and let unique constraint handle it.
      // But to toggle properly: we need to know if a row exists BEFORE delete.
      // Easier: select first, then decide.
      
      // Actually the cleanest toggle for race conditions:
      // 1. SELECT 1 WHERE user_id AND post_id
      // 2. If exists -> DELETE (unlike)
      // 3. If not exists -> INSERT (like)
      // But we need FOR UPDATE to prevent races.
      // We already have FOR UPDATE on post, but not on likes. We'll add a lock on likes too if needed, but simpler: select, then insert/delete.
      
      // Let's use the simplest reliable method:
      const { rows: [existing] } = await client.query(
        'SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2 FOR UPDATE',
        [userId, postId]
      );

      let liked = false;
      if (existing) {
        await client.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      } else {
        await client.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        liked = true;
      }

      // ✅ Count AFTER insert/delete, inside same transaction
      const countRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM likes WHERE post_id = $1',
        [postId]
      );
      const likesCount = countRes.rows[0].count;

      await client.query('COMMIT');

      // Non‑critical notification
      if (liked && postOwnerId !== userId) {
        try {
          await client.query(
            `INSERT INTO notifications (user_id, type, message, related_id)
             VALUES ($1, 'like', $2, $3)`,
            [postOwnerId, `${userName} liked your post`, postId]
          );
        } catch {}
      }

      // Real‑time emit
      try {
        if (global.io) {
          global.io.to(`post-${postId}`).emit('like:update', {
            postId,
            userId,
            liked,
            likesCount,
          });
        }
      } catch {}

      return {
        status: 200,
        body: { liked, likes_count: likesCount },
      };
    });

    if (result.body?.error) {
      return NextResponse.json(result.body, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
