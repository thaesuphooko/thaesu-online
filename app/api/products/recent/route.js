export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function POST(request) {
  const { ids } = await request.json();
  const res = await query('SELECT id, title, price, slug FROM products WHERE id = ANY($1)', [ids]);
  return Response.json(res.rows);
}
