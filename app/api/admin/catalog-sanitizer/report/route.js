export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

// In-memory state (use Redis in production)
let lastReport = { total: 0, purged: [], adjusted: [] };

// Access the state from the main sanitizer route (simplified – in production use DB)
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  // For now, return the last known report (cleared on each scan)
  return Response.json(lastReport);
}

// Allow the sanitizer to store its report
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  lastReport = body;
  return Response.json({ message: 'Report saved' });
}
