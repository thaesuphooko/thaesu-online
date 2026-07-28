import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ═════════════════════════════════════════════════════════════
//  GOD MODE PROFILE UPDATE – Ultimate Production-Ready Route
// ═════════════════════════════════════════════════════════════

// ─── Memory‑safe rate limiter (auto‑cleanup) ────────────────
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW_MS) rateLimitMap.delete(key);
  }
}, 300_000).unref?.(); // unref to prevent process hang

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (entry && now - entry.start < RATE_WINDOW_MS) {
    entry.count++;
    return entry.count <= RATE_MAX;
  }
  rateLimitMap.set(userId, { start: now, count: 1 });
  return true;
}

// ─── XSS / injection sanitizer ─────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Normalize optional fields to null for DB consistency ───
function normalize(value) {
  if (value === '' || value === undefined) return null;
  return value;
}

// ─── Granular validators ───────────────────────────────────
const VALIDATORS = {
  full_name: (v) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 100,
  email: (v) => {
    if (v === null || v === undefined || v === '') return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  },
  phone: (v) => {
    if (!v) return true;
    const cleaned = v.replace(/[\s\-\(\)]/g, '');
    return /^\+?[0-9]{7,15}$/.test(cleaned);
  },
  bio: (v) => typeof v === 'string' && v.length <= 500,
  website: (v) => {
    if (!v) return true;
    try {
      const url = new URL(v);
      return url.protocol === 'https:';
    } catch { return false; }
  },
  avatar_url: (v) => {
    if (!v) return true;
    try { new URL(v); return v.startsWith('https://'); } catch { return false; }
  },
  cover_url: (v) => {
    if (!v) return true;
    try { new URL(v); return v.startsWith('https://'); } catch { return false; }
  },
  social_links: (v) => {
    if (!v) return true;
    if (typeof v !== 'object' || Array.isArray(v)) return false;
    const allowed = ['facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];
    for (const key of Object.keys(v)) {
      if (!allowed.includes(key)) return false;
      if (v[key] && typeof v[key] === 'string') {
        try { new URL(v[key]); } catch { return false; }
      }
    }
    return true;
  },
};

function validateFields(updates) {
  const errors = [];
  for (const [field, value] of Object.entries(updates)) {
    const validator = VALIDATORS[field];
    if (validator && !validator(value)) {
      errors.push(field);
    }
  }
  return errors;
}

// ─── Main handler ──────────────────────────────────────────
export async function PUT(req) {
  // 1. Auth
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const userId = decoded.sub || decoded.id;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
  }

  // 2. Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // 3. Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 4. Whitelist & normalize fields
  const allowed = ['full_name', 'email', 'phone', 'bio', 'website', 'avatar_url', 'cover_url', 'social_links'];
  const updates = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      let value = body[field];
      // Normalize strings: sanitize and convert empty to null for optional fields
      if (typeof value === 'string') {
        value = sanitize(value.trim());
        if (value === '') value = null;
      }
      // For optional fields that can be null, keep as is
      updates[field] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // 5. Validation
  const invalidFields = validateFields(updates);
  if (invalidFields.length > 0) {
    return NextResponse.json({
      error: 'Validation failed',
      details: invalidFields.map(f => `Invalid value for ${f}`),
    }, { status: 422 });
  }

  // 6. Fetch old user data for audit & notification
  let oldUser;
  try {
    const { rows } = await db.query(
      'SELECT full_name, email, phone, avatar_url, cover_url, social_links FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    oldUser = rows[0];
  } catch (err) {
    console.error('DB fetch error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // 7. Dynamic update (handle social_links jsonb merge)
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
  values.push(userId);
  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;

  // 8. Execute with transaction & error handling
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [updatedUser] } = await client.query(query, values);
    if (!updatedUser) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    await client.query('COMMIT');

    // 9. Audit log (non‑blocking)
    try {
      await client.query(
        `INSERT INTO user_audit_logs (user_id, action, old_values, new_values)
         VALUES ($1, 'profile_update', $2::jsonb, $3::jsonb)`,
        [userId, JSON.stringify(oldUser), JSON.stringify(updates)]
      );
    } catch (auditErr) {
      console.warn('Audit log skipped:', auditErr.message);
    }

    // 10. Telegram admin notification (non‑blocking)
    try {
      const { rows: [telegram] } = await client.query(
        'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
      );
      if (telegram) {
        const changed = Object.keys(updates)
          .map(f => `• ${f}: ${oldUser[f] ?? 'N/A'} → ${updates[f] ?? 'null'}`)
          .join('%0A');
        const text = `🔔 <b>Profile Updated</b>%0A👤 ${oldUser.full_name}%0A${changed}`;
        await fetch(`https://api.telegram.org/bot${telegram.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegram.chat_id, text, parse_mode: 'HTML' }),
        });
      }
    } catch (telErr) {
      // silently ignore
    }

    // 11. Real‑time WebSocket broadcast (if available)
    try {
      if (global.io) {
        global.io.to(`user-${userId}`).emit('profile:updated', {
          user: updatedUser,
          changedFields: Object.keys(updates),
        });
      }
    } catch {}

    // 12. Remove sensitive fields before sending response
    const { password_hash, ...safeUser } = updatedUser;
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Profile update transaction error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
