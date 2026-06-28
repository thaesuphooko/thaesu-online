export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const totalVisits = await query("SELECT COUNT(*) FROM live_users");
  const totalOrders = await query("SELECT COUNT(*) FROM orders WHERE status != 'cancelled'");
  return Response.json({ visits: parseInt(totalVisits.rows[0].count), orders: parseInt(totalOrders.rows[0].count) });
}
