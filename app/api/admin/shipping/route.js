import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM shipping_zones ORDER BY region_name');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { region_name, price } = await request.json();
  const res = await query('INSERT INTO shipping_zones (region_name, price) VALUES ($1, $2) RETURNING *', [region_name, price]);
  return Response.json(res.rows[0], { status: 201 });
}

export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id } = await request.json();
  await query('DELETE FROM shipping_zones WHERE id = $1', [id]);
  return Response.json({ message: 'Deleted' });
}
