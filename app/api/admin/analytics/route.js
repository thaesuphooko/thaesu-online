import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const totalUsers = await query(`SELECT COUNT(*) FROM users`);
  const totalProducts = await query(`SELECT COUNT(*) FROM products WHERE is_active = true`);
  const totalOrders = await query(`SELECT COUNT(*) FROM orders WHERE payment_status='paid'`);
  const totalRevenue = await query(`SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='paid'`);
  const ordersByDay = await query(`
    SELECT DATE(created_at) as day, COUNT(*) as count, SUM(total_amount) as revenue
    FROM orders WHERE payment_status='paid'
    GROUP BY day ORDER BY day DESC LIMIT 30
  `);
  const topProducts = await query(`
    SELECT p.title, SUM(oi.quantity) as sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.payment_status='paid'
    JOIN products p ON p.id = oi.product_id
    GROUP BY p.title ORDER BY sold DESC LIMIT 10
  `);
  const pendingPayouts = await query(`SELECT COALESCE(SUM(amount),0) FROM payouts WHERE status='pending'`);

  return Response.json({
    totalUsers: parseInt(totalUsers.rows[0].count),
    totalProducts: parseInt(totalProducts.rows[0].count),
    totalOrders: parseInt(totalOrders.rows[0].count),
    totalRevenue: parseFloat(totalRevenue.rows[0].coalesce),
    ordersByDay: ordersByDay.rows,
    topProducts: topProducts.rows,
    pendingPayouts: parseFloat(pendingPayouts.rows[0].coalesce),
  });
}
