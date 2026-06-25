import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  // Gather all user data
  const profile = await query('SELECT * FROM users WHERE id = $1', [user.id]);
  const orders = await query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
  const reviews = await query('SELECT * FROM reviews WHERE user_id = $1', [user.id]);
  const messages = await query('SELECT * FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user.id]);

  const data = {
    profile: profile.rows[0],
    orders: orders.rows,
    reviews: reviews.rows,
    messages: messages.rows,
    exported_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="thaesu-data-export.json"',
    },
  });
}
