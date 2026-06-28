export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { execSync } from 'child_process';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    execSync('rm -rf .next node_modules/.cache');
    execSync('npm cache clean --force');
    return Response.json({ message: 'Cache cleaned' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
