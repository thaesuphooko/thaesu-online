import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    const { store_name, store_slug } = await request.json();
    if (!store_name || !store_slug) {
      return Response.json({ error: 'Store name and slug are required' }, { status: 400 });
    }

    // Check if vendor already exists
    const existing = await query('SELECT id FROM vendors WHERE user_id = $1', [user.id]);
    if (existing.rows.length > 0) {
      return Response.json({ error: 'Vendor store already exists' }, { status: 409 });
    }

    const res = await query(
      'INSERT INTO vendors (user_id, store_name, store_slug) VALUES ($1, $2, $3) RETURNING *',
      [user.id, store_name, store_slug]
    );
    return Response.json({ message: 'Store created', vendor: res.rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
