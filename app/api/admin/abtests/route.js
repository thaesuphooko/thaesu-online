export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM ab_tests ORDER BY created_at DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { name, page_path, variant_a, variant_b } = await request.json();
  const res = await query(
    'INSERT INTO ab_tests (name, page_path, variant_a, variant_b) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, page_path, JSON.stringify(variant_a), JSON.stringify(variant_b)]
  );
  return Response.json(res.rows[0], { status: 201 });
}
