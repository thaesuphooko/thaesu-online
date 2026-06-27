export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { ids, factor } = await request.json();
  await query('UPDATE products SET price = ROUND(price * $1, 2) WHERE id = ANY($2)', [factor, ids]);
  return Response.json({ message: 'Updated' });
}
