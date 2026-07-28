import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════
//  GOD MODE – ADMIN OTP VERIFICATION (Ultra Max Pro)
//  · Rate limit, brute-force lockout, circuit breaker,
//  · retry, activity logging, Telegram alerts
// ════════════════════════════════════════════════════════════

// ─── Memory‑safe Rate Limiter (per IP) ──────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;       // 1 minute
const MAX_ATTEMPTS_PER_IP = 10;
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

// ─── Brute-force OTP lockout (per admin) ────────
const otpLockoutMap = new Map(); // userId -> { failures, lockUntil }
const MAX_OTP_FAILURES = 5;
const OTP_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkOtpLockout(userId) {
  const lock = otpLockoutMap.get(userId);
  if (!lock) return false;
  if (Date.now() < lock.lockUntil) return true;
  otpLockoutMap.delete(userId);
  return false;
}

function recordOtpFailure(userId) {
  const now = Date.now();
  const lock = otpLockoutMap.get(userId) || { failures: 0, lockUntil: 0 };
  lock.failures++;
  if (lock.failures >= MAX_OTP_FAILURES) {
    lock.lockUntil = now + OTP_LOCKOUT_DURATION;
  }
  otpLockoutMap.set(userId, lock);
}

function resetOtpFailures(userId) {
  otpLockoutMap.delete(userId);
}

// ─── Circuit breaker (DB timeout) ───────────────
let dbFailureCount = 0;
let dbOpenUntil = 0;
const MAX_DB_FAILURES = 5;
const DB_BREAKER_TIMEOUT = 15_000; // 15 seconds

function isDbCircuitOpen() {
  if (dbFailureCount >= MAX_DB_FAILURES && Date.now() < dbOpenUntil) return true;
  if (Date.now() >= dbOpenUntil) {
    dbFailureCount = 0;
    return false;
  }
  return false;
}

function recordDbSuccess() { dbFailureCount = 0; }
function recordDbFailure() {
  dbFailureCount++;
  if (dbFailureCount >= MAX_DB_FAILURES) {
    dbOpenUntil = Date.now() + DB_BREAKER_TIMEOUT;
    console.warn(`🔴 Admin verify DB circuit breaker OPEN for ${DB_BREAKER_TIMEOUT/1000}s`);
  }
}

// ─── XSS sanitizer ──────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

// ─── Retry helper (DB timeout) ─────────────────
async function executeWithRetry(client, callback, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (isDbCircuitOpen()) throw new Error('Database circuit breaker is open');
      const result = await callback();
      recordDbSuccess();
      return result;
    } catch (error) {
      recordDbFailure();
      if (attempt === maxRetries || error.code !== 'ETIMEDOUT') throw error;
      console.warn(`OTP verify retry ${attempt + 1} due to timeout...`);
      await new Promise(r => setTimeout(r, 500));
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

// ─── Telegram notification (non‑blocking) ──────
async function notifyAdmin(text) {
  try {
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

// ─── Helper: get Yangon time string ─────────────
function yangonTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' });
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 1. Rate limit by IP
  if (!checkRateLimit(`ip:${ip}`)) {
    return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });
  }

  // 2. Parse body and sanitize OTP
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawOtp = body.otp;
  if (!rawOtp || typeof rawOtp !== 'string') {
    return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
  }
  const otp = sanitize(rawOtp).replace(/\D/g, '');
  if (otp.length !== 6) {
    return NextResponse.json({ error: 'OTP must be exactly 6 digits' }, { status: 400 });
  }

  const client = await db.connect();
  try {
    // 3. Find admin user (first admin)
    const { rows: [admin] } = await executeWithRetry(client, () =>
      client.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
    );
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not configured' }, { status: 500 });
    }

    // 4. Check OTP brute-force lockout
    if (checkOtpLockout(admin.id)) {
      await logActivity(client, admin.id, 'otp_lockout', { ip });
      notifyAdmin(`🚨 <b>Admin OTP Lockout</b>\n👤 ${admin.full_name}\n⏰ ${yangonTime()}`);
      return NextResponse.json({ error: 'Account is temporarily locked due to too many failed OTP attempts. Try again later.' }, { status: 423 });
    }

    // 5. Verify OTP from database
    const otpRecord = await executeWithRetry(client, () =>
      client.query(
        'SELECT otp, expires_at FROM admin_otp WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [admin.id]
      )
    );
    const record = otpRecord.rows[0];

    if (!record || record.otp !== otp) {
      recordOtpFailure(admin.id);
      await logActivity(client, admin.id, 'otp_invalid', { ip });
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    if (new Date(record.expires_at) < new Date()) {
      recordOtpFailure(admin.id);
      // Clean up expired OTP
      await client.query('DELETE FROM admin_otp WHERE user_id = $1', [admin.id]);
      await logActivity(client, admin.id, 'otp_expired', { ip });
      return NextResponse.json({ error: 'OTP has expired' }, { status: 401 });
    }

    // 6. OTP is valid – reset failures, delete OTP, generate token
    resetOtpFailures(admin.id);
    await client.query('DELETE FROM admin_otp WHERE user_id = $1', [admin.id]);

    const token = generateToken(admin, { scope: 'admin' });
    const safeUser = {
      id: admin.id,
      uid: admin.uid,
      name: admin.full_name,
      email: admin.email,
      role: admin.role,
    };

    // 7. Log successful activity & notify
    await logActivity(client, admin.id, 'otp_login_success', { ip });
    notifyAdmin(`✅ <b>Admin Login Successful</b>\n👤 ${admin.full_name}\n⏰ ${yangonTime()}`).catch(() => {});

    return NextResponse.json({ token, user: safeUser });
  } catch (error) {
    console.error('OTP verify error:', error);
    if (error.message === 'Database circuit breaker is open') {
      return NextResponse.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
