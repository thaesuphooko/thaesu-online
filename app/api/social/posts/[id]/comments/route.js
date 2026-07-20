import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req, { params }) {
  const postId = params.id;
  const result = await query(
    `SELECT c.*, u.full_name, u.avatar_url, u.uid FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
    [postId]
  );
  return NextResponse.json({ comments: result.rows });
}

export async function POST(req, { params }) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { content } = await req.json();
  const result = await query(
    `INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [user.id, params.id, content]
  );
  const comment = result.rows[0];
  const userResult = await query('SELECT full_name, avatar_url, uid FROM users WHERE id = $1', [user.id]);
  comment.user_name = userResult.rows[0]?.full_name;
  comment.user_avatar = userResult.rows[0]?.avatar_url;
  comment.user_uid = userResult.rows[0]?.uid;
  return NextResponse.json({ comment }, { status: 201 });
}
