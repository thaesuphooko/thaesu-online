import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Rate Limiter (in‑memory) ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;   // 1 minute
const RATE_LIMIT_MAX = 5;           // 5 registration attempts per minute per IP

function checkRateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `reg:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && (now - record.start < RATE_LIMIT_WINDOW)) {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) return false;
  } else {
    rateLimitMap.set(key, { start: now, count: 1 });
  }
  return true;
}

// ─── Email validation (optional) ──────────────
function isValidEmail(email) {
  if (!email) return true;            // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Telegram Notification ─────────────────────
async function notifyAdmin(text) {
  try {
    const { rows: [config] } = await db.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
    );
    if (!config) return;
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) { /* ignore */ }
}

// ─── Generate unique referral code ─────────────
async function generateReferralCode(uid) {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const code = `${uid.slice(0, 4)}${random}`.substring(0, 10);
  const { rows: [exist] } = await db.query('SELECT id FROM users WHERE referral_code = $1', [code]);
  if (exist) return generateReferralCode(uid); // recursion safety
  return code;
}

// ─── XSS sanitization helper ───────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Main Handler ──────────────────────────────
export async function POST(req) {
  // 1. Rate Limiting
  if (!checkRateLimit(req)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // 2. Flexible field extraction (email optional)
    const name = sanitize(body.name || body.full_name || 'New User').trim();
    const email = body.email ? sanitize(body.email).trim().toLowerCase() : null;
    const password = body.password || '123456';      // simple default, no strength rules
    const phone = body.phone ? sanitize(body.phone) : null;

    // 3. If email is provided, validate format
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // 4. Check existing user ONLY if email is provided (unique constraint)
    if (email) {
      const { rows: [existing] } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Generate UID and referral code
    const uid = crypto.randomBytes(8).toString('hex');
    const referralCode = await generateReferralCode(uid);

    // 7. Insert user (role will automatically be 'user' – we fixed the constraint)
    const { rows: [user] } = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, uid, referral_code, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', NOW())
       RETURNING id, uid, email, full_name, referral_code, role`,
      [name, email, phone, hashedPassword, uid, referralCode]
    );

    // 8. Generate JWT token for auto‑login
    const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key';
    const token = jwt.sign(
      { id: user.id, uid: user.uid, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '100y' }
    );

    // 9. Notify admin via Telegram
    await notifyAdmin(
      `🎉 <b>New Registration</b>\n👤 ${name}\n📧 ${email || 'N/A'}\n🆔 ${uid}`
    );

    // 10. Return success
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          full_name: user.full_name,
          referral_code: user.referral_code,
          role: user.role,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
