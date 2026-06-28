export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { subject } = await request.json();
  await query('INSERT INTO support_tickets (user_id, subject) VALUES ($1, $2)', [user.id, subject]);
  return Response.json({ message: 'Ticket created' }, { status: 201 });
}
