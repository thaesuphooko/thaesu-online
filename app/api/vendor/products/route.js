export const dynamic = 'force-dynamic';
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
  const res = await query('SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
  return Response.json(res.rows);
}
