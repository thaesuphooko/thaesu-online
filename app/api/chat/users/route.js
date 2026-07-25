import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const user = authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url, u.uid,
              c.last_message, c.last_message_time, c.unread_count
       FROM users u
       LEFT JOIN contacts c ON (c.user_id = $1 AND c.contact_id = u.id) OR (c.user_id = u.id AND c.contact_id = $1)
       WHERE u.id != $1 AND u.role != 'admin'
       ORDER BY c.last_message_time DESC NULLS LAST, u.full_name ASC`,
      [user.id]
    );
    return NextResponse.json({ users: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
