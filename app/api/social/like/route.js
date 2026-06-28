export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { post_id } = await request.json();
  try {
    await query('INSERT INTO social_likes (post_id, user_id) VALUES ($1,$2)', [post_id, user.id]);
    await query('UPDATE social_posts SET like_count = like_count + 1 WHERE id = $1', [post_id]);
    return Response.json({ message: 'Liked' });
  } catch {
    await query('DELETE FROM social_likes WHERE post_id=$1 AND user_id=$2', [post_id, user.id]);
    await query('UPDATE social_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [post_id]);
    return Response.json({ message: 'Unliked' });
  }
}
