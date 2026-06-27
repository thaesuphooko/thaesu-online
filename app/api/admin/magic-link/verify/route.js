export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function POST(request) {
  const { token } = await request.json();
  const res = await query(
    'SELECT * FROM admin_magic_links WHERE token = $1 AND used = false AND expires_at > NOW()',
    [token]
  );
  if (res.rows.length === 0) return Response.json({ valid: false });

  // Mark as used
  await query('UPDATE admin_magic_links SET used = true WHERE id = $1', [res.rows[0].id]);

  // Send welcome message to admin via Telegram
  const tokenBot = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
  const chatId = process.env.TELEGRAM_USER_ID;
  if (tokenBot && chatId) {
    await fetch(`https://api.telegram.org/bot${tokenBot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ *Admin logged in successfully.*',
        parse_mode: 'Markdown',
      }),
    });
  }

  return Response.json({ valid: true });
}
