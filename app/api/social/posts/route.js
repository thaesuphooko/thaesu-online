import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

// If schedulePostEngagements exists, keep it; otherwise remove the import
// import { schedulePostEngagements } from '@/lib/autoEngage';

export async function GET(req) {
  const user = await authenticate(req);
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;
  try {
    let result;
    if (user) {
      result = await query(
        `SELECT p.*,
          COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) AS comment_count,
          COALESCE((SELECT COUNT(*) FROM shares WHERE post_id = p.id), 0) AS share_count,
          EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $3) AS liked_by_user,
          u.full_name AS user_name, u.avatar_url AS user_avatar, u.uid AS user_uid
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset, user.id]
      );
    } else {
      result = await query(
        `SELECT p.*,
          COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) AS comment_count,
          COALESCE((SELECT COUNT(*) FROM shares WHERE post_id = p.id), 0) AS share_count,
          FALSE AS liked_by_user,
          u.full_name AS user_name, u.avatar_url AS user_avatar, u.uid AS user_uid
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }
    const posts = result.rows;
    for (const post of posts) {
      if (post.product_id) {
        const prod = await query('SELECT title, price, slug FROM products WHERE id = $1', [post.product_id]);
        if (prod.rows.length > 0) post.product = prod.rows[0];
      }
    }
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Posts GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await authenticate(req);  // ← await is crucial
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { content, media_urls, product_id } = await req.json();
    const result = await query(
      'INSERT INTO posts (user_id, content, media_urls, product_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.id, content || '', JSON.stringify(media_urls || []), product_id || null]
    );
    const post = result.rows[0];
    const userRes = await query('SELECT full_name, avatar_url, uid FROM users WHERE id = $1', [user.id]);
    post.user_name = userRes.rows[0]?.full_name || '';
    post.user_avatar = userRes.rows[0]?.avatar_url || '';
    post.user_uid = userRes.rows[0]?.uid || '';
    post.like_count = 0; post.comment_count = 0; post.share_count = 0;

    // Optionally schedule auto engagements – if the module exists and you want it
    try {
      const { schedulePostEngagements } = await import('@/lib/autoEngage');
      await schedulePostEngagements(post.id, user.id);
    } catch (e) {
      // autoEngage not available – ignore
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Post creation error:', error);
    return NextResponse.json({ error: 'Post failed' }, { status: 500 });
  }
}
