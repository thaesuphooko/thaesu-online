export const dynamic = 'force-dynamic';
import { verifyAdminHash } from '@/lib/adminAuth';
import { startCrawlJob, stopCrawlJob } from '@/lib/crawler';
import { query } from '@/lib/db';

export async function PATCH(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
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
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { jobId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit')) || 100;
  const logs = await query('SELECT * FROM crawl_logs WHERE job_id = $1 ORDER BY created_at DESC LIMIT $2', [jobId, limit]);
  const job = await query('SELECT * FROM crawl_jobs WHERE id = $1', [jobId]);
  return Response.json({ logs: logs.rows.reverse(), job: job.rows[0] });
}

export async function DELETE(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { jobId } = await params;
  await query('DELETE FROM crawl_jobs WHERE id = $1', [jobId]);
  return Response.json({ success: true });
}
