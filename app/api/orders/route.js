import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { sendOrderNotification } from '@/lib/telegram';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    const { items, total_amount, shipping_address, wave_transaction_id, coupon_code } = await request.json();

    // Insert order
    const orderResult = await query(
      `INSERT INTO orders (user_id, total_amount, wave_transaction_id, payment_status, shipping_address, status)
       VALUES ($1, $2, $3, 'paid', $4, 'pending')
       RETURNING id, status, payment_status, created_at`,
      [user.id, total_amount, wave_transaction_id || 'demo_wave_' + Date.now(), JSON.stringify(shipping_address)]
    );
    const order = orderResult.rows[0];

    // Insert order items & update stock
    for (const item of items) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_title, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.title, item.quantity, item.price]
      );
      // Deduct stock
      await query(
        `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Send Telegram notification (non-blocking)
    sendOrderNotification(order.id, items, total_amount, user.email).catch(console.error);

    return Response.json({ message: 'Order placed', order_id: order.id, ...order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Order failed' }, { status: 500 });
  }
}
