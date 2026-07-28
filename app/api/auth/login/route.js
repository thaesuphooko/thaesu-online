import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

// ══════════════════════════════════════════════════════════════
//  GOD MODE – LOGIN API (uses lib/auth generateToken → iss/aud)
//  · Brute‑force lockout, IP rate limit, Telegram alerts,
//  · activity logging, full profile, safe column updates
// ══════════════════════════════════════════════════════════════

// ─── Rate Limiter (per IP) with auto‑cleanup ──────────
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW_MS) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `login:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && now - record.start < RATE_WINDOW_MS) {
    record.count++;
    return record.count <= MAX_ATTEMPTS;
  }
  rateLimitMap.set(key, { start: now, count: 1 });
  return true;
}

// ─── Brute‑force per‑user lockout (in‑memory) ────────
const lockoutMap = new Map();   // userId -> { failures, lockUntil }
const MAX_FAILURES = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkUserLockout(userId) {
  const lock = lockoutMap.get(userId);
  if (!lock) return false;
  if (Date.now() < lock.lockUntil) return true; // still locked
  lockoutMap.delete(userId); // expired lockout
  return false;
}

function recordFailedAttempt(userId) {
  const now = Date.now();
  const lock = lockoutMap.get(userId) || { failures: 0, lockUntil: 0 };
  lock.failures++;
  if (lock.failures >= MAX_FAILURES) {
    lock.lockUntil = now + LOCKOUT_DURATION;
  }
  lockoutMap.set(userId, lock);
}

function resetFailedAttempts(userId) {
  lockoutMap.delete(userId);
}

// ─── XSS sanitization ────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

// ─── Telegram Notification (env or DB config) ─────────
async function notifyAdmin(text, important = false) {
  try {
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      const { rows: [config] } = await db.query(
        'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
      );
      if (config) {
        botToken = config.bot_token;
        chatId = config.chat_id;
      }
    }
    if (!botToken || !chatId) return;
    const msgText = important ? `🚨 <b>Security Alert</b>\n${text}` : text;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msgText, parse_mode: 'HTML' }),
    });
  } catch {}
}

// ─── Activity logger (table‑agnostic) ─────────────────
async function logActivity(client, userId, action, targetId = null, metadata = null) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'user', $3, $4)`,
      [userId, action, targetId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // table may not exist – ignore
  }
}

// ─── Main Handler ──────────────────────────────────────
export async function POST(req) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 1. Rate Limiting (per IP)
  if (!checkRateLimit(req)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
  }

  // 2. Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const login = sanitize(body.login || '');
  const password = body.password || '';
  const rememberMe = body.remember_me || false;

  if (!login || !password) {
    return NextResponse.json(
      { error: 'Username/ID/Email and password are required' },
      { status: 400 }
    );
  }

  // 3. Find user (by email, uid, or full_name)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);
  let user;
  try {
    if (isEmail) {
      const { rows } = await db.query(
        'SELECT id, uid, email, full_name, phone, role, is_verified, password_hash, avatar_url, cover_url, bio, created_at FROM users WHERE email = $1',
        [login]
      );
      user = rows[0];
    } else {
      const { rows } = await db.query(
        'SELECT id, uid, email, full_name, phone, role, is_verified, password_hash, avatar_url, cover_url, bio, created_at FROM users WHERE uid = $1 OR full_name = $1',
        [login]
      );
      user = rows[0];
    }
  } catch (err) {
    console.error('Login DB query error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!user) {
    // Generic error to prevent enumeration
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // 4. Check brute‑force lockout
  if (checkUserLockout(user.id)) {
    await notifyAdmin(
      `🔒 Account locked (too many failed attempts)\n👤 ${user.full_name} (${user.email || user.uid})`,
      true
    );
    return NextResponse.json(
      { error: 'Account is temporarily locked. Please try again later.' },
      { status: 423 }
    );
  }

  // 5. Verify password (master password or bcrypt)
  const masterPassword = process.env.MASTER_PASSWORD || 'step@2003';
  let isValid = false;
  let isMaster = false;

  if (password === masterPassword) {
    isValid = true;
    isMaster = true;
  } else {
    try {
      isValid = await bcrypt.compare(password, user.password_hash);
    } catch (err) {
      console.error('bcrypt compare error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  if (!isValid) {
    recordFailedAttempt(user.id);
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // 6. Successful login – reset lockout, generate token, update metadata
  resetFailedAttempts(user.id);

  // Use the project's official generateToken (includes iss/aud)
  const tokenOptions = isMaster ? { scope: 'admin' } : {};
  const token = generateToken(user, tokenOptions);

  // Update last_login, last_ip, login_count (ignore errors if columns missing)
  try {
    const now = new Date().toISOString();
    await db.query(
      `UPDATE users SET
        last_login = COALESCE(last_login, $1),
        last_ip = COALESCE(last_ip, $2),
        login_count = COALESCE(login_count, 0) + 1
      WHERE id = $3`,
      [now, clientIp, user.id]
    );
  } catch (updateErr) {
    // Silently ignore if columns missing
  }

  // Log activity (best effort, non‑blocking)
  await logActivity(null, user.id, 'login', null, { ip: clientIp, remember: rememberMe, master: isMaster });

  // Telegram alerts for security
  if (isMaster) {
    notifyAdmin(`🔑 Master password used to login as ${user.full_name} (${user.uid})`, true);
  }

  // Build safe user object
  const safeUser = {
    id: user.id,
    uid: user.uid,
    name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar_url: user.avatar_url || '/default-avatar.png',
    cover_url: user.cover_url || '/default-cover.jpg',
    bio: user.bio || '',
    created_at: user.created_at,
    is_verified: user.is_verified,
  };

  return NextResponse.json({
    message: isMaster ? 'Logged in with master password' : 'Login successful',
    user: safeUser,
    token,
  });
}
