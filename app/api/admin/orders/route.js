export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 30, 100);
  const offset = (page - 1) * limit;

  let conditions = [];
  let params = [];
  let idx = 1;

  if (status) {
    conditions.push(`o.status = $${idx++}`);
    params.push(status);
  }
  if (dateFrom) {
    conditions.push(`o.created_at >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`o.created_at <= $${idx++}`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM orders o ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const ordersRes = await query(`
    SELECT o.*, u.full_name as customer_name, u.email as customer_email,
      COALESCE(json_agg(json_build_object('title', oi.product_title, 'quantity', oi.quantity, 'price', oi.price, 'cost_price', p.cost_price)) FILTER (WHERE oi.id IS NOT NULL), '[]') as items,
      COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount,
      COALESCE(SUM((oi.price - COALESCE(p.cost_price, 0)) * oi.quantity), 0) as total_profit
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    ${where}
    GROUP BY o.id, u.full_name, u.email
    ORDER BY o.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `, [...params, limit, offset]);

  return Response.json({
    data: ordersRes.rows,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
