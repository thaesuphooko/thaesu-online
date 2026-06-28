export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // Get latest check for each component (last 5 min)
  const res = await query(
    `SELECT DISTINCT ON (component) component, status, message, response_time_ms, checked_at
     FROM system_health_logs
     WHERE checked_at > NOW() - INTERVAL '10 minutes'
     ORDER BY component, checked_at DESC`
  );
  const summary = {
    ok: 0, warn: 0, error: 0, components: res.rows,
  };
  res.rows.forEach(r => { if (r.status === 'OK') summary.ok++; else if (r.status === 'WARN') summary.warn++; else summary.error++; });
  return Response.json(summary);
}
