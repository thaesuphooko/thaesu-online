import pool from '@/lib/db';

export async function startProductsCrawl(jobId, url, config) {
  await pool.query('UPDATE crawl_jobs SET status = \'running\' WHERE id = $1', [jobId]);
  await addLog(jobId, 'info', 'Products crawl started');
  // Add your existing products crawl logic here...
  // ...
  await pool.query('UPDATE crawl_jobs SET status = \'completed\' WHERE id = $1', [jobId]);
  await addLog(jobId, 'info', 'Products crawl completed');
}

async function addLog(jobId, level, message) {
  await pool.query(
    'INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)',
    [jobId, level, message]
  );
}
