export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { ids } = await request.json();
  await query('DELETE FROM products WHERE id = ANY($1)', [ids]);
  return Response.json({ message: 'Deleted' });
}
