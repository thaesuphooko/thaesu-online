export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

// GET single product by ID
export async function GET(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = params;
  const res = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (res.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(res.rows[0]);
}

// PUT update a product
export async function PUT(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = params;
  const body = await request.json();

  // Build dynamic update
  const allowedFields = ['title', 'slug', 'description', 'price', 'compare_at_price', 'stock', 'category', 'tags', 'attributes', 'is_18_plus', 'is_active'];
  const updates = [];
  const values = [];
  let idx = 1;
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx}`);
      values.push(field === 'attributes' || field === 'tags' ? JSON.stringify(body[field]) : body[field]);
      idx++;
    }
  }
  if (updates.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

  values.push(id);
  const queryText = `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
  const res = await query(queryText, values);
  if (res.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ message: 'Product updated', product: res.rows[0] });
}

// DELETE a product
export async function DELETE(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = params;
  await query('DELETE FROM products WHERE id = $1', [id]);
  return Response.json({ message: 'Product deleted' });
}
