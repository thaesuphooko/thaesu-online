import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── Rate Limiter (per IP) ────────────────────
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;       // 1 minute
const MAX_ATTEMPTS = 10;
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
    return entry.count <= MAX_ATTEMPTS;
  }
  rateLimitMap.set(key, { start: now, count: 1 });
  return true;
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
      return await callback();
    } catch (error) {
      if (attempt === maxRetries || error.code !== 'ETIMEDOUT') throw error;
      console.warn(`OTP verify retry ${attempt + 1} due to timeout...`);
      await new Promise(r => setTimeout(r, 500));
    }
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

export async function POST(req) {
  // 1. Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
    const { rows: [admin] } = await client.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not configured' }, { status: 500 });
    }

    // 4. Verify OTP from database
    const otpRecord = await executeWithRetry(client, async () => {
      const { rows } = await client.query(
        'SELECT otp, expires_at FROM admin_otp WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [admin.id]
      );
      return rows[0];
    });

    if (!otpRecord || otpRecord.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      // Clean up expired OTP
      await client.query('DELETE FROM admin_otp WHERE user_id = $1', [admin.id]);
      return NextResponse.json({ error: 'OTP has expired' }, { status: 401 });
    }

    // 5. OTP is valid – delete it (one-time use)
    await client.query('DELETE FROM admin_otp WHERE user_id = $1', [admin.id]);

    // 6. Generate JWT token
    const token = generateToken(admin, { scope: 'admin' });
    const safeUser = {
      id: admin.id,
      uid: admin.uid,
      name: admin.full_name,
      email: admin.email,
      role: admin.role,
    };

    // 7. Notify admin about successful login
    notifyAdmin(`✅ <b>Admin Login Successful</b>\n👤 ${admin.full_name}\n⏰ ${new Date().toISOString()}`).catch(() => {});

    return NextResponse.json({ token, user: safeUser });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
