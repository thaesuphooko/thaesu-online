export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100);
  const res = await query(`
    SELECT 
      r.rating, 
      r.comment, 
      r.created_at, 
      u.full_name as user_name,
      CASE 
        WHEN r.created_at > NOW() - INTERVAL '1 day' THEN 'Today'
        WHEN r.created_at > NOW() - INTERVAL '2 days' THEN 'Yesterday'
        WHEN r.created_at > NOW() - INTERVAL '7 days' THEN EXTRACT(days FROM (NOW() - r.created_at))::int || ' days ago'
        WHEN r.created_at > NOW() - INTERVAL '30 days' THEN EXTRACT(days FROM (NOW() - r.created_at) / 7)::int || ' weeks ago'
        ELSE TO_CHAR(r.created_at, 'Mon DD')
      END as relative_date
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
    LIMIT $1
  `, [limit]);
  return Response.json(res.rows);
}
