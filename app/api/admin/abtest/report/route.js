export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const tests = await query('SELECT * FROM ab_tests WHERE active = true');
  const reports = [];
  for (const test of tests.rows) {
    const aCount = await query('SELECT COUNT(*) FROM live_users WHERE user_agent LIKE $1', [`%${test.variant_a}%`]);
    const bCount = await query('SELECT COUNT(*) FROM live_users WHERE user_agent LIKE $1', [`%${test.variant_b}%`]);
    reports.push({ name: test.name, variant_a_count: parseInt(aCount.rows[0].count), variant_b_count: parseInt(bCount.rows[0].count) });
  }
  return Response.json(reports);
}
