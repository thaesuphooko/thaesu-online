import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  const res = await query(
    `SELECT p.*, m.url as image_url FROM wishlist w
     JOIN products p ON p.id = w.product_id
     LEFT JOIN LATERAL (SELECT cloudinary_url as url FROM media WHERE product_id = p.id ORDER BY sort_order LIMIT 1) m ON true
     WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [user.id]
  );
  return Response.json(res.rows);
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  const { product_id } = await request.json();
  await query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, product_id]);
  return Response.json({ message: 'Added to wishlist' });
}

export async function DELETE(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  const { product_id } = await request.json();
  await query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [user.id, product_id]);
  return Response.json({ message: 'Removed from wishlist' });
}
