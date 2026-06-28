export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const storyId = new URL(request.url).searchParams.get('story_id');
  if (!storyId) return Response.json([]);
  const res = await query('SELECT * FROM wattpad_chapters WHERE story_id=$1 ORDER BY chapter_number ASC', [storyId]);
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { story_id, chapter_number, title, content } = await request.json();
  const res = await query('INSERT INTO wattpad_chapters (story_id, chapter_number, title, content) VALUES ($1,$2,$3,$4) RETURNING *', [story_id, chapter_number, title, content]);
  return Response.json(res.rows[0], { status: 201 });
}
