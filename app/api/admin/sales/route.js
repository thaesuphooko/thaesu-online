import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const totalOrders = await query("SELECT COUNT(*) FROM orders WHERE payment_status='paid'");
  const totalRevenue = await query("SELECT SUM(total_amount) FROM orders WHERE payment_status='paid'");
  const recentOrders = await query("SELECT id, user_id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10");
  const topProducts = await query(
    `SELECT p.title, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id AND o.payment_status='paid'
     GROUP BY p.title ORDER BY sold DESC LIMIT 5`
  );
  const lowStock = await query("SELECT id, title, stock FROM products WHERE stock <= 5 AND is_active = true ORDER BY stock ASC LIMIT 10");

  return Response.json({
    totalOrders: parseInt(totalOrders.rows[0].count),
    totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0),
    recentOrders: recentOrders.rows,
    topProducts: topProducts.rows,
    lowStock: lowStock.rows,
  });
}
