// ╔══════════════════════════════════════════════════════════════════╗
// ║  GOD MODE FINAL – Top 1 Infinity Premium Ultra Pro Max         ║
// ║  Wattpad API Crawler : Self-Healing, Bulk‑Optimized,           ║
// ║  Concurrent, Crash‑Proof, and Notification‑Driven              ║
// ╚══════════════════════════════════════════════════════════════════╝

import db from '@/lib/db';
import axios from 'axios';

// ─── Optional concurrency limiter (falls back to sequential) ─────
let pLimit;
try { pLimit = (await import('p-limit')).default; } catch (e) { pLimit = null; }

// ─── Configuration ──────────────────────────────────────────────
const BASE_API = 'https://www.wattpad.com/v4/stories';
const MAX_RETRIES = 4;                    // Increased resilience
const BASE_DELAY_MS = 1000;
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
];

// ─── Telemetry & Logging ────────────────────────────────────────
async function safeLog(jobId, level, message) {
  try {
    await db.query(
      'INSERT INTO crawl_logs (job_id, level, message, created_at) VALUES ($1, $2, $3, NOW())',
      [jobId, level, message]
    );
  } catch (e) {
    console.error(`[TELEMETRY CRASH] ${level}: ${message} | Error: ${e.message}`);
  }
}

async function notifyTelegram(jobName, status, metrics = {}) {
  try {
    const { rows: [config] } = await db.query(
      'SELECT bot_token, chat_id FROM telegram_configs WHERE is_active = true LIMIT 1'
    );
    if (!config) return;

    const statusMap = {
      running:   { emoji: '🚀', title: 'ENGINE ACTIVATED' },
      completed: { emoji: '⚡', title: 'CRAWL COMPLETED' },
      failed:    { emoji: '🚨', title: 'CRITICAL FAILURE' }
    };
    const state = statusMap[status] || { emoji: 'ℹ️', title: status.toUpperCase() };

    let msg = `${state.emoji} <b>[ ${state.title} ]</b>\n───────────────────\n`;
    msg += `<b>📌 Target Job :</b> <code>${jobName}</code>\n`;
    msg += `<b>⏱️ Timestamp  :</b> <code>${new Date().toISOString()}</code>\n`;
    if (metrics.pagesProcessed !== undefined) msg += `<b>📄 Depth Level :</b> <code>${metrics.pagesProcessed} Pages</code>\n`;
    if (metrics.totalStories !== undefined) msg += `<b>📥 Data Loaded :</b> <code>${metrics.totalStories} Stories Bulk-Saved</code>\n`;
    if (metrics.reason) msg += `───────────────────\n<b>⚠️ Diagnosis :</b>\n<code>${metrics.reason.substring(0, 300)}</code>\n`;
    msg += `───────────────────\n<i>⚡ Powered by God Mode Final Crawler Engine</i>`;

    await axios.post(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      chat_id: config.chat_id,
      text: msg,
      parse_mode: 'HTML'
    }, { timeout: 8000 });
  } catch (e) {
    console.error('[TELEGRAM API EXCEPTION]', e.message);
  }
}

// ─── Retry with exponential backoff ────────────────────────────
async function withRetry(fn, context = '', retries = MAX_RETRIES, baseDelay = BASE_DELAY_MS) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelay * 2 ** attempt + Math.random() * 500;
      console.warn(`[ENGINE RETRY] ${context} – Attempt ${attempt + 1}/${retries} in ${delay.toFixed(0)}ms: ${error.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * GOD MODE FINAL – Wattpad API Crawl
 * @param {string} jobId
 * @param {string} url (ignored)
 */
export async function startWattpadCrawl(jobId, url) {
  let jobName = 'System Job';
  let totalStoriesSaved = 0;
  let pagesIterated = 0;

  try {
    // 1. Transition to running
    await withRetry(() => db.query("UPDATE crawl_jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [jobId]), 'State-Running');

    const { rows: [job] } = await withRetry(() => db.query('SELECT name, config FROM crawl_jobs WHERE id = $1', [jobId]), 'FetchConfig');
    if (job?.name) jobName = job.name;
    const config = job?.config || {};

    const lang = config.language || '20';
    const limit = Math.min(config.limit || 50, 50);
    const maxPages = config.maxPages || 5;
    const tag = config.tag || '';
    const maxStories = config.maxStories || 0;        // 0 = unlimited
    const concurrency = Math.min(config.concurrency || 5, 10); // throttle
    const batchSize = config.batchSize || 50;           // bulk insert chunk size

    // Use p-limit if available, else sequential
    const limitConcurrency = pLimit ? pLimit(concurrency) : (fn) => fn();

    await safeLog(jobId, 'info', `🚀 God Mode Engine Engaged. Lang: ${lang}, MaxDepth: ${maxPages}, Batch: ${batchSize}, Concurrency: ${concurrency}`);
    await notifyTelegram(jobName, 'running');

    // 2. Main crawl loop – pages
    for (let page = 0; page < maxPages; page++) {
      pagesIterated++;
      const offset = page * limit;
      let apiUrl = `${BASE_API}?language=${lang}&limit=${limit}&offset=${offset}`;
      if (tag) apiUrl += `&tag=${encodeURIComponent(tag)}`;

      await safeLog(jobId, 'info', `🔍 Page ${pagesIterated}/${maxPages} | offset=${offset}`);

      const data = await withRetry(
        () => axios.get(apiUrl, {
          headers: { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] },
          timeout: 18000,
        }).then(res => res.data),
        `Fetch-Offset-${offset}`
      );

      const fetchedStories = data.stories || [];
      if (fetchedStories.length === 0) {
        await safeLog(jobId, 'info', 'Empty API response, stopping.');
        break;
      }

      // Concurrent processing with p-limit
      const tasks = fetchedStories.map(story =>
        limitConcurrency(async () => {
          const storyId = String(story.id);
          const title = story.title || 'Untitled';
          const description = (story.description || '').substring(0, 800);
          const coverUrl = story.cover || '';
          const author = story.user?.name || 'Unknown';
          const storyUrl = story.url || `https://www.wattpad.com/story/${story.id}`;

          // Atomic upsert (single story, but we will batch later)
          return { storyId, title, description, coverUrl, author, storyUrl };
        })
      );

      const processed = await Promise.all(tasks);

      // Bulk upsert in chunks of batchSize
      for (let i = 0; i < processed.length; i += batchSize) {
        const chunk = processed.slice(i, i + batchSize);
        const values = [];
        const params = [];
        let idx = 1;
        for (const item of chunk) {
          params.push(item.storyId, item.title, item.description, item.coverUrl, item.author, item.storyUrl);
          values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5})`);
          idx += 6;
        }
        const query = `
          INSERT INTO wattpad_cache (story_id, title, description, cover_url, author, url, updated_at)
          VALUES ${values.join(', ')}
          ON CONFLICT (story_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            cover_url = EXCLUDED.cover_url,
            author = EXCLUDED.author,
            url = EXCLUDED.url,
            updated_at = NOW()
        `;
        await withRetry(() => db.query(query, params), `BulkUpsert-${pagesIterated}-${i}`);
      }

      totalStoriesSaved += processed.length;
      await safeLog(jobId, 'info', `📊 Synced ${processed.length} stories. Total so far: ${totalStoriesSaved}`);

      // Stop if maxStories limit reached
      if (maxStories > 0 && totalStoriesSaved >= maxStories) {
        await safeLog(jobId, 'info', `🛑 Reached maxStories limit (${maxStories}). Terminating.`);
        break;
      }

      // Politeness delay
      await new Promise(r => setTimeout(r, 1800 + Math.random() * 1500));
    }

    // 3. Success
    await withRetry(() => db.query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]), 'State-Completed');
    await safeLog(jobId, 'info', `🏁 God Mode Finished. Records: ${totalStoriesSaved}`);
    await notifyTelegram(jobName, 'completed', { pagesProcessed: pagesIterated, totalStories: totalStoriesSaved });

  } catch (fatalError) {
    console.error('[GOD MODE CRASH]', fatalError);
    try {
      await db.query("UPDATE crawl_jobs SET status = 'failed', updated_at = NOW() WHERE id = $1", [jobId]);
    } catch (dbErr) {
      console.error('[FATAL DB DISCONNECT]', dbErr.message);
    }
    await safeLog(jobId, 'error', `CRITICAL: ${fatalError.message}`);
    await notifyTelegram(jobName, 'failed', { pagesProcessed: pagesIterated, totalStories: totalStoriesSaved, reason: fatalError.message });
  }
}
