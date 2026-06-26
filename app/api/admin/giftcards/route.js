export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM gift_cards ORDER BY created_at DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { code, amount, expires_at } = await request.json();
  if (!code || !amount) return Response.json({ error: 'code and amount required' }, { status: 400 });
  const res = await query(
    'INSERT INTO gift_cards (code, initial_amount, balance, expires_at, created_by) VALUES ($1, $2, $2, $3, $4) RETURNING *',
    [code, amount, expires_at || null, auth.user.id]
  );
  return Response.json(res.rows[0], { status: 201 });
}

export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id } = await request.json();
  await query('DELETE FROM gift_cards WHERE id = $1', [id]);
  return Response.json({ message: 'Gift card deleted' });
}
