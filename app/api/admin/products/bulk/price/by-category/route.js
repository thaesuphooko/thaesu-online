export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { category, factor } = await request.json();
  if (!category || !factor) return Response.json({ error: 'category and factor required' }, { status: 400 });
  await query('UPDATE products SET price = ROUND(price * $1, 2) WHERE category = $2', [factor, category]);
  return Response.json({ message: `Prices updated for ${category}` });
}
