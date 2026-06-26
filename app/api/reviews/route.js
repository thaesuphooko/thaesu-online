export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    const { product_id, rating, comment } = await request.json();
    await query('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)', [product_id, user.id, rating, comment]);
    return Response.json({ message: 'Review saved' }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
