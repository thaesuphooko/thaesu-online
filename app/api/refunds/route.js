export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { order_id, reason, amount } = await request.json();
  await query('INSERT INTO refunds (order_id, user_id, reason, amount) VALUES ($1,$2,$3,$4)', [order_id, user.id, reason, amount]);
  return Response.json({ message: 'Refund requested' }, { status: 201 });
}
