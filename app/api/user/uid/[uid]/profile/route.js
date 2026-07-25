import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req, { params }) {
  const { uid } = await params;
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

  try {
    // Get user info
    const userRes = await query(
      'SELECT id, full_name, avatar_url, uid, created_at FROM users WHERE uid = $1',
      [uid]
    );
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = userRes.rows[0];

    // Get post count
    const postCount = await query('SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1', [user.id]);
    user.post_count = postCount.rows[0].count;

    // Get total visits (distinct visitors count)
    const visitCount = await query('SELECT COUNT(DISTINCT visitor_id)::int AS count FROM profile_visits WHERE profile_uid = $1', [uid]);
    user.visit_count = visitCount.rows[0].count;

    // Get recent visitors (last 10)
    const recentVisitors = await query(
      `SELECT v.visitor_id, u.full_name, u.avatar_url, u.uid, v.visited_at
       FROM profile_visits v
       JOIN users u ON v.visitor_id = u.id
       WHERE v.profile_uid = $1
       ORDER BY v.visited_at DESC LIMIT 10`,
      [uid]
    );
    user.recent_visitors = recentVisitors.rows;

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
