import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';
import { sendNotification } from '@/lib/notify';

export async function POST(req, { params }) {
  const { id: postId } = await params;
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  try {
    const existing = await query('SELECT id FROM likes WHERE user_id = $1 AND post_id = $2', [user.id, postId]);
    if (existing.rows.length > 0) {
      await query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [user.id, postId]);
      return NextResponse.json({ liked: false });
    } else {
      await query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [user.id, postId]);
      // Notify post owner
      const post = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
      if (post.rows.length > 0) {
        sendNotification(post.rows[0].user_id, 'Someone liked your post');
      }
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Like failed' }, { status: 500 });
  }
}
