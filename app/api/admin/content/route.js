export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 'home';
  const res = await query('SELECT * FROM content_blocks WHERE page = $1 ORDER BY section', [page]);
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { page, section, content, image_url } = await request.json();
  const res = await query(
    'INSERT INTO content_blocks (page, section, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
    [page, section, content, image_url]
  );
  return Response.json(res.rows[0], { status: 201 });
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id, content, image_url } = await request.json();
  await query('UPDATE content_blocks SET content = $1, image_url = $2, updated_at = NOW() WHERE id = $3', [content, image_url, id]);
  return Response.json({ message: 'Updated' });
}
