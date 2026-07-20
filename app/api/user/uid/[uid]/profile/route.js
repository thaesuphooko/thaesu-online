import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(req, { params }) {
  const uid = params.uid;
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });
  try {
    const userRes = await query('SELECT id, full_name, avatar_url, uid, created_at FROM users WHERE uid = $1', [uid]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = userRes.rows[0];
    const countRes = await query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [user.id]);
    user.post_count = parseInt(countRes.rows[0].count);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
