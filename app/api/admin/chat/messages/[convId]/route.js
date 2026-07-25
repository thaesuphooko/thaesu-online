import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import { query } from '@/lib/db';

export async function GET(req, { params }) {
  const user = await authenticate(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;

  try {
    // Mark messages as read (simple: all customer messages in this convo)
    await query("UPDATE chat_messages SET read = true WHERE conversation_id = $1 AND sender_role = 'customer'", [convId]);

    const { rows } = await query(
      'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );
    return NextResponse.json({ messages: rows });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
