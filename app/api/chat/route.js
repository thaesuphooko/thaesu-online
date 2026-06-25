import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const otherUserId = searchParams.get('with');
  const productId = searchParams.get('product_id') || null;

  // Build dynamic conditions
  const conditions = ['(sender_id = $1 OR receiver_id = $1)'];
  const params = [user.id];
  let idx = 2;

  if (otherUserId) {
    conditions.push(`(sender_id = $${idx} OR receiver_id = $${idx})`);
    params.push(otherUserId);
    idx++;
  }
  if (productId) {
    conditions.push(`product_id = $${idx}`);
    params.push(productId);
    idx++;
  }

  const res = await query(
    `SELECT m.*, s.full_name as sender_name, r.full_name as receiver_name 
     FROM messages m 
     JOIN users s ON s.id = m.sender_id
     JOIN users r ON r.id = m.receiver_id
     WHERE ${conditions.join(' AND ')} 
     ORDER BY m.created_at DESC 
     LIMIT 100`,
    params
  );
  return Response.json(res.rows);
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  const { receiver_id, product_id, content } = await request.json();
  if (!receiver_id || !content) {
    return Response.json({ error: 'receiver_id and content are required' }, { status: 400 });
  }

  const res = await query(
    `INSERT INTO messages (sender_id, receiver_id, product_id, content) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user.id, receiver_id, product_id || null, content]
  );
  return Response.json(res.rows[0], { status: 201 });
}
