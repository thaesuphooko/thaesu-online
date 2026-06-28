export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const clv = await query(`SELECT u.email, SUM(o.total_amount) as lifetime_value FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY lifetime_value DESC LIMIT 10`);
  const churn = await query(`SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM orders WHERE created_at > NOW() - INTERVAL '30 days')`);
  return Response.json({ clv: clv.rows, churn: parseInt(churn.rows[0].count) });
}
