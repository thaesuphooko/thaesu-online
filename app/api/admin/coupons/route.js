export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM coupons ORDER BY created_at DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = await request.json();
  if (!code || !discount_type || discount_value === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const res = await query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [code, discount_type, discount_value, min_order_amount || 0, max_uses || 0, expires_at || null]
  );
  return Response.json(res.rows[0], { status: 201 });
}
