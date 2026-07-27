import { safeQuery } from '@/lib/db-wrapper';

export async function GET(req) {
  const url = new URL(req.url);
  const search = url.searchParams.get('q') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  
  let query = 'SELECT id, uid, full_name, avatar_url FROM users WHERE is_active = true';
  const params = [];
  
  if (search) {
    query += ` AND full_name ILIKE $${params.length + 1}`;
    params.push(`%${search}%`);
  }
  
  query += ` ORDER BY full_name LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const { rows } = await safeQuery(query, params);
  return Response.json(rows);
}
