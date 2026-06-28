export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { execSync } from 'child_process';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    execSync('node lib/monitor.js', { cwd: '/data/data/com.termux/files/home/thaesu-online' });
    return Response.json({ message: 'Health check completed' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
