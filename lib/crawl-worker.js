// Crawl Worker Process Manager – Infinity Premium Ultra Pro Max
// Manages background crawl jobs with concurrency control, auto-restart, and health monitoring

import { query } from './db.js';
import { startCrawlJob, stopCrawlJob, getCrawlProgress } from './crawler.js';
import { EventEmitter } from 'events';

class CrawlWorkerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.pollInterval = options.pollInterval || 10000; // 10 seconds
    this.activeJobs = new Map();
    this.running = false;
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    console.log(`[CrawlWorker:${this.workerId}] Started (max concurrent: ${this.maxConcurrent})`);
    this.emit('started', { workerId: this.workerId });

    while (this.running) {
      try {
        await this.processQueue();
      } catch (error) {
        console.error(`[CrawlWorker:${this.workerId}] Queue processing error:`, error.message);
        this.emit('error', { workerId: this.workerId, error: error.message });
      }
      await this.sleep(this.pollInterval);
    }
  }

  async stop() {
    this.running = false;
    // Gracefully stop all active jobs
    for (const [jobId] of this.activeJobs) {
      try {
        await stopCrawlJob(jobId);
        console.log(`[CrawlWorker:${this.workerId}] Stopped job ${jobId}`);
      } catch (e) {
        console.error(`[CrawlWorker:${this.workerId}] Error stopping job ${jobId}:`, e.message);
      }
    }
    this.activeJobs.clear();
    console.log(`[CrawlWorker:${this.workerId}] Stopped`);
    this.emit('stopped', { workerId: this.workerId });
  }

  async processQueue() {
    // Check if we can start more jobs
    const availableSlots = this.maxConcurrent - this.activeJobs.size;
    if (availableSlots <= 0) return;

    // Find pending jobs that are ready to run (with optional schedule check)
    const { rows: pendingJobs } = await query(
      `SELECT * FROM crawl_jobs 
       WHERE status = 'pending' 
       ORDER BY 
         CASE WHEN config->>'schedule' IS NOT NULL THEN 0 ELSE 1 END,
         created_at ASC 
       LIMIT $1`,
      [availableSlots]
    );

    for (const job of pendingJobs) {
      if (this.activeJobs.has(job.id)) continue;
      if (this.activeJobs.size >= this.maxConcurrent) break;

      // Check if scheduled job should run now
      if (job.config?.schedule) {
        const shouldRun = this.checkSchedule(job.config.schedule, job.updated_at);
        if (!shouldRun) continue;
      }

      try {
        this.activeJobs.set(job.id, job);
        console.log(`[CrawlWorker:${this.workerId}] Starting job ${job.id}`);
        await startCrawlJob(job.id);
        this.emit('jobStarted', { jobId: job.id, workerId: this.workerId });

        // Monitor job completion (non-blocking)
        this.monitorJob(job.id);
      } catch (error) {
        console.error(`[CrawlWorker:${this.workerId}] Error starting job ${job.id}:`, error.message);
        this.activeJobs.delete(job.id);
        this.emit('jobError', { jobId: job.id, workerId: this.workerId, error: error.message });
      }
    }
  }

  async monitorJob(jobId) {
    const checkInterval = setInterval(async () => {
      try {
        const progress = await getCrawlProgress(jobId);
        const { rows: [job] } = await query('SELECT status FROM crawl_jobs WHERE id = $1', [jobId]);

        if (!job || ['completed', 'stopped', 'failed'].includes(job.status)) {
          clearInterval(checkInterval);
          this.activeJobs.delete(jobId);
          this.emit('jobCompleted', {
            jobId,
            workerId: this.workerId,
            status: job?.status || 'unknown',
            progress,
          });
          console.log(`[CrawlWorker:${this.workerId}] Job ${jobId} ${job?.status}`);
        }
      } catch (error) {
        clearInterval(checkInterval);
        this.activeJobs.delete(jobId);
      }
    }, 5000);
  }

  checkSchedule(cronExpression, lastRun) {
    try {
      const cronParser = require('cron-parser');
      const interval = cronParser.parseExpression(cronExpression);
      const prev = interval.prev().toDate();
      const now = new Date();
      // Run if last scheduled run was more than 2 minutes ago and not already running
      return !lastRun || (now - prev > 120000 && now - lastRun > 120000);
    } catch (e) {
      console.error(`[CrawlWorker] Invalid cron expression: ${cronExpression}`);
      return false;
    }
  }

  getStatus() {
    return {
      workerId: this.workerId,
      running: this.running,
      activeJobs: this.activeJobs.size,
      maxConcurrent: this.maxConcurrent,
      jobIds: Array.from(this.activeJobs.keys()),
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let workerInstance = null;

export function getCrawlWorker(options) {
  if (!workerInstance) {
    workerInstance = new CrawlWorkerManager(options);
  }
  return workerInstance;
}

export default CrawlWorkerManager;
