export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

const COMMANDS = {
  '/status': async (chatId, token) => {
    const stats = await query("SELECT COUNT(*) as orders, COALESCE(SUM(total_amount),0) as revenue FROM orders WHERE created_at >= CURRENT_DATE");
    const text = `📊 Today's Report\nOrders: ${stats.rows[0].orders}\nRevenue: ${parseFloat(stats.rows[0].revenue).toLocaleString()} Ks`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  },
  '/stop_crawler': async (chatId, token) => {
    await query("UPDATE crawl_jobs SET status = 'stopped' WHERE status = 'running'");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '⏹️ All running crawlers stopped.' }),
    });
  },
};

export async function POST(request) {
  const body = await request.json();
  if (body.message) {
    const { text, chat } = body.message;
    const chatId = chat.id;
    // Find the bot token by this update's bot username? We'll use first active token
    const config = await query('SELECT bot_token FROM telegram_config WHERE is_active = true LIMIT 1');
    const token = config.rows[0]?.bot_token;
    if (!token) return Response.json({ ok: false });

    if (COMMANDS[text]) {
      await COMMANDS[text](chatId, token);
    }
  }
  return Response.json({ ok: true });
}
