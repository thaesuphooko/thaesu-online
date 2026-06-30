export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { startCrawlJob, stopCrawlJob, getCrawlProgress } from '@/lib/crawler';
import { query } from '@/lib/db';

export async function PATCH(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { jobId } = await params;
  const { action } = await request.json();
  if (action === 'start') {
    await startCrawlJob(jobId);
    return Response.json({ message: 'Crawl started' });
  } else if (action === 'stop') {
    await stopCrawlJob(jobId);
    return Response.json({ message: 'Crawl stopped' });
  }
  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET(request, { params }) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { jobId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit')) || 50;

  const logs = await query('SELECT * FROM crawl_logs WHERE job_id = $1 ORDER BY created_at DESC LIMIT $2', [jobId, limit]);
  const progress = await getCrawlProgress(jobId);
  return Response.json({ logs: logs.rows, progress });
}
