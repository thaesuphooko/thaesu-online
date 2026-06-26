export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const orders = await query(`
    SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at,
      string_agg(oi.product_title, ', ') as products
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
  `);
  const csv = [
    'Order ID,User ID,Amount,Status,Date,Products',
    ...orders.rows.map(o => `${o.id},${o.user_id},${o.total_amount},${o.status},${o.created_at},${o.products}`)
  ].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sales-report.csv"',
    },
  });
}
