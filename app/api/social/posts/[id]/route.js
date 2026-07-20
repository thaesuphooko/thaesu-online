import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function PATCH(req, { params }) {
  const { id: postId } = await params;
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { content } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ error: 'Content empty' }, { status: 400 });
    const owner = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (owner.rows.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (owner.rows[0].user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await query('UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2', [content, postId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit error:', error);
    return NextResponse.json({ error: 'Edit failed' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id: postId } = await params;
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const owner = await query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (owner.rows.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (owner.rows[0].user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await query('DELETE FROM posts WHERE id = $1', [postId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
