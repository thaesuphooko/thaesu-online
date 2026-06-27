export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return Response.json([]);

  // Trigrams similarity search (fuzzy matching)
  const products = await query(
    `SELECT title, slug FROM products 
     WHERE is_active = true AND title % $1 
     ORDER BY similarity(title, $1) DESC 
     LIMIT 5`,
    [q]
  );

  return Response.json(products.rows);
}
