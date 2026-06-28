export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
export async function PUT(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { tier } = await request.json();
  await query('UPDATE users SET tier = $1 WHERE id = $2', [tier, user.id]);
  return Response.json({ message: 'Tier updated' });
}
