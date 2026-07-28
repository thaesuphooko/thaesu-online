import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ════════════════════════════════════════════════════════════
//  GOD MODE – COMMENT API (Premium Ultra Max)
//  · UUID v4 validation, JWT auth, rate limiting
//  · XSS sanitization, transaction + row lock
//  · Notification to post owner (5 min dedup)
//  · Activity logging, Telegram alert, real‑time emit
//  · Retry on DB timeout, length validation
// ════════════════════════════════════════════════════════════

// ─── Memory‑safe rate limiter (per user) ────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const MAX_COMMENTS = 20;
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
    return entry.count <= MAX_COMMENTS;
  }
  rateLimitMap.set(userId, { start: now, count: 1 });
  return true;
}

// ─── UUID v4 regex ─────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── XSS sanitizer ──────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

// ─── Notification helper (prevents duplicate in 5 min) ───
async function notifyPostOwner(client, postOwnerId, commenterName, postId) {
  if (!postOwnerId || postOwnerId === commenterName) return;
  try {
    const { rows: [existing] } = await client.query(
      `SELECT id FROM notifications
       WHERE user_id = $1 AND type = 'comment' AND related_id = $2
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [postOwnerId, postId]
    );
    if (existing) return;

    await client.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'comment', $2, $3)`,
      [postOwnerId, `${commenterName} commented on your post`, postId]
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

// ─── Telegram alert (non‑blocking) ─────────────
async function notifyAdminTelegram(client, userName, contentPreview, postId) {
  try {
    const { rows: [tg] } = await client.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
    );
    if (!tg) return;
    const preview = contentPreview.length > 50 ? contentPreview.slice(0, 47) + '...' : contentPreview;
    await fetch(`https://api.telegram.org/bot${tg.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tg.chat_id,
        text: `💬 <b>New Comment</b>\n👤 ${userName}\n📝 ${preview}\n📌 ${postId}`,
        parse_mode: 'HTML',
      }),
    });
  } catch {}
}

// ─── Main POST handler ─────────────────────────
export async function POST(req, { params }) {
  const { id: postId } = await params;

  // 1. UUID validation
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // 2. Authentication
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

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
    return NextResponse.json(
      { error: 'Too many comments. Please slow down.' },
      { status: 429 }
    );
  }

  // 4. Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawContent = body.content;
  if (!rawContent || typeof rawContent !== 'string') {
    return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
  }

  // Sanitize and trim
  const content = sanitize(rawContent.trim());
  if (content.length < 1 || content.length > 1000) {
    return NextResponse.json(
      { error: 'Comment must be between 1 and 1000 characters' },
      { status: 400 }
    );
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

      // Insert comment
      const { rows: [comment] } = await client.query(
        `INSERT INTO comments (user_id, post_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, post_id, content, created_at`,
        [userId, postId, content]
      );

      // Fetch comment author info
      const { rows: [author] } = await client.query(
        'SELECT full_name, avatar_url, uid FROM users WHERE id = $1',
        [userId]
      );

      await client.query('COMMIT');

      // Build response
      const commentData = {
        ...comment,
        author: {
          id: userId,
          full_name: author?.full_name || 'Unknown',
          avatar_url: author?.avatar_url || null,
          uid: author?.uid || null,
        },
      };

      // Post‑commit actions (non‑critical)
      await notifyPostOwner(client, postOwnerId, userName, postId);
      await logActivity(client, userId, 'comment', postId);
      notifyAdminTelegram(client, userName, content, postId).catch(() => {});

      // Real‑time emit
      try {
        if (global.io) {
          global.io.to(`post-${postId}`).emit('comment:new', commentData);
        }
      } catch {}

      return {
        status: 201,
        body: { success: true, comment: commentData },
      };
    });

    if (result.body?.error) {
      return NextResponse.json(result.body, { status: result.status });
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
