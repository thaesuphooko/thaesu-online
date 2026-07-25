import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const user = authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const partnerId = (await params).userId;

  try {
    // Get messages
    const { rows } = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC
       LIMIT 100`,
      [user.id, partnerId]
    );

    // Mark messages as read
    await pool.query(
      'UPDATE messages SET read = true WHERE receiver_id = $1 AND sender_id = $2 AND read = false',
      [user.id, partnerId]
    );

    // Reset unread count in contacts
    await pool.query(
      'UPDATE contacts SET unread_count = 0 WHERE user_id = $1 AND contact_id = $2',
      [user.id, partnerId]
    );

    return NextResponse.json({ messages: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
