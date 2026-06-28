export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const res = await query('SELECT p.*, c.quantity FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=$1', [user.id]);
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { product_id, quantity } = await request.json();
  await query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart.quantity + $3', [user.id, product_id, quantity || 1]);
  return Response.json({ message: 'Added to cart' });
}
export async function DELETE(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { product_id } = await request.json();
  await query('DELETE FROM cart WHERE user_id=$1 AND product_id=$2', [user.id, product_id]);
  return Response.json({ message: 'Removed' });
}
