export const dynamic = 'force-dynamic';
import { verifyAdminHash } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  let where = '';
  const params = [];
  if (type !== 'all') { where = 'WHERE type = $1'; params.push(type); }
  const jobs = await query(`SELECT * FROM crawl_jobs ${where} ORDER BY created_at DESC`, params);
  return Response.json(jobs.rows);
}

export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { name, start_url, config, type } = await request.json();
  if (!start_url) return Response.json({ error: 'start_url required' }, { status: 400 });
  const domain = new URL(start_url).hostname;
  const res = await query(
    'INSERT INTO crawl_jobs (name, start_url, domain, config, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name || domain, start_url, domain, JSON.stringify(config || {}), type || 'products']
  );
  return Response.json(res.rows[0], { status: 201 });
}

export async function DELETE(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { id } = await request.json();
  await query('DELETE FROM crawl_jobs WHERE id = $1', [id]);
  return Response.json({ success: true });
}
