export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { sendOrderStatusUpdate } from '@/lib/telegram';

export async function POST(request) {
  const body = await request.json();
  if (body.callback_query) {
    const { data, message } = body.callback_query;
    const action = data.split('_')[0]; // confirm or cancel
    const orderId = data.split('_')[1];

    if (!orderId) return Response.json({ ok: true });

    const orderRes = await query('SELECT id, status, phone, user_id FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) return Response.json({ ok: true });

    if (action === 'confirm') {
      await query("UPDATE orders SET status = 'confirmed' WHERE id = $1", [orderId]);
      // Notify customer (if we had a chatId for the user, but we don't have a direct mapping yet)
    } else if (action === 'cancel') {
      await query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId]);
    }

    // Answer callback to remove loading state
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_1}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: body.callback_query.id, text: `Order ${orderId} ${action}ed` }),
    });
  }
  return Response.json({ ok: true });
}
