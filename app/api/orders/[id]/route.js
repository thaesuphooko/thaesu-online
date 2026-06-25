import { query } from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = params;
  const res = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (res.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(res.rows[0]);
}
