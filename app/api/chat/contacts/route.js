export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const res = await query('SELECT id, full_name, email FROM users WHERE id != $1', [user.id]);
  return Response.json(res.rows);
}
