export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { productId, stock } = await request.json();
  await query('UPDATE products SET stock = $1 WHERE id = $2', [stock, productId]);
  return Response.json({ message: 'Stock updated' });
}
