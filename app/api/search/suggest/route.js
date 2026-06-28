export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return Response.json([]);
  const products = await query(
    `SELECT p.title, p.slug, (SELECT cloudinary_url FROM media WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image_url
     FROM products p WHERE p.is_active = true AND p.title ILIKE $1 LIMIT 5`, [`%${q}%`]
  );
  return Response.json(products.rows);
}
