import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { sendOrderNotification } from '@/lib/telegram';
import { addPoints } from '@/lib/loyalty';

async function checkLowStock(productId) {
  const res = await query('SELECT title, stock FROM products WHERE id = $1 AND stock <= 5', [productId]);
  if (res.rows.length > 0) {
    const p = res.rows[0];
    sendOrderNotification(null, [{ title: p.title, quantity: 0, price: 0 }], 0, `Low stock alert: ${p.title} only ${p.stock} left`);
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    const { items, total_amount, shipping_address, wave_transaction_id, coupon_code } = await request.json();

    const orderResult = await query(
      `INSERT INTO orders (user_id, total_amount, wave_transaction_id, payment_status, shipping_address, status)
       VALUES ($1, $2, $3, 'paid', $4, 'pending')
       RETURNING id, status, payment_status, created_at`,
      [user.id, total_amount, wave_transaction_id || 'demo_wave_'+Date.now(), JSON.stringify(shipping_address)]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await query(`INSERT INTO order_items (order_id, product_id, product_title, quantity, price) VALUES ($1, $2, $3, $4, $5)`, [order.id, item.product_id, item.title, item.quantity, item.price]);
      await query(`UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2`, [item.quantity, item.product_id]);
      checkLowStock(item.product_id).catch(console.error);
    }

    // Loyalty points (1 point per 100 Ks)
    const pointsEarned = Math.floor(total_amount / 100);
    if (pointsEarned > 0) {
      addPoints(user.id, pointsEarned, `Order #${order.id.slice(0,8)}`).catch(console.error);
    }

    sendOrderNotification(order.id, items, total_amount, user.email).catch(console.error);

    return Response.json({ message: 'Order placed', order_id: order.id, points_earned: pointsEarned, ...order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Order failed' }, { status: 500 });
  }
}
