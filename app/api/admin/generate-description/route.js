export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { product_id } = await request.json();
  if (!product_id) return Response.json({ error: 'product_id required' }, { status: 400 });
  const product = await query('SELECT title FROM products WHERE id = $1', [product_id]);
  if (product.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const title = product.rows[0].title;
  const description = `Experience the best quality ${title.toLowerCase()}. Perfect for your needs. Fast delivery and excellent customer service.`;
  await query('UPDATE products SET description = $1 WHERE id = $2', [description, product_id]);
  return Response.json({ message: 'Description generated and updated', description });
}
