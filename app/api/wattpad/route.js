export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const res = await query('SELECT * FROM wattpad_stories WHERE is_published = true ORDER BY created_at DESC LIMIT 50');
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { title, description, cover_image, category } = await request.json();
  const res = await query('INSERT INTO wattpad_stories (user_id, title, description, cover_image, category) VALUES ($1,$2,$3,$4,$5) RETURNING *', [user.id, title, description, cover_image, category]);
  return Response.json(res.rows[0], { status: 201 });
}
