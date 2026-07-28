import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════
//  GOD MODE – ADMIN LOGIN API (Ultra Max)
//  · Rate limit, brute-force lockout, DB retry,
//  · activity logging, Telegram alerts, OTP generation
// ════════════════════════════════════════════════════════════

// ─── Rate Limiter (per IP, memory‑safe) ─────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const MAX_ATTEMPTS_PER_IP = 5;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(key);
  }
}, 60_000).unref?.();

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (entry && now - entry.start < RATE_WINDOW) {
    entry.count++;
    return entry.count <= MAX_ATTEMPTS_PER_IP;
  }
  rateLimitMap.set(key, { start: now, count: 1 });
  return true;
}

// ─── Brute-force password lockout (per admin) ──
const passwordLockoutMap = new Map(); // userId -> { failures, lockUntil }
const MAX_PASSWORD_FAILURES = 5;
const PASSWORD_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkPasswordLockout(userId) {
  const lock = passwordLockoutMap.get(userId);
  if (!lock) return false;
  if (Date.now() < lock.lockUntil) return true;
  passwordLockoutMap.delete(userId);
  return false;
}

function recordPasswordFailure(userId) {
  const now = Date.now();
  const lock = passwordLockoutMap.get(userId) || { failures: 0, lockUntil: 0 };
  lock.failures++;
  if (lock.failures >= MAX_PASSWORD_FAILURES) {
    lock.lockUntil = now + PASSWORD_LOCKOUT_DURATION;
  }
  passwordLockoutMap.set(userId, lock);
}

function resetPasswordFailures(userId) {
  passwordLockoutMap.delete(userId);
}

// ─── XSS sanitizer ──────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

// ─── Generate 6‑digit OTP ──────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Store OTP in database with retry ──────────
async function storeOTP(userId, otp, expiresInMinutes = 5, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const client = await db.connect();
    try {
      await client.query('DELETE FROM admin_otp WHERE user_id = $1', [userId]);
      await client.query(
        'INSERT INTO admin_otp (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 minute\' * $3)',
        [userId, otp, expiresInMinutes]
      );
      return; // success
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`storeOTP retry ${attempt + 1} due to ${error.code}`);
      await new Promise(r => setTimeout(r, 500));
    } finally {
      client.release();
    }
  }
}

// ─── Activity Logger ────────────────────────────
async function logActivity(client, userId, action, metadata = {}) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'admin_auth', $1, $3)`,
      [userId, action, JSON.stringify(metadata)]
    );
  } catch (err) {
    // table may not exist – ignore
  }
}

// ─── Telegram notification (isolated connection) ──
async function notifyAdmin(text) {
  try {
    // First, try environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      return;
    }
    // Fallback to DB config
    const client = await db.connect();
    try {
      const { rows: [tg] } = await client.query(
        'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
      );
      if (tg?.bot_token && tg?.chat_id) {
        await fetch(`https://api.telegram.org/bot${tg.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tg.chat_id, text, parse_mode: 'HTML' }),
        });
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Telegram notification error:', err.message);
  }
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 1. Rate limit by IP
  if (!checkRateLimit(`ip:${ip}`)) {
    return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });
  }

  // 2. Parse and sanitize body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawPassword = body.password;
  if (!rawPassword || typeof rawPassword !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }
  const password = sanitize(rawPassword);

  const client = await db.connect();
  try {
    // 3. Find admin user (first admin)
    const { rows: [admin] } = await client.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not configured' }, { status: 500 });
    }

    // 4. Check brute-force lockout
    if (checkPasswordLockout(admin.id)) {
      await logActivity(client, admin.id, 'password_lockout', { ip });
      notifyAdmin(`🚨 <b>Admin Password Lockout</b>\n👤 ${admin.full_name}\n⏰ ${new Date().toISOString()}`);
      return NextResponse.json({ error: 'Account is temporarily locked due to too many failed attempts. Try again later.' }, { status: 423 });
    }

    // 5. Verify password
    let passwordValid = false;

    // 5a. Check master password first
    const masterPassword = process.env.MASTER_PASSWORD || 'step@2003';
    if (password === masterPassword) {
      passwordValid = true;
      // Master password used – log and notify
      await logActivity(client, admin.id, 'master_password', { ip });
      notifyAdmin(`🔑 <b>Master Password Used</b>\n👤 ${admin.full_name}\n⏰ ${new Date().toISOString()}`).catch(() => {});
    }
    // 5b. Check bcrypt password (if stored)
    else if (admin.password_hash) {
      try {
        passwordValid = await bcrypt.compare(password, admin.password_hash);
      } catch (err) {
        console.error('bcrypt compare error:', err.message);
      }
    }
    // 5c. Fallback to env ADMIN_PASSWORD (plain text)
    else if (process.env.ADMIN_PASSWORD) {
      passwordValid = (password === process.env.ADMIN_PASSWORD);
    }
    // 5d. Ultimate fallback (development only)
    else if (password === 'step') {
      passwordValid = true;
    }

    if (!passwordValid) {
      recordPasswordFailure(admin.id);
      await logActivity(client, admin.id, 'password_invalid', { ip });
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Reset password failures on success
    resetPasswordFailures(admin.id);

    // 6. If master password, return token directly
    if (password === masterPassword) {
      const token = generateToken(admin, { scope: 'admin' });
      const safeUser = { id: admin.id, uid: admin.uid, name: admin.full_name, email: admin.email, role: admin.role };
      return NextResponse.json({ master: true, token, user: safeUser });
    }

    // 7. Generate OTP and store in database
    const otp = generateOTP();
    await storeOTP(admin.id, otp, 5);
    await logActivity(client, admin.id, 'otp_generated', { ip });

    // 8. Send OTP via Telegram
    notifyAdmin(`🔐 <b>Admin Login OTP</b>: <code>${otp}</code>\nValid for 5 minutes.`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
