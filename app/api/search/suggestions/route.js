export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return Response.json([]);

  // Search from products (titles)
  const products = await query(
    `SELECT title FROM products WHERE title ILIKE $1 AND is_active = true LIMIT 5`,
    [`%${q}%`]
  );
  // Also from search history (trending)
  const history = await query(
    `SELECT query FROM search_history WHERE query ILIKE $1 GROUP BY query ORDER BY COUNT(*) DESC LIMIT 3`,
    [`%${q}%`]
  );
  const suggestions = [
    ...products.rows.map(r => r.title),
    ...history.rows.map(r => r.query),
  ];
  return Response.json([...new Set(suggestions)].slice(0, 8));
}
