import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { type } = await req.json();
  // Upsert reaction
  await query(
    `INSERT INTO reactions (user_id, post_id, type) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, post_id) DO UPDATE SET type = $3`,
    [user.id, params.id, type]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await query('DELETE FROM reactions WHERE user_id = $1 AND post_id = $2', [user.id, params.id]);
  return NextResponse.json({ success: true });
}
