import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await query('INSERT INTO shares (user_id, post_id) VALUES ($1, $2)', [user.id, params.id]);
  return NextResponse.json({ shared: true });
}
