export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function DELETE(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id } = params;
  await query('DELETE FROM coupons WHERE id = $1', [id]);
  return Response.json({ message: 'Coupon deleted' });
}
