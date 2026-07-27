import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req, { params }) {
  const { uid } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12;

  try {
    const userRes = await query('SELECT id FROM users WHERE uid = $1', [uid]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT p.*,
         COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) AS like_count,
         COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) AS comment_count
       FROM posts p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userRes.rows[0].id, limit, offset]
    );

    const total = await query('SELECT COUNT(*)::int FROM posts WHERE user_id = $1', [userRes.rows[0].id]);
    const hasMore = offset + limit < total.rows[0].count;

    return NextResponse.json({ posts: rows, hasMore });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
