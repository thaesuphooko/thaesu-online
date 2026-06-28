export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT r.*, u.email FROM refunds r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC');
  return Response.json(res.rows);
}
export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { refund_id, status } = await request.json();
  await query('UPDATE refunds SET status=$1, updated_at=NOW() WHERE id=$2', [status, refund_id]);
  return Response.json({ message: 'Refund updated' });
}
