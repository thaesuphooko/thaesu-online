export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { startCrawlJob, stopCrawlJob } from '@/lib/crawler';

// GET list of jobs and current status
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const jobs = await query('SELECT * FROM crawl_jobs ORDER BY created_at DESC');
  return Response.json(jobs.rows);
}

// POST create a new job
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { name, start_url, config } = await request.json();
  if (!start_url) return Response.json({ error: 'start_url required' }, { status: 400 });

  const domain = new URL(start_url).hostname;
  const res = await query(
    'INSERT INTO crawl_jobs (name, start_url, domain, config) VALUES ($1, $2, $3, $4) RETURNING *',
    [name || domain, start_url, domain, JSON.stringify(config || {})]
  );
  return Response.json(res.rows[0], { status: 201 });
}
