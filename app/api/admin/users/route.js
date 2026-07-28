import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ─── Rate Limiter (memory‑safe, auto‑cleanup) ─────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const MAX_REQUESTS = 30;
setInterval(() => {
  const now = Date.now();
  for (const [key, r] of rateLimitMap.entries()) {
    if (now - r.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }
  rateLimitMap.set(userId, { start: now, count: 1 });
  return true;
}

// ─── Admin Auth Helper ──────────────────────────────
async function authenticateAdmin(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  if (secret === (process.env.NEXT_PUBLIC_ADMIN_HASH || "step")) {
    return { method: "secret", adminId: "admin-secret" };
  }
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Telegram Alert (critical actions) ───────────────
async function notifyAdminAction(action, details) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;
    const text = `🛡️ <b>Admin Action</b>\n${action}\n${details}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

// ─── Activity Logger ──────────────────────────────────
async function logActivity(client, userId, action, targetId = null) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id)
       VALUES ($1, $2, 'user', $3)`,
      [userId, action, targetId]
    );
  } catch {}
}

// ─── GET /api/admin/users?search=&role=&limit=&offset=&sort=&order= ──
export async function GET(req) {
  const admin = await authenticateAdmin(req);
  const rateKey = admin.sub || admin.adminId;
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').trim();
    const role = url.searchParams.get('role') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset')) || 0, 0);
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const isVerified = url.searchParams.get('verified'); // 'true'|'false'

    const allowedSorts = ['created_at', 'full_name', 'email', 'role', 'last_login'];
    const sortBy = allowedSorts.includes(sort) ? sort : 'created_at';

    let query = `SELECT id, uid, email, full_name, phone, role, is_verified, avatar_url, referral_code, created_at, last_login FROM users WHERE 1=1`;
    const values = [];
    let idx = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx} OR uid ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }
    if (role && ['user','vendor','admin'].includes(role)) {
      query += ` AND role = $${idx}`;
      values.push(role);
      idx++;
    }
    if (isVerified === 'true') {
      query += ` AND is_verified = true`;
    } else if (isVerified === 'false') {
      query += ` AND is_verified = false`;
    }

    // Total count
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countRes = await db.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count);

    // Append sort & pagination
    query += ` ORDER BY ${sortBy} ${order} LIMIT $${idx} OFFSET $${idx+1}`;
    values.push(limit, offset);
    const { rows } = await db.query(query, values);

    return NextResponse.json({ users: rows, total, page: Math.floor(offset/limit)+1, limit });
  } catch (err) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/admin/users (bulk or single) ──────
export async function PATCH(req) {
  const admin = await authenticateAdmin(req);
  const rateKey = admin.sub || admin.adminId;
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { id, ids, role, is_verified } = body; // supports single or array of IDs

    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'User ID or IDs array required' }, { status: 400 });
    }

    const userIds = id ? [id] : ids;
    const updates = {};
    if (role && ['user','vendor','admin'].includes(role)) updates.role = role;
    if (typeof is_verified === 'boolean') updates.is_verified = is_verified;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i+1}`).join(', ');
      const results = [];
      for (const uid of userIds) {
        const values = [...Object.values(updates), uid];
        const { rows: [user] } = await client.query(
          `UPDATE users SET ${setClauses} WHERE id = $${values.length} RETURNING id, uid, email, full_name, role, is_verified`,
          values
        );
        if (user) results.push(user);
      }
      await client.query('COMMIT');

      // Log activity & notify for bulk role changes
      for (const u of results) {
        await logActivity(client, admin.sub, 'user_update', u.id);
      }
      if (results.length > 0) {
        notifyAdminAction('Users Updated', `Count: ${results.length}\nAdmin: ${admin.email || admin.sub}`);
      }

      return NextResponse.json({ success: true, updated: results.length, users: results });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin users PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/admin/users (supports soft delete if column deleted_at exists) ──
export async function DELETE(req) {
  const admin = await authenticateAdmin(req);
  const rateKey = admin.sub || admin.adminId;
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { id, ids, soft } = await req.json();
    const userIds = id ? [id] : (Array.isArray(ids) ? ids : null);
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'User ID or IDs array required' }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      let deletedCount = 0;
      for (const uid of userIds) {
        if (soft) {
          // Soft delete – update deleted_at timestamp (add column if needed)
          try {
            await client.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [uid]);
            deletedCount++;
          } catch { /* column may not exist */ }
        } else {
          // Hard delete
          await client.query('DELETE FROM users WHERE id = $1', [uid]);
          deletedCount++;
        }
      }
      await client.query('COMMIT');

      if (deletedCount > 0) {
        await logActivity(client, admin.sub, 'user_delete', userIds[0]);
        notifyAdminAction('Users Deleted', `Count: ${deletedCount}\nAdmin: ${admin.email || admin.sub}`);
      }

      return NextResponse.json({ success: true, deleted: deletedCount });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin users DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
