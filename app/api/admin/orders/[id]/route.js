import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function PATCH(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id } = params;
  const { status } = await request.json();
  const validStatuses = ['pending','confirmed','preparing','delivering','delivered','cancelled'];
  if (!validStatuses.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 });
  await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  return Response.json({ message: 'Order updated' });
}
