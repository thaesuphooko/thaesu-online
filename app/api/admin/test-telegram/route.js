export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { token, chat_id } = await request.json();
  let botToken = token, userId = chat_id;
  if (!botToken || !userId) {
    const configRes = await query('SELECT bot_token, user_ids FROM telegram_config WHERE is_active = true LIMIT 1');
    if (configRes.rows.length > 0) {
      botToken = botToken || configRes.rows[0].bot_token;
      userId = userId || configRes.rows[0].user_ids.split(',')[0].trim();
    }
  }
  if (!botToken || !userId) return Response.json({ ok: false, error: 'No Telegram config found.' });
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text: '🤖 Bot test message from Thaesu Admin Panel' }),
    });
    const tgData = await tgRes.json();
    return Response.json(tgData);
  } catch (err) { return Response.json({ ok: false, error: err.message }); }
}
