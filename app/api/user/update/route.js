import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

// ─── Rate Limiter (in‑memory) ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per user

function checkRateLimit(userId) {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  if (record && (now - record.start < RATE_LIMIT_WINDOW)) {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) return false;
  } else {
    rateLimitMap.set(userId, { start: now, count: 1 });
  }
  return true;
}

// ─── Validation Helpers ────────────────────────
const VALIDATORS = {
  full_name: (v) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 100,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^\+?[0-9]{7,15}$/.test(v.replace(/[\s-]/g, '')),
  bio: (v) => typeof v === 'string' && v.length <= 500,
  website: (v) => { if (!v) return true; try { new URL(v); return true; } catch { return false; } },
  avatar_url: (v) => { if (!v) return true; try { new URL(v); return v.startsWith('https://'); } catch { return false; } },
  cover_url: (v) => { if (!v) return true; try { new URL(v); return v.startsWith('https://'); } catch { return false; } },
  social_links: (v) => {
    if (!v) return true;
    if (typeof v !== 'object') return false;
    const allowed = ['facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];
    for (const key of Object.keys(v)) {
      if (!allowed.includes(key)) return false;
      if (v[key] && typeof v[key] === 'string') { try { new URL(v[key]); } catch { return false; } }
    }
    return true;
  },
};

function validateFields(body) {
  const errors = [];
  for (const [field, value] of Object.entries(body)) {
    if (VALIDATORS[field] && !VALIDATORS[field](value)) {
      errors.push(`Invalid value for field: ${field}`);
    }
  }
  return errors;
}

// ─── Audit Logging ────────────────────────────
async function logProfileUpdate(userId, oldData, updatedFields) {
  try {
    await db.query(
      `INSERT INTO user_audit_logs (user_id, action, old_values, new_values)
       VALUES ($1, 'profile_update', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify(oldData), JSON.stringify(updatedFields)]
    );
  } catch (e) {
    console.warn('Audit logging failed:', e.message);
  }
}

// ─── Telegram Notification ─────────────────────
async function notifyAdminIfNeeded(oldUser, updatedFields) {
  try {
    const { rows: [config] } = await db.query('SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1');
    if (!config) return;
    const sensitiveFields = ['email', 'phone', 'full_name'];
    const changedSensitive = sensitiveFields.filter(f => f in updatedFields);
    if (changedSensitive.length === 0) return;
    const changes = changedSensitive.map(f => `• ${f}: ${oldUser[f]} → ${updatedFields[f]}`).join('%0A');
    const text = `🔔 <b>Profile Updated</b>%0A👤 ${oldUser.full_name} (${oldUser.email})%0A%0A${changes}`;
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
    });
  } catch (e) {}
}

// ─── Main Handler ──────────────────────────────
export async function PUT(req) {
  // 1. Extract Bearer token
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 2. Verify token using the project's own verifyToken from lib/auth.js
  const decoded = await verifyToken(token);
  if (!decoded || !decoded.id) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const userId = decoded.id;

  // 3. Rate Limiting
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // 4. Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 5. Allowed fields for update
  const allowedFields = ['full_name', 'email', 'phone', 'bio', 'website', 'avatar_url', 'cover_url', 'social_links'];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // 6. Validate fields
  const validationErrors = validateFields(updates);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 422 });
  }

  // 7. Fetch old user data for comparison & notification
  let oldUser;
  try {
    const { rows } = await db.query('SELECT full_name, email, phone FROM users WHERE id = $1', [userId]);
    oldUser = rows[0];
    if (!oldUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // 8. Build dynamic update query
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [field, value] of Object.entries(updates)) {
    if (field === 'social_links') {
      setClauses.push(`social_links = social_links || $${idx}::jsonb`);
      values.push(JSON.stringify(value));
    } else {
      setClauses.push(`${field} = $${idx}`);
      values.push(value);
    }
    idx++;
  }

  values.push(userId);
  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;

  // 9. Execute update
  try {
    const { rows: [updatedUser] } = await db.query(query, values);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log profile update to audit trail
    await logProfileUpdate(userId, oldUser, updates);

    // Notify admin if sensitive fields changed
    await notifyAdminIfNeeded(oldUser, updates);

    // Remove password hash before returning
    const { password_hash, ...safeUser } = updatedUser;
    return NextResponse.json({ success: true, message: 'Profile updated', user: safeUser });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
