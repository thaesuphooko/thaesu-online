import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ════════════════════════════════════════════════════════════
//  GOD MODE – INFINITY PREMIUM ULTRA MAX REGISTRATION API
//  · Email optional, referral system, activity logging,
//  · default avatar/cover, auto‑cleanup rate limiter,
//  · Telegram notification (if configured), sanitization
// ════════════════════════════════════════════════════════════

// ─── Rate Limiter (memory‑safe with auto‑cleanup) ──────
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_REGS = 5;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW_MS) rateLimitMap.delete(key);
  }
}, 300_000).unref?.();

function checkRateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `reg:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && now - record.start < RATE_WINDOW_MS) {
    record.count++;
    return record.count <= MAX_REGS;
  }
  rateLimitMap.set(key, { start: now, count: 1 });
  return true;
}

// ─── Email validation (optional) ──────────────────────
function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Telegram Notification (if env configured) ────────
async function notifyAdmin(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    // First try environment variables directly
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
    // Fallback: try database telegram_configs table
    const { rows: [config] } = await db.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
    );
    if (config) {
      await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
      });
    }
  } catch {}
}

// ─── Generate unique referral code ────────────────────
async function generateReferralCode(uid) {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const code = `${uid.slice(0, 4)}${random}`.substring(0, 10);
  const { rows: [exist] } = await db.query('SELECT id FROM users WHERE referral_code = $1', [code]);
  if (exist) return generateReferralCode(uid);
  return code;
}

// ─── XSS sanitization helper ──────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

// ─── Activity logger ──────────────────────────────────
async function logActivity(client, userId, action, targetId = null) {
  try {
    await client.query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id)
       VALUES ($1, $2, 'user', $3)`,
      [userId, action, targetId]
    );
  } catch (err) {
    console.warn('Activity log insert failed:', err.message);
  }
}

// ─── Main Handler ──────────────────────────────────────
export async function POST(req) {
  // 1. Rate Limiting
  if (!checkRateLimit(req)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // 2. Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Extract & sanitize fields
  const name = sanitize(body.name || body.full_name || 'New User');
  const email = body.email ? sanitize(body.email).toLowerCase() : null;
  const password = body.password || '123456';
  const phone = body.phone ? sanitize(body.phone) : null;
  const referralCodeUsed = body.referral_code ? sanitize(body.referral_code) : null; // Optional referral code from another user

  // 4. Validate email (if provided)
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // 5. Check duplicate email (only if email provided)
  if (email) {
    try {
      const { rows: [existing] } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    } catch (err) {
      console.error('DB email check error:', err);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  // 6. Validate referral code if provided (optional)
  let referrerUserId = null;
  if (referralCodeUsed) {
    try {
      const { rows: [referrer] } = await db.query('SELECT id FROM users WHERE referral_code = $1', [referralCodeUsed]);
      if (referrer) referrerUserId = referrer.id;
      // If invalid, we just ignore – don't block registration
    } catch {}
  }

  // 7. Hash password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (err) {
    console.error('Password hash error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  // 8. Generate UID and referral code for the new user
  const uid = crypto.randomBytes(8).toString('hex');
  let referralCode;
  try {
    referralCode = await generateReferralCode(uid);
  } catch (err) {
    console.error('Referral code generation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  // 9. Insert user into database
  let user;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [newUser] } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, uid, referral_code, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', NOW())
       RETURNING id, uid, email, full_name, referral_code, role`,
      [name, email, phone, hashedPassword, uid, referralCode]
    );
    user = newUser;

    // If referrer exists, you could insert a record into referral_bonuses or similar
    if (referrerUserId && user) {
      // Placeholder for referral bonus logic
      // await client.query('INSERT INTO referral_earnings (referrer_id, referred_user_id, status) VALUES ($1, $2, $3)', [referrerUserId, user.id, 'pending']);
    }

    // Insert default avatar and cover URLs (if columns exist)
    try {
      await client.query(
        `UPDATE users SET avatar_url = COALESCE(avatar_url, $1), cover_url = COALESCE(cover_url, $2) WHERE id = $3`,
        ['/default-avatar.png', '/default-cover.jpg', user.id]
      );
    } catch {}

    await client.query('COMMIT');

    // Log activity (non‑blocking, after commit)
    await logActivity(client, user.id, 'register');

    // 10. Generate JWT token (100 years)
    const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key';
    const token = jwt.sign(
      {
        sub: user.id,
        uid: user.uid,
        email: user.email,
        role: user.role,
        name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: '100y' }
    );

    // 11. Notify admin (non‑blocking)
    notifyAdmin(`🎉 <b>New Registration</b>\n👤 ${name}\n📧 ${email || 'N/A'}\n🆔 ${uid}\n🔗 Ref: ${referralCodeUsed || 'N/A'}`).catch(() => {});

    // 12. (Optional) Send welcome email – uncomment if email service is available
    // await sendWelcomeEmail(email, name);

    // 13. Return success response
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
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Registration transaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
