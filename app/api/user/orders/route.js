import { NextResponse } from 'next/server';
import { authenticateSync } from '@/lib/socialAuth';
import { query } from '@/lib/db';

export async function GET(req) {
  const user = authenticateSync(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows } = await query(
    `SELECT o.id, o.total_amount, o.status, o.created_at,
       (SELECT json_agg(json_build_object('title', p.title, 'price', oi.price, 'quantity', oi.quantity))
        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) AS items
     FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 20`,
    [user.id]
  );
  return NextResponse.json({ orders: rows });
}
