export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  return Response.json(res.rows);
}
