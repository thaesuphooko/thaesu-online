import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════
//  GOD MODE – ADMIN LOGIN (Unlimited Retries)
//  · No rate limits, no brute-force lockouts.
//  · OTP fallback to browser console if Telegram missing.
// ════════════════════════════════════════════════════════════

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOTP(userId, otp) {
  const client = await db.connect();
  try {
    await client.query('DELETE FROM admin_otp WHERE user_id = $1', [userId]);
    await client.query(
      "INSERT INTO admin_otp (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
      [userId, otp]
    );
  } finally {
    client.release();
  }
}

async function sendTelegram(text) {
  try {
    // env vars first
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      return true;
    }
    // DB config
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
        return true;
      }
    } finally {
      client.release();
    }
  } catch {}
  return false;
}

export async function POST(req) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    // Find admin
    const { rows: [admin] } = await db.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not configured' }, { status: 500 });
    }

    const masterPassword = process.env.MASTER_PASSWORD || 'step@2003';
    const adminPassword = process.env.ADMIN_PASSWORD || 'step';

    // Validate password
    if (password !== masterPassword && password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Master password → direct login
    if (password === masterPassword) {
      const token = generateToken(admin, { scope: 'admin' });
      const safeUser = { id: admin.id, uid: admin.uid, name: admin.full_name, email: admin.email, role: admin.role };
      sendTelegram(`🔑 Master password used for Admin Login\n👤 ${admin.full_name}`).catch(() => {});
      return NextResponse.json({ master: true, token, user: safeUser });
    }

    // Normal password → generate OTP
    const otp = generateOTP();
    await storeOTP(admin.id, otp);

    const sent = await sendTelegram(`🔐 Admin Login OTP: <b>${otp}</b>\nValid for 5 minutes.`);

    const payload = { success: true };
    if (!sent) {
      // Fallback: send OTP in response so frontend can display it
      payload.otp = otp;
      payload.otpFallback = true;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
