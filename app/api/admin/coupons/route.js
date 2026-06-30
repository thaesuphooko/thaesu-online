export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  // Auto-deactivate expired coupons (soft)
  await query("UPDATE coupons SET is_active = false WHERE expires_at < NOW() AND is_active = true");
  const res = await query('SELECT c.*, cat.name as category_name, p.title as product_title FROM coupons c LEFT JOIN categories cat ON cat.id = c.category_id LEFT JOIN products p ON p.id = c.product_id ORDER BY c.created_at DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at, category_id, product_id } = await request.json();
  if (!code || !discount_type || discount_value === undefined) {
    return Response.json({ error: 'code, discount_type, discount_value required' }, { status: 400 });
  }
  const res = await query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at, category_id, product_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [code, discount_type, discount_value, min_order_amount || 0, max_uses || null, expires_at || null, category_id || null, product_id || null]
  );
  return Response.json(res.rows[0], { status: 201 });
}
