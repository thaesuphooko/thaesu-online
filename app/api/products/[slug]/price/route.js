export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { getDynamicPrice } from '@/lib/pricing';

export async function GET(request, { params }) {
  const { slug } = await params;
  const productRes = await query('SELECT * FROM products WHERE slug = $1', [slug]);
  if (productRes.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const product = productRes.rows[0];
  const dynamicPrice = await getDynamicPrice(product, product.price);
  return Response.json({ original_price: product.price, dynamic_price: dynamicPrice });
}
