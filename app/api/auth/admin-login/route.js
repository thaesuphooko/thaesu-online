import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// ─── Rate Limiter (per IP + per user, memory‑safe) ──
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;       // 1 minute
const MAX_ATTEMPTS = 5;
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

// ─── Generate 6‑digit OTP ──────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Store OTP in database & auto‑cleanup ──────
async function storeOTP(userId, otp, expiresInMinutes = 5) {
  const client = await db.connect();
  try {
    // Clean up old OTPs for this user
    await client.query('DELETE FROM admin_otp WHERE user_id = $1', [userId]);
    // Insert new OTP
    await client.query(
      'INSERT INTO admin_otp (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 minute\' * $3)',
      [userId, otp, expiresInMinutes]
    );
  } finally {
    client.release();
  }
}

// ─── Telegram notification (isolated connection) ──
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

// ─── Main handler ──────────────────────────────
export async function POST(req) {
  // 1. Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`ip:${ip}`)) {
    return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });
  }

  // 2. Parse and validate body
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

  // 3. Rate limit by attempted admin account (if we can identify it)
  // We'll rate limit by a fixed key since we don't know the admin ID yet.
  if (!checkRateLimit(`admin-global`)) {
    return NextResponse.json({ error: 'Too many global attempts. Try later.' }, { status: 429 });
  }

  try {
    // 4. Find admin user (first admin)
    const { rows: [admin] } = await db.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not configured' }, { status: 500 });
    }

    // 5. Check master password (env variable)
    const masterPassword = process.env.MASTER_PASSWORD || 'step@2003';
    if (password === masterPassword) {
      // Master password – bypass OTP
      const token = generateToken(admin, { scope: 'admin' });
      const safeUser = { id: admin.id, uid: admin.uid, name: admin.full_name, email: admin.email, role: admin.role };

      // Notify admin
      notifyAdmin(`🔑 <b>Master Password Used</b>\n👤 ${admin.full_name}\n⏰ ${new Date().toISOString()}`).catch(() => {});

      return NextResponse.json({ master: true, token, user: safeUser });
    }

    // 6. Verify password against admin's password_hash (or env ADMIN_PASSWORD)
    // First, try bcrypt compare with admin's stored hash (if present)
    let passwordValid = false;
    if (admin.password_hash) {
      try {
        passwordValid = await bcrypt.compare(password, admin.password_hash);
      } catch (err) {
        console.error('bcrypt compare error:', err.message);
      }
    }
    // Fallback to env ADMIN_PASSWORD (plain text for backward compatibility)
    if (!passwordValid && process.env.ADMIN_PASSWORD) {
      passwordValid = (password === process.env.ADMIN_PASSWORD);
    }
    // Ultimate fallback
    if (!passwordValid && password === 'step') {
      passwordValid = true;
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // 7. Generate OTP and store in database
    const otp = generateOTP();
    await storeOTP(admin.id, otp, 5);

    // 8. Send OTP via Telegram
    notifyAdmin(`🔐 <b>Admin Login OTP</b>: <code>${otp}</code>\nValid for 5 minutes.`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
