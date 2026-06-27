export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { sendOrderNotification } from '@/lib/telegram';
import { addPoints } from '@/lib/loyalty';

export async function POST(request) {
  try {
    const { items, total_amount, shipping_address, phone, coupon_code, gift_card_code } = await request.json();

    // Create pending order with 1-hour timer
    const timerExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const orderResult = await query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, phone, status, timer_expiry, wave_transaction_id, payment_status)
       VALUES ($1, $2, $3, $4, 'pending', $5, 'manual', 'unpaid')
       RETURNING id, status, created_at, timer_expiry`,
      [null, total_amount, JSON.stringify(shipping_address), phone, timerExpiry]
    );
    const order = orderResult.rows[0];

    // Insert order items & deduct stock (same as before)
    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, product_title, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        [order.id, item.product_id, item.title, item.quantity, item.price]
      );
      await query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Send Telegram notification (without inline keyboard for now)
    sendOrderNotification(order.id, items, total_amount, phone || 'Guest').catch(console.error);

    return Response.json({ message: 'Order placed', order_id: order.id, timer_expiry: order.timer_expiry }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Order failed' }, { status: 500 });
  }
}
