import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function isAdmin(req) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('admin_hash') || req.headers.get('x-admin-hash');
  return hash === 'super-secret-admin-step';
}

export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT p.id, p.content, p.media_urls, p.created_at, u.full_name AS user_name, u.uid AS user_uid,
     (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
     (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments
     FROM posts p JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return NextResponse.json({ posts: result.rows });
}

export async function PATCH(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, content } = await req.json();
  if (!id || !content) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  await query('UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2', [content, id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await query('DELETE FROM posts WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
