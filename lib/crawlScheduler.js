import { query } from './db.js';
import { startCrawlJob } from './crawler.js';
import cronParser from 'cron-parser';

async function run() {
  const jobs = await query("SELECT id, config FROM crawl_jobs WHERE config->>'schedule' IS NOT NULL");
  const now = new Date();
  for (const job of jobs.rows) {
    try {
      const interval = cronParser.parseExpression(job.config.schedule);
      const prev = interval.prev().toDate();
      const diff = now - prev;
      // if last run was within 2 minutes, skip
      if (diff < 120000) {
        // already triggered recently? We'll use a simple flag: check if job is already running
        const status = await query('SELECT status FROM crawl_jobs WHERE id = $1', [job.id]);
        if (status.rows[0]?.status !== 'running') {
          console.log(`Starting scheduled crawl job ${job.id}`);
          await startCrawlJob(job.id);
        }
      }
    } catch (e) { console.error('Scheduler error:', e); }
  }
  process.exit(0);
}
run();
