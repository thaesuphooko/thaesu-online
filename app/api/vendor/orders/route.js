import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  if (user.role !== 'vendor' && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const vendorRes = await query('SELECT id FROM vendors WHERE user_id = $1', [user.id]);
  if (vendorRes.rows.length === 0) return Response.json({ error: 'Not a vendor' }, { status: 403 });
  const vendorId = vendorRes.rows[0].id;

  const res = await query(
    `SELECT o.id, o.total_amount, o.status, o.created_at,
            json_agg(json_build_object('title', oi.product_title, 'qty', oi.quantity, 'price', oi.price)) as items
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.vendor_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [vendorId]
  );
  return Response.json(res.rows);
}
