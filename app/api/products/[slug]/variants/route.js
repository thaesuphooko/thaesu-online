export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  const { slug } = await params;
  const productRes = await query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (productRes.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const productId = productRes.rows[0].id;
  const res = await query('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY name', [productId]);
  return Response.json(res.rows);
}
