export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const postId = new URL(request.url).searchParams.get('post_id');
  if (!postId) return Response.json([]);
  const res = await query('SELECT sc.*, u.full_name FROM social_comments sc JOIN users u ON u.id=sc.user_id WHERE sc.post_id=$1 ORDER BY sc.created_at ASC', [postId]);
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { post_id, content } = await request.json();
  const res = await query('INSERT INTO social_comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING *', [post_id, user.id, content]);
  await query('UPDATE social_posts SET comment_count = comment_count + 1 WHERE id = $1', [post_id]);
  return Response.json(res.rows[0], { status: 201 });
}
