import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'accepted';
  const result = await query(
    `SELECT u.id, u.full_name, u.avatar_url, u.uid, f.status
     FROM friendships f
     JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
     WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = $2 AND u.id != $1`,
    [user.id, status]
  );
  return NextResponse.json({ friends: result.rows });
}

export async function POST(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { friendUid } = await req.json();
  // Find friend by uid
  const friendRes = await query('SELECT id FROM users WHERE uid = $1', [friendUid]);
  if (friendRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const friendId = friendRes.rows[0].id;
  // Check if already friends or pending
  const existing = await query(
    `SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
    [user.id, friendId]
  );
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Already exists' }, { status: 400 });
  await query('INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)', [user.id, friendId, 'pending']);
  return NextResponse.json({ success: true, status: 'pending' });
}

export async function PUT(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { friendUid, action } = await req.json(); // action: 'accept' or 'reject'
  const friendRes = await query('SELECT id FROM users WHERE uid = $1', [friendUid]);
  if (friendRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const friendId = friendRes.rows[0].id;
  if (action === 'accept') {
    await query(`UPDATE friendships SET status = 'accepted' WHERE friend_id = $1 AND user_id = $2 AND status = 'pending'`, [user.id, friendId]);
    return NextResponse.json({ success: true });
  } else if (action === 'reject') {
    await query('DELETE FROM friendships WHERE friend_id = $1 AND user_id = $2 AND status = $3', [user.id, friendId, 'pending']);
    return NextResponse.json({ success: true });
  }
}
