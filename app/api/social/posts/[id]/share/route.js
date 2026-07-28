import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ─── Rate Limiter (in‑memory with auto‑cleanup) ───
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_SHARES = 20;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW_MS) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (entry && now - entry.start < RATE_WINDOW_MS) {
    entry.count++;
    return entry.count <= MAX_SHARES;
  }
  rateLimitMap.set(userId, { start: now, count: 1 });
  return true;
}

// ─── UUID v4 regex ─────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Notification helper ───────────────────────
async function notifyPostOwner(client, postOwnerId, sharerName, postId) {
  if (!postOwnerId) return;
  try {
    await client.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'share', $2, $3)`,
      [postOwnerId, `${sharerName} shared your post`, postId]
    );
  } catch (err) {
    console.error('Notification insert error:', err.message);
  }
}

// ─── Activity logger ───────────────────────────
async function logActivity(client, userId, action, targetId) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id)
       VALUES ($1, $2, 'post', $3)`,
      [userId, action, targetId]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

// ─── Telegram notification (non‑blocking) ──────
async function notifyAdminTelegram(client, userName, postId) {
  try {
    const { rows: [tg] } = await client.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
    );
    if (!tg) return;
    await fetch(`https://api.telegram.org/bot${tg.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tg.chat_id,
        text: `🔄 <b>Post Shared</b>\n👤 ${userName}\n📌 ${postId}`,
        parse_mode: 'HTML',
      }),
    });
  } catch {}
}

// ─── Retry helper ──────────────────────────────
async function executeWithRetry(client, cb, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await cb();
    } catch (error) {
      if (attempt === maxRetries || error.code !== '57P01') throw error; // 57P01 = admin shutdown
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export async function POST(req, { params }) {
  const { id: postId } = await params;

  // 1. UUID validation
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // 2. Auth
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const userId = decoded.sub || decoded.id;
  const userName = decoded.name || 'Someone';
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
  }

  // 3. Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Too many shares. Please slow down.' },
      { status: 429 }
    );
  }

  const client = await db.connect();
  try {
    const result = await executeWithRetry(client, async () => {
      await client.query('BEGIN');

      // Lock post row to ensure existence & get owner
      const postRes = await client.query(
        'SELECT user_id FROM posts WHERE id = $1 FOR UPDATE',
        [postId]
      );
      if (postRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { status: 404, body: { error: 'Post not found' } };
      }
      const postOwnerId = postRes.rows[0].user_id;

      // Insert share (allow multiple)
      await client.query(
        'INSERT INTO shares (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );

      // Increment share count atomically (ignore if column missing)
      try {
        await client.query(
          'UPDATE posts SET share_count = COALESCE(share_count, 0) + 1 WHERE id = $1',
          [postId]
        );
      } catch {}

      // Get current share count
      const countRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM shares WHERE post_id = $1',
        [postId]
      );
      const shareCount = countRes.rows[0].count;

      await client.query('COMMIT');

      // Post‑commit actions (non‑critical)
      await notifyPostOwner(client, postOwnerId, userName, postId);
      await logActivity(client, userId, 'share', postId);
      notifyAdminTelegram(client, userName, postId).catch(() => {});

      // Real‑time emit
      try {
        if (global.io) {
          global.io.to(`post-${postId}`).emit('share:update', {
            postId,
            userId,
            userName,
            shareCount,
          });
        }
      } catch {}

      return {
        status: 200,
        body: { shared: true, share_count: shareCount },
      };
    });

    if (result.body?.error) {
      return NextResponse.json(result.body, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Share error:', error);
    return NextResponse.json({ error: 'Share failed due to server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
