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
    SELECT np.*, u.full_name as user_name,
      COALESCE(lc.likes_count, 0) as likes_count,
      COALESCE(cc.comments_count, 0) as comments_count,
      EXISTS(SELECT 1 FROM news_likes nl WHERE nl.post_id = np.id AND nl.user_id = $1) as liked_by_me
    FROM news_posts np
    JOIN users u ON u.id = np.user_id
    LEFT JOIN LATERAL (SELECT COUNT(*) as likes_count FROM news_likes WHERE post_id = np.id) lc ON true
    LEFT JOIN LATERAL (SELECT COUNT(*) as comments_count FROM news_comments WHERE post_id = np.id) cc ON true
    ORDER BY np.created_at DESC LIMIT 50
  `, [userId || null]);
  return Response.json(res.rows);
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { content, image_url } = await request.json();
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 });
  const res = await query('INSERT INTO news_posts (user_id, content, image_url) VALUES ($1,$2,$3) RETURNING *', [user.id, content, image_url]);
  return Response.json(res.rows[0], { status: 201 });
}
