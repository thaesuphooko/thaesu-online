export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const stats = await query('SELECT COUNT(*) as total_requests, COALESCE(SUM(prompt_tokens+completion_tokens),0) as total_tokens, COALESCE(SUM(cost_estimate),0) as total_cost FROM ai_usage');
    return Response.json(stats.rows[0]);
  } catch (e) {
    return Response.json({ total_requests: 0, total_tokens: 0, total_cost: 0 });
  }
}
