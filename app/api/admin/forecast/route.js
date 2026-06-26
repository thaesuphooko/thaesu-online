export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // Simple forecast: average daily sales * 30
  const products = await query('SELECT id, title, stock FROM products WHERE is_active = true');
  const forecasts = [];
  for (const p of products.rows) {
    const sales = await query(
      "SELECT COALESCE(AVG(quantity),0) as avg_qty FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = $1 AND o.created_at > NOW() - INTERVAL '30 days'",
      [p.id]
    );
    const avgDaily = parseFloat(sales.rows[0].avg_qty);
    const predictedDemand = Math.ceil(avgDaily * 30);
    forecasts.push({ product_id: p.id, title: p.title, current_stock: p.stock, predicted_demand: predictedDemand, reorder: predictedDemand - p.stock });
  }
  return Response.json(forecasts);
}
