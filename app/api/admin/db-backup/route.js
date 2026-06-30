export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { execSync } from 'child_process';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  try {
    execSync(`pg_dump "$NEON_DATABASE_URL" -f /tmp/${filename}`);
    return Response.json({ message: 'Backup created', file: filename });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
