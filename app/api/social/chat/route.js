import { createApiRoute, validateBody } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';
import { verifyToken } from '@/lib/auth';

const handlers = {
  // GET – Retrieve chat messages between two users
  GET: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(req.url);
    const withUserId = url.searchParams.get('with');
    if (!withUserId) return Response.json({ error: 'with (user id) parameter required' }, { status: 400 });

    const { rows: messages } = await safeQuery(
      `SELECT * FROM social_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC LIMIT 50`,
      [user.id, withUserId]
    );
    return Response.json(messages);
  },

  // POST – Send a new chat message
  POST: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    validateBody(body, ['receiver_id', 'message']);
    if (body.message.length > 1000) return Response.json({ error: 'Message too long' }, { status: 400 });

    const { rows: [msg] } = await safeQuery(
      'INSERT INTO social_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *',
      [user.id, body.receiver_id, body.message]
    );
    return Response.json(msg, { status: 201 });
  },
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
