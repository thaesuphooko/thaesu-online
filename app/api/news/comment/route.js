export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const postId = new URL(request.url).searchParams.get('post_id');
  if (!postId) return Response.json([]);
  const res = await query(`SELECT nc.*, u.full_name FROM news_comments nc JOIN users u ON u.id=nc.user_id WHERE nc.post_id=$1 ORDER BY nc.created_at ASC`, [postId]);
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { post_id, content } = await request.json();
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 });
  const res = await query('INSERT INTO news_comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING *', [post_id, user.id, content]);
  return Response.json(res.rows[0], { status: 201 });
}
