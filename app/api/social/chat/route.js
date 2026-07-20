import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const friendUid = searchParams.get('friend');
  if (!friendUid) return NextResponse.json({ error: 'Friend UID required' }, { status: 400 });
  const friendRes = await query('SELECT id FROM users WHERE uid = $1', [friendUid]);
  if (friendRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const friendId = friendRes.rows[0].id;
  const result = await query(
    `SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC`,
    [user.id, friendId]
  );
  return NextResponse.json({ messages: result.rows });
}

export async function POST(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { friendUid, content } = await req.json();
  const friendRes = await query('SELECT id FROM users WHERE uid = $1', [friendUid]);
  if (friendRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const friendId = friendRes.rows[0].id;
  const result = await query(
    `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [user.id, friendId, content]
  );
  return NextResponse.json({ message: result.rows[0] }, { status: 201 });
}
