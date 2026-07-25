import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import pool from '@/lib/db';

export async function POST(request) {
  const user = authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { receiver_id, content } = await request.json();
  if (!receiver_id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  try {
    // Insert message
    const { rows: [msg] } = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [user.id, receiver_id, content]
    );

    // Update contacts for sender
    await pool.query(
      `INSERT INTO contacts (user_id, contact_id, last_message, last_message_time, unread_count)
       VALUES ($1, $2, $3, NOW(), 0)
       ON CONFLICT (user_id, contact_id) DO UPDATE SET last_message = $3, last_message_time = NOW()`,
      [user.id, receiver_id, content]
    );

    // Update contacts for receiver (increment unread)
    await pool.query(
      `INSERT INTO contacts (user_id, contact_id, last_message, last_message_time, unread_count)
       VALUES ($1, $2, $3, NOW(), 1)
       ON CONFLICT (user_id, contact_id) DO UPDATE SET 
         last_message = $3, 
         last_message_time = NOW(),
         unread_count = contacts.unread_count + 1`,
      [receiver_id, user.id, content]
    );

    // Send notification to receiver
    const sender = await pool.query('SELECT full_name FROM users WHERE id = $1', [user.id]);
    const senderName = sender.rows[0]?.full_name || 'Someone';
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, created_at)
       VALUES ($1, $2, 'chat', NOW())`,
      [receiver_id, `${senderName} sent you a message`]
    );

    return NextResponse.json(msg, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
