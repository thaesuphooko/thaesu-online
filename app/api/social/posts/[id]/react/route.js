import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const { id: postId } = await params;
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { type } = await req.json();
  if (!type) return NextResponse.json({ error: 'Type required' }, { status: 400 });
  try {
    await query(
      `INSERT INTO reactions (user_id, post_id, type) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET type = $3`,
      [user.id, postId, type]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json({ error: 'Reaction failed' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id: postId } = await params;
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  try {
    await query('DELETE FROM reactions WHERE user_id = $1 AND post_id = $2', [user.id, postId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Remove reaction failed' }, { status: 500 });
  }
}
