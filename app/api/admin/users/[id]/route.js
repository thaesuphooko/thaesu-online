import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ════════════════════════════════════════════════════════════
//  GOD MODE – SINGLE USER ADMIN API (Ultra Max)
//  · Full user CRUD with stats, audit, notifications,
//  · soft/hard delete, granular updates, UUID validation
// ════════════════════════════════════════════════════════════

// ─── Rate Limiter (per admin, auto-clean) ────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const MAX_REQUESTS = 30;
setInterval(() => {
  const now = Date.now();
  for (const [key, r] of rateLimitMap.entries()) {
    if (now - r.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(adminId) {
  const now = Date.now();
  const entry = rateLimitMap.get(adminId);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }
  rateLimitMap.set(adminId, { start: now, count: 1 });
  return true;
}

// ─── Admin Authentication ─────────────────────────
async function authenticateAdmin(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return null;
    return decoded; // { sub: userId, email, role, name }
  } catch { return null; }
}

// ─── UUID v4 Validation ───────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str) { return UUID_REGEX.test(str); }

// ─── Telegram Notification ─────────────────────────
async function notifyAdmin(action, details) {
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

// ─── Activity Log ─────────────────────────────────
async function logActivity(client, adminId, action, targetId) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id)
       VALUES ($1, $2, 'user', $3)`,
      [adminId, action, targetId]
    );
  } catch {}
}

// ─── GET /api/admin/users/[id] ────────────────────
export async function GET(req, { params }) {
  const { id } = params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(admin.sub)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Fetch user profile
    const { rows: [user] } = await db.query(
      `SELECT id, uid, email, full_name, phone, role, is_verified,
              avatar_url, cover_url, bio, social_links, referral_code,
              created_at, last_login
       FROM users WHERE id = $1`,
      [id]
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch order stats (optional but valuable)
    let stats = { total_orders: 0, total_spent: '0.00' };
    try {
      const orderStats = await db.query(
        `SELECT COUNT(*)::int AS total_orders,
                COALESCE(SUM(total_amount), 0)::numeric(10,2) AS total_spent
         FROM orders WHERE user_id = $1 AND status != 'cancelled'`,
        [id]
      );
      if (orderStats.rows[0]) {
        stats = {
          total_orders: orderStats.rows[0].total_orders,
          total_spent: orderStats.rows[0].total_spent.toString(),
        };
      }
    } catch (e) { /* orders table may not exist yet */ }

    return NextResponse.json({ user: { ...user, stats } });
  } catch (err) {
    console.error('Admin single user GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/admin/users/[id] ─────────────────
export async function PATCH(req, { params }) {
  const { id } = params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(admin.sub)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Allowed fields that admin can modify
  const allowedFields = ['full_name', 'email', 'phone', 'bio', 'role', 'is_verified', 'avatar_url', 'cover_url', 'social_links'];
  const updates = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      let value = body[field];
      // Basic validation
      if (field === 'email' && value !== null && typeof value === 'string') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }
      }
      if (field === 'role' && !['user','vendor','admin'].includes(value)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      if (field === 'is_verified' && typeof value !== 'boolean') {
        return NextResponse.json({ error: 'is_verified must be boolean' }, { status: 400 });
      }
      if (field === 'social_links' && value !== null && typeof value !== 'object') {
        return NextResponse.json({ error: 'social_links must be an object' }, { status: 400 });
      }
      updates[field] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [field, value] of Object.entries(updates)) {
      if (field === 'social_links') {
        setClauses.push(`social_links = COALESCE(social_links, '{}'::jsonb) || $${idx}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${field} = $${idx}`);
        values.push(value);
      }
      idx++;
    }
    values.push(id);

    const { rows: [updated] } = await client.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, uid, email, full_name, role, is_verified, phone, bio, avatar_url, cover_url, social_links`,
      values
    );
    if (!updated) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await client.query('COMMIT');

    // Audit
    await logActivity(client, admin.sub, 'user_updated', id);

    // Telegram if role changed
    if (updates.role) {
      notifyAdmin('User Role Changed', `User ${updated.full_name} (${updated.email}) → ${updates.role} by admin ${admin.name || admin.email}`);
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Admin single user PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────
export async function DELETE(req, { params }) {
  const { id } = params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(admin.sub)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Determine soft or hard delete
  let force = false;
  try {
    const json = await req.json();
    force = json.force === true;
  } catch {}

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const { rows: [user] } = await client.query('SELECT id, email, full_name FROM users WHERE id = $1', [id]);
    if (!user) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (force) {
      // Hard delete
      await client.query('DELETE FROM users WHERE id = $1', [id]);
    } else {
      // Soft delete – set deleted_at if column exists, else fallback to hard delete
      try {
        await client.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);
      } catch (e) {
        // deleted_at column doesn't exist, perform hard delete as fallback
        await client.query('DELETE FROM users WHERE id = $1', [id]);
      }
    }

    await client.query('COMMIT');

    await logActivity(client, admin.sub, 'user_deleted', id);
    notifyAdmin('User Deleted', `User ${user.full_name} (${user.email}) deleted by admin ${admin.name || admin.email}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Admin single user DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
