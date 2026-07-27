import { createApiRoute } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';
import { verifyToken } from '@/lib/auth';

const handlers = {
  // GET – List friends of the authenticated user
  GET: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const { rows: friends } = await safeQuery(
      `SELECT u.id, u.uid, u.full_name, u.avatar_url
       FROM social_friends sf
       JOIN users u ON (sf.user_id = u.id OR sf.friend_id = u.id)
       WHERE (sf.user_id = $1 OR sf.friend_id = $1) AND u.id != $1 AND sf.status = 'accepted'`,
      [user.id]
    );
    return Response.json(friends);
  },

  // POST – Send friend request
  POST: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    if (!body.friend_id) return Response.json({ error: 'friend_id required' }, { status: 400 });
    if (body.friend_id === user.id) return Response.json({ error: 'Cannot befriend yourself' }, { status: 400 });

    const { rows: [friendship] } = await safeQuery(
      'INSERT INTO social_friends (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [user.id, body.friend_id, 'pending']
    );
    return Response.json(friendship || { message: 'Request already sent' }, { status: 201 });
  },

  // PUT – Accept/reject friend request
  PUT: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    if (!body.friend_id || !body.action) return Response.json({ error: 'friend_id and action required' }, { status: 400 });
    if (!['accept', 'reject'].includes(body.action)) return Response.json({ error: 'action must be accept or reject' }, { status: 400 });

    if (body.action === 'accept') {
      await safeQuery(
        'UPDATE social_friends SET status = $1 WHERE user_id = $2 AND friend_id = $3',
        ['accepted', body.friend_id, user.id]
      );
    } else {
      await safeQuery(
        'DELETE FROM social_friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
        [user.id, body.friend_id]
      );
    }
    return Response.json({ success: true });
  },
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
