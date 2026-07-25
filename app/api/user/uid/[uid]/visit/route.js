import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function POST(req, { params }) {
  const visitor = authenticate(req);
  if (!visitor) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { uid } = await params;
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

  try {
    // Don't record if visitor is the profile owner
    const profileUser = await query('SELECT id FROM users WHERE uid = $1', [uid]);
    if (profileUser.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (profileUser.rows[0].id === visitor.id) return NextResponse.json({ visited: false, reason: 'self' });

    // Record visit (insert, keep last 100 visits per profile to avoid bloat)
    await query(
      'INSERT INTO profile_visits (visitor_id, profile_uid) VALUES ($1, $2)',
      [visitor.id, uid]
    );
    // Clean old records (keep latest 100)
    await query(
      `DELETE FROM profile_visits WHERE id IN (
         SELECT id FROM profile_visits WHERE profile_uid = $1 ORDER BY visited_at DESC OFFSET 100
       )`,
      [uid]
    );

    return NextResponse.json({ visited: true });
  } catch (error) {
    console.error('Visit record error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
