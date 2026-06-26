export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  const { store_slug } = await params;
  const vendor = await query('SELECT id, store_name FROM vendors WHERE store_slug = $1 AND is_approved = true', [store_slug]);
  if (vendor.rows.length === 0) return Response.json({ error: 'Store not found' }, { status: 404 });
  const products = await query('SELECT * FROM products WHERE vendor_id = $1 AND is_active = true', [vendor.rows[0].id]);
  return Response.json({ store: vendor.rows[0], products: products.rows });
}
