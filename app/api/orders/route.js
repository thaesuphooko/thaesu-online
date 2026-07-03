export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { sendOrderNotification } from '@/lib/telegram';

export async function POST(request) {
  try {
    const { items, total_amount, shipping_address, phone, coupon_code, gift_card_code } = await request.json();

    // Create order
    const timerExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const orderResult = await query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, phone, status, timer_expiry, wave_transaction_id, payment_status)
       VALUES ($1, $2, $3, $4, 'pending', $5, 'manual', 'unpaid')
       RETURNING id, status, created_at, timer_expiry`,
      [null, total_amount, JSON.stringify(shipping_address || {}), phone, timerExpiry]
    );
    const order = orderResult.rows[0];

    // Insert order items & deduct stock
    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, product_title, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        [order.id, item.product_id, item.title, item.quantity, item.price]
      );
      await query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Send Telegram notification to ALL active configs
    try {
      const telegramConfigs = await query('SELECT bot_token, user_ids, notify_order FROM telegram_config WHERE is_active = true AND notify_order = true');
      for (const cfg of telegramConfigs.rows) {
        const userIds = cfg.user_ids.split(',').map(s => s.trim());
        for (const chatId of userIds) {
          const itemsList = items.map(i => `• ${i.title} x${i.quantity} (${i.price} Ks)`).join('\n');
          const text = `🛒 *New Order!*\nOrder ID: \`${order.id.slice(0,8)}\`\nPhone: ${phone || 'N/A'}\nItems:\n${itemsList}\nTotal: ${total_amount.toLocaleString()} Ks`;
          fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Telegram notification error:', e);
    }

    return Response.json({ message: 'Order placed', order_id: order.id, timer_expiry: order.timer_expiry }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Order failed' }, { status: 500 });
  }
}
