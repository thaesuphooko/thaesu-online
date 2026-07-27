import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Rate Limiter (in‑memory) ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5; // 5 registration attempts per minute per IP

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

// ─── Validation Helpers ────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isStrongPassword(pw) {
  return pw.length >= 8; // basic; you can add complexity checks
}

// ─── Telegram Notification ─────────────────────
async function notifyAdmin(text) {
  try {
    const { rows: [config] } = await db.query('SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1');
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

// ─── Generate Referral Code ────────────────────
async function generateReferralCode(uid) {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const code = `${uid.slice(0, 4)}${random}`.substring(0, 10);
  // Ensure uniqueness
  const { rows: [exist] } = await db.query('SELECT id FROM users WHERE referral_code = $1', [code]);
  if (exist) return generateReferralCode(uid); // recursive regeneration
  return code;
}

export async function POST(req) {
  // 1. Rate Limiting
  if (!checkRateLimit(req)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();

    // 2. Basic Field Validation
    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    if (!isStrongPassword(body.password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const name = (body.full_name || body.name || 'New User').trim();

    // 3. Check existing user
    const { rows: [existing] } = await db.query('SELECT id FROM users WHERE email = $1', [body.email]);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12); // stronger hash rounds

    // 5. Insert user with UID generation (assuming uid = nanoid or uuid)
    const uid = crypto.randomBytes(8).toString('hex'); // simple UID (use your own uid logic)
    const referralCode = await generateReferralCode(uid);

    const { rows: [user] } = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, uid, referral_code, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', NOW())
       RETURNING id, uid, email, full_name, referral_code`,
      [name, body.email, body.phone || '', hashedPassword, uid, referralCode]
    );

    // 6. Generate JWT token for auto-login
    const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key';
    const token = jwt.sign(
      { id: user.id, uid: user.uid, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '100y' }
    );

    // 7. Notify admin via Telegram
    await notifyAdmin(`🎉 <b>New Registration</b>\n👤 ${name}\n📧 ${user.email}\n🆔 ${uid}`);

    return NextResponse.json({
      success: true,
      user: { id: user.id, uid: user.uid, email: user.email, full_name: user.full_name, referral_code: user.referral_code },
      token, // frontend can store this and auto-login
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
