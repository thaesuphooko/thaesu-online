import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ notifications: [], unread: 0 });

  const { rows } = await query(
    'SELECT id, message, type, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
    [user.id]
  );
  const unread = rows.filter(n => !n.read).length;
  return NextResponse.json({ notifications: rows, unread });
}

export async function PATCH(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [id, user.id]);
  return NextResponse.json({ success: true });
}
