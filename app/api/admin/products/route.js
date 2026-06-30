export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
  const offset = (page - 1) * limit;
  const category = searchParams.get('category') || '';
  const stockMax = searchParams.get('stockMax');
  const aiPriced = searchParams.get('aiPriced');

  let conditions = [];
  let params = [];
  let idx = 1;

  if (search.trim()) {
    conditions.push(`title ILIKE $${idx++}`);
    params.push(`%${search.trim()}%`);
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }
  if (stockMax !== null && stockMax !== undefined) {
    conditions.push(`stock <= $${idx++}`);
    params.push(parseInt(stockMax));
  }
  if (aiPriced === 'true') {
    conditions.push(`ai_priced = true`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM products ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const productsRes = await query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return Response.json({
    data: productsRes.rows,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
