import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const currentUser = await authenticate(req);
  if (!currentUser) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { uid } = await params;
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

  try {
    const targetUser = await query('SELECT id FROM users WHERE uid = $1', [uid]);
    if (targetUser.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (targetUser.rows[0].id === currentUser.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    const existing = await query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUser.id, targetUser.rows[0].id]);
    if (existing.rows.length > 0) {
      await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUser.id, targetUser.rows[0].id]);
      return NextResponse.json({ following: false });
    } else {
      await query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [currentUser.id, targetUser.rows[0].id]);
      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
