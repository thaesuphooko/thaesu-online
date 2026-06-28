export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM telegram_config ORDER BY created_at ASC');
  return Response.json(res.rows);
}
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { bot_token, user_ids } = await request.json();
  if (!bot_token || !user_ids) return Response.json({ error: 'Missing fields' }, { status: 400 });
  const res = await query('INSERT INTO telegram_config (bot_token, user_ids) VALUES ($1, $2) RETURNING *', [bot_token, user_ids]);
  return Response.json(res.rows[0], { status: 201 });
}
export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id, bot_token, user_ids, is_active } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const res = await query('UPDATE telegram_config SET bot_token = $1, user_ids = $2, is_active = $3, updated_at = NOW() WHERE id = $4 RETURNING *', [bot_token, user_ids, is_active, id]);
  if (res.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(res.rows[0]);
}
export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id } = await request.json();
  await query('DELETE FROM telegram_config WHERE id = $1', [id]);
  return Response.json({ message: 'Deleted' });
}
