export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
export async function POST(request, { params }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { slug } = await params;
  const product = await query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (product.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  await query('INSERT INTO stock_notifications (user_id, product_id) VALUES ($1, $2)', [user.id, product.rows[0].id]);
  return Response.json({ message: 'You will be notified when back in stock' });
}
