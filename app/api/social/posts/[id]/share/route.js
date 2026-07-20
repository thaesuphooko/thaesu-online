import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const { id: postId } = await params;
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  try {
    await query('INSERT INTO shares (user_id, post_id) VALUES ($1, $2)', [user.id, postId]);
    return NextResponse.json({ shared: true });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json({ error: 'Share failed' }, { status: 500 });
  }
}
