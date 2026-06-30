export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function PATCH(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;
  const valid = ['pending','confirmed','preparing','delivering','delivered','cancelled'];
  if (!status || !valid.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 });

  try {
    await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    return Response.json({ message: 'Order updated', status });
  } catch (err) {
    console.error('Order update error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  rm -rf .next}
}
