export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100);
  const res = await query(`
    SELECT r.rating, r.comment, r.created_at, u.full_name as user_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
    LIMIT $1
  `, [limit]);
  return Response.json(res.rows);
}
