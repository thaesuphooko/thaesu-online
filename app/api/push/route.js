export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  
  const { subscription } = await request.json();
  if (!subscription || !subscription.endpoint) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  // Store subscription in users table (JSONB column)
  await query(
    `UPDATE users SET push_subscription = $1 WHERE id = $2`,
    [JSON.stringify(subscription), user.id]
  );
  return Response.json({ message: 'Subscribed' });
}
