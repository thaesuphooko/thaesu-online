export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // Simple linear trend over last 7 days
  const forecast = await query(`
    SELECT p.id, p.title, p.stock,
      COALESCE(AVG(oi.quantity), 0) as daily_avg,
      COALESCE(SUM(oi.quantity) / 7, 0) as daily_trend,
      CASE WHEN COALESCE(AVG(oi.quantity), 0) > 0 THEN ROUND(p.stock / AVG(oi.quantity))
           ELSE 999 END as days_left,
      GREATEST(0, ROUND((AVG(oi.quantity) * 7) - p.stock)) as suggested_reorder
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.created_at > NOW() - INTERVAL '14 days'
    GROUP BY p.id
    ORDER BY days_left ASC
  `);

  return Response.json(forecast.rows);
}
