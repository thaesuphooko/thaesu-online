export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  let userId = null;
  if (authHeader?.startsWith('Bearer ')) {
    try { userId = verifyToken(authHeader.split(' ')[1]).id; } catch {}
  }
  const res = await query(`
    SELECT sp.*, u.full_name as user_name,
      EXISTS(SELECT 1 FROM social_likes sl WHERE sl.post_id = sp.id AND sl.user_id = $1) as liked_by_me
    FROM social_posts sp
    JOIN users u ON u.id = sp.user_id
    ORDER BY sp.created_at DESC LIMIT 50
  `, [userId || null]);
  return Response.json(res.rows);
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { content, image_url, video_url } = await request.json();
  const res = await query(
    'INSERT INTO social_posts (user_id, content, image_url, video_url) VALUES ($1,$2,$3,$4) RETURNING *',
    [user.id, content, image_url, video_url]
  );
  return Response.json(res.rows[0], { status: 201 });
}
