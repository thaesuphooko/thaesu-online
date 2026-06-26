export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  // Forecast based on last 7 days average sales
  const forecast = await query(`
    SELECT p.id, p.title, p.stock,
      COALESCE(AVG(oi.quantity), 0) as daily_sales,
      CASE WHEN COALESCE(AVG(oi.quantity), 0) > 0 THEN ROUND(p.stock / AVG(oi.quantity))
           ELSE 999 END as days_left
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.created_at > NOW() - INTERVAL '7 days'
    GROUP BY p.id
  `);
  return Response.json(forecast.rows);
}
