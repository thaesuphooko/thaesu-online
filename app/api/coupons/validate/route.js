import { query } from '@/lib/db';

export async function POST(request) {
  const { code, order_amount } = await request.json();
  if (!code) return Response.json({ error: 'Coupon code required' }, { status: 400 });

  const res = await query(
    `SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`,
    [code]
  );
  if (res.rows.length === 0) return Response.json({ error: 'Invalid or expired coupon' }, { status: 404 });

  const coupon = res.rows[0];
  if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
    return Response.json({ error: 'Coupon usage limit reached' }, { status: 400 });
  }
  if (order_amount < coupon.min_order_amount) {
    return Response.json({ error: `Minimum order amount is ${coupon.min_order_amount} Ks` }, { status: 400 });
  }

  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = (order_amount * coupon.discount_value) / 100;
  } else {
    discount = coupon.discount_value;
  }
  discount = Math.min(discount, order_amount);

  return Response.json({ valid: true, discount, coupon_id: coupon.id, code: coupon.code });
}
