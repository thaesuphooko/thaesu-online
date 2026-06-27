export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

export async function POST() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    return Response.json({ error: 'Bot not configured' }, { status: 500 });
  }

  // Generate a one-time token valid for 1 minute
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  // Save token in DB (or a dedicated table)
  await query('INSERT INTO admin_magic_links (token, expires_at) VALUES ($1, $2)', [token, expiresAt]);

  // Send message via Telegram bot
  const magicUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/auth?token=${token}`;
  const msg = `🔐 *Magic Login Link*\n\n[Click here to login](${magicUrl})\n\nExpires in 1 minute.`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_USER_ID,
      text: msg,
      parse_mode: 'Markdown',
    }),
  });

  return Response.json({ message: 'Magic link sent to your Telegram' });
}
