export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

// GET all products (with pagination for admin table)
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') || '';

  const conditions = [];
  const params = [];
  let idx = 1;
  if (search.trim()) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${search.trim()}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRes = await query(`SELECT COUNT(*) FROM products ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const res = await query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
    [...params, limit, offset]
  );

  return Response.json({ data: res.rows, total, page, totalPages: Math.ceil(total / limit) });
}

// POST create a new product
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const { title, slug, description, price, compare_at_price, stock, category, tags, attributes, vendor_id, is_18_plus } = await request.json();
    if (!title || !slug || !price) {
      return Response.json({ error: 'Title, slug, and price are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO products (vendor_id, title, slug, description, price, compare_at_price, stock, category, tags, attributes, is_18_plus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [vendor_id || null, title, slug, description || '', price, compare_at_price || null, stock || 0, category || null, tags || [], JSON.stringify(attributes || {}), is_18_plus || false]
    );

    return Response.json({ message: 'Product created', product: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Create product error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
