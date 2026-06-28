export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';

async function getTelegramConfig() {
  const res = await query('SELECT bot_token, user_ids FROM telegram_config WHERE is_active = true LIMIT 1');
  if (res.rows.length === 0) return { token: null, userId: null };
  const cfg = res.rows[0];
  return { token: cfg.bot_token, userId: cfg.user_ids.split(',')[0].trim() };
}

export async function POST(request) {
  const { token: TELEGRAM_BOT_TOKEN, userId: TELEGRAM_USER_ID } = await getTelegramConfig();

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    return Response.json({ error: 'Telegram not configured. Add bot token and user ID in Admin > Telegram Config.' }, { status: 500 });
  }

  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const magicToken = randomBytes(4).toString('hex').toUpperCase(); // 8-character token (e.g., A1B2C3D4)
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  await query('INSERT INTO admin_magic_links (token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
    [magicToken, expiresAt, ip, request.headers.get('user-agent') || '']);

  // Send token as plain text via Telegram (no URL needed)
  const msg = `🔐 *Admin Login Token*\n\nYour one‑time token is: \`${magicToken}\`\n\nExpires in 1 minute.`;
  const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_USER_ID,
      text: msg,
      parse_mode: 'Markdown',
    }),
  });

  const sendData = await sendRes.json();
  if (!sendData.ok) {
    return Response.json({ error: `Telegram error: ${sendData.description}` }, { status: 500 });
  }

  return Response.json({ message: 'Login token sent to your Telegram' });
}
