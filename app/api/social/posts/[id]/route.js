import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── Memory‑safe Rate Limiter (per user/IP) ────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;       // 1 minute
const MAX_REQUESTS = 30;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }
  rateLimitMap.set(key, { start: now, count: 1 });
  return true;
}

// ─── UUID v4 validation ─────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── XSS sanitizer ──────────────────────────────
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// ─── Retry helper (timeout & deadlock) ──────────
async function executeWithRetry(client, callback, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callback();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (error.code === '57P01' || error.code === '40P01') {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw error;
    }
  }
}

// ─── Authenticate user (optional) ───────────────
async function getCurrentUser(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await verifyToken(token);
    return { id: decoded.sub || decoded.id, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

// ─── Activity logger ────────────────────────────
async function logActivity(client, userId, action, targetId) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id)
       VALUES ($1, $2, 'post', $3)`,
      [userId, action, targetId]
    );
  } catch (err) {
    // table may not exist – ignore silently
  }
}

// ─── Telegram notification (Isolated Connection & Non‑blocking) ───────
async function notifyAdmin(text) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      // Pool Leak မဖြစ်အောင် သီးသန့် ကွန်နက်ရှင် ယူပြီး ချက်ချင်းပြန်ပိတ်ပါတယ်
      const standaloneClient = await db.connect();
      try {
        const { rows: [config] } = await standaloneClient.query(
          'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
        );
        if (config && config.bot_token && config.chat_id) {
          await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
          });
        }
      } finally {
        standaloneClient.release();
      }
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (e) { /* ignore */ }
}

// ════════════════════════════════════════════════
//  GET /api/social/posts/[id]
// ════════════════════════════════════════════════
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const postId = resolvedParams?.id;
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // Rate limit (by IP as fallback)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const currentUser = await getCurrentUser(req);
  const client = await db.connect();

  try {
    const result = await executeWithRetry(client, async () => {
      const { rows: [post] } = await client.query(
        `SELECT p.*, 
                u.full_name AS user_name, u.uid AS user_uid, u.avatar_url AS user_avatar,
                COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0)::int AS like_count,
                COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::int AS comment_count,
                COALESCE((SELECT COUNT(*) FROM shares WHERE post_id = p.id), 0)::int AS share_count
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [postId]
      );
      if (!post) return null;

      let liked_by_user = false;
      if (currentUser) {
        const likeCheck = await client.query(
          'SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2',
          [postId, currentUser.id]
        );
        liked_by_user = likeCheck.rowCount > 0;
      }
      return { ...post, liked_by_user };
    });

    if (!result) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Connection မပိတ်ခင် Log ရိုက်တာ သေချာအောင် await လုပ်ပေးလိုက်ပါတယ်
    if (currentUser) {
      await logActivity(client, currentUser.id, 'view_post', postId).catch(() => {});
    }

    return NextResponse.json({ post: result });
  } catch (error) {
    console.error('GET post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════
//  PATCH /api/social/posts/[id]
// ════════════════════════════════════════════════
export async function PATCH(req, { params }) {
  const resolvedParams = await params;
  const postId = resolvedParams?.id;
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit (by user ID)
  if (!checkRateLimit(currentUser.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawContent = body.content;
  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  const content = sanitize(rawContent.trim()).slice(0, 5000);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [post] } = await client.query(
      `SELECT user_id, (SELECT uid FROM users WHERE id = posts.user_id) AS user_uid
       FROM posts WHERE id = $1 FOR UPDATE`,
      [postId]
    );
    if (!post) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Ownership check
    if (post.user_id !== currentUser.id && post.user_uid !== currentUser.id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await client.query('UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2', [content, postId]);
    
    // Log activity Inside transaction block for synchronization safety
    await logActivity(client, currentUser.id, 'edit_post', postId);
    
    await client.query('COMMIT');

    // Notification is safely non-blocking outside the main DB pool flow
    notifyAdmin(`✏️ <b>Post Edited</b>\n👤 ${currentUser.name || currentUser.id}\n📌 ${postId}`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Edit post error:', error);
    return NextResponse.json({ error: 'Edit failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════
//  DELETE /api/social/posts/[id]
// ════════════════════════════════════════════════
export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const postId = resolvedParams?.id;
  if (!postId || !UUID_REGEX.test(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  if (!checkRateLimit(currentUser.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [post] } = await client.query(
      `SELECT user_id, (SELECT uid FROM users WHERE id = posts.user_id) AS user_uid
       FROM posts WHERE id = $1 FOR UPDATE`,
      [postId]
    );
    if (!post) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.user_id !== currentUser.id && post.user_uid !== currentUser.id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await client.query('DELETE FROM posts WHERE id = $1', [postId]);
    await logActivity(client, currentUser.id, 'delete_post', postId);
    
    await client.query('COMMIT');

    notifyAdmin(`🗑️ <b>Post Deleted</b>\n👤 ${currentUser.name || currentUser.id}\n📌 ${postId}`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
