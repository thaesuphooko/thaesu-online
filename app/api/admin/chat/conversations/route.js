import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import { query } from '@/lib/db';

export async function GET(req) {
  const user = await authenticate(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await query(`
      SELECT 
        c.conversation_id AS id,
        MAX(c.created_at) AS last_time,
        (SELECT u.full_name FROM chat_messages cm JOIN users u ON cm.sender_id = u.id WHERE cm.conversation_id = c.conversation_id AND cm.sender_role = 'customer' LIMIT 1) AS customer_name,
        (SELECT cm.message FROM chat_messages cm WHERE cm.conversation_id = c.conversation_id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
        (SELECT cm.sender_id::text FROM chat_messages cm WHERE cm.conversation_id = c.conversation_id AND cm.sender_role = 'customer' LIMIT 1) AS customer_uid,
        COALESCE((SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.conversation_id AND sender_role = 'customer' AND read = false), 0) AS unread
      FROM chat_messages c
      GROUP BY c.conversation_id
      ORDER BY last_time DESC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Conversations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
