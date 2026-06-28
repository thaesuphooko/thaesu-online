export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { productId } = await request.json();
  const product = await query('SELECT title, description FROM products WHERE id = $1', [productId]);
  if (product.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const title = product.rows[0].title;
  const desc = product.rows[0].description || title;
  const metaTitle = `${title} | Buy Online at Best Price in Myanmar`;
  const metaDesc = `Shop ${title} at Thaesu Online. ✓ Best Price ✓ Fast Delivery ✓ Quality Guaranteed. ${desc.slice(0, 100)}`;
  await query('UPDATE products SET meta_title = $1, meta_description = $2 WHERE id = $3', [metaTitle, metaDesc, productId]);
  return Response.json({ metaTitle, metaDesc });
}
