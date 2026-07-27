import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';
import { scrapeAndSave } from './scraper.js'; // your product scraper
import pLimit from 'p-limit';
import crypto from 'crypto';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

const DEFAULT_CONFIG = {
  delay: { min: 1500, max: 6000 },
  maxPages: 500,
  useSitemap: true,
  concurrency: 3,
  productUrlPatterns: ['/product/', '/products/', '/item/', '/p/'],
  headers: USER_AGENTS,
  priorityKeywords: [],   // URLs containing these keywords get higher priority
  maxRetries: 2,
};

const runningJobs = new Map();

async function log(jobId, message, level = 'info') {
  await query('INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)', [jobId, level, message]).catch(() => {});
}

async function getJobConfig(jobId) {
  const res = await query('SELECT config FROM crawl_jobs WHERE id = $1', [jobId]);
  const cfg = res.rows[0]?.config || {};
  return { ...DEFAULT_CONFIG, ...cfg };
}

function urlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

async function fetchHTML(url, config) {
  const ua = config.headers[Math.floor(Math.random() * config.headers.length)];
  const resp = await axios.get(url, {
    headers: { 'User-Agent': ua, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.5', 'Referer': new URL(url).origin },
    timeout: 30000,
  });
  return resp.data;
}

// Compute priority based on config
function computePriority(url, config) {
  let prio = 0;
  if (config.priorityKeywords) {
    for (const kw of config.priorityKeywords) {
      if (url.includes(kw)) { prio += 10; break; }
    }
  }
  return prio;
}

async function fetchSitemapUrls(jobId, baseUrl, config) {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_products.xml', '/sitemap-products.xml'];
  for (const cand of candidates) {
    const sitemapUrl = new URL(cand, baseUrl).href;
    try {
      const html = await fetchHTML(sitemapUrl, config);
      const $ = cheerio.load(html, { xmlMode: true });
      let urls = [];
      $('url > loc').each((i, el) => {
        const loc = $(el).text().trim();
        if (loc && config.productUrlPatterns.some(p => loc.includes(p))) {
          urls.push({ url: loc, priority: computePriority(loc, config) });
        }
      });
      // Handle sitemap index recursively (simplified)
      $('sitemap > loc').each((i, el) => {
        const loc = $(el).text().trim();
        if (loc) {
          // In production we'd fetch recursively; here we skip for brevity.
        }
      });
      if (urls.length > 0) {
        await log(jobId, `✅ Found ${urls.length} product URLs from sitemap`);
        return urls;
      }
    } catch (e) {}
  }
  return [];
}

function extractProductLinks(html, baseUrl, config) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const absolute = new URL(href, baseUrl).href;
      if (config.productUrlPatterns.some(p => absolute.includes(p)) && !absolute.match(/\.(jpg|png|gif|css|js)/)) {
        links.add({ url: absolute, priority: computePriority(absolute, config) });
      }
    } catch {}
  });
  return [...links];
}

async function productExists(url) {
  const hash = urlHash(url);
  const res = await query('SELECT id FROM products WHERE slug = $1', [hash]);
  return res.rows.length > 0;
}

async function processProductUrl(jobId, item, config, stats) {
  const { url, id: queueId } = item;
  let retries = 0;
  while (retries <= config.maxRetries) {
    try {
      if (await productExists(url)) {
        await log(jobId, `⏭️ Skipped duplicate: ${url}`);
        await query("UPDATE crawl_queue SET status = 'done' WHERE id = $1", [queueId]);
        return;
      }
      await scrapeAndSave(url, null, null); // your scraper
      stats.productCount++;
      await log(jobId, `✅ Saved product: ${url}`);
      await query("UPDATE crawl_queue SET status = 'done' WHERE id = $1", [queueId]);
      // Telegram notification
      try {
        const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
        const chatId = process.env.TELEGRAM_USER_ID;
        if (token && chatId) {
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `🆕 New product: ${url}` }),
          }).catch(() => {});
        }
      } catch (e) {}
      break; // success
    } catch (err) {
      retries++;
      if (retries > config.maxRetries) {
        await log(jobId, `❌ Failed after ${config.maxRetries} retries: ${url} (${err.message})`, 'error');
        await query("UPDATE crawl_queue SET status = 'failed' WHERE id = $1", [queueId]);
        break;
      }
      await log(jobId, `🔄 Retry ${retries}/${config.maxRetries} for ${url}`, 'warn');
      await new Promise(r => setTimeout(r, 2000 * retries));
    }
  }
}

export async function startCrawlJob(jobId) {
  if (runningJobs.has(jobId)) throw new Error('Job already running');
  runningJobs.set(jobId, true);

  const config = await getJobConfig(jobId);
  await query("UPDATE crawl_queue SET status = 'pending' WHERE job_id = $1 AND status = 'processing'", [jobId]);
  await query("UPDATE crawl_jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [jobId]);
  await log(jobId, `🚀 Crawl started (concurrency: ${config.concurrency})`);

  const job = await query('SELECT start_url FROM crawl_jobs WHERE id = $1', [jobId]);
  const baseUrl = job.rows[0].start_url;

  // Seed queue if empty
  const { rows: [pending] } = await query("SELECT COUNT(*)::int FROM crawl_queue WHERE job_id = $1 AND status = 'pending'", [jobId]);
  if (pending.count === 0) {
    let productItems = [];
    if (config.useSitemap) {
      productItems = await fetchSitemapUrls(jobId, baseUrl, config);
    }
    if (productItems.length === 0) {
      await log(jobId, 'No sitemap found, crawling homepage...');
      const html = await fetchHTML(baseUrl, config);
      productItems = extractProductLinks(html, baseUrl, config);
    }
    const itemsToInsert = productItems.slice(0, config.maxPages);
    for (const item of itemsToInsert) {
      await query(
        'INSERT INTO crawl_queue (job_id, url, type, depth, priority, url_hash) VALUES ($1,$2,$3,0,$4,$5) ON CONFLICT (job_id, url) DO NOTHING',
        [jobId, item.url, 'product', item.priority || 0, urlHash(item.url)]
      );
    }
    await log(jobId, `📋 Queued ${itemsToInsert.length} URLs`);
  }

  const limit = pLimit(config.concurrency);
  const stats = { productCount: 0 };

  while (true) {
    const statusRes = await query('SELECT status FROM crawl_jobs WHERE id = $1', [jobId]);
    if (statusRes.rows[0]?.status !== 'running') break;

    // Fetch highest priority pending item
    const item = await query(
      "SELECT * FROM crawl_queue WHERE job_id = $1 AND status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1",
      [jobId]
    );
    if (item.rows.length === 0) break;

    const queueItem = item.rows[0];
    await query("UPDATE crawl_queue SET status = 'processing' WHERE id = $1", [queueItem.id]);
    await limit(() => processProductUrl(jobId, queueItem, config, stats));

    const delay = Math.floor(Math.random() * (config.delay.max - config.delay.min + 1) + config.delay.min);
    await new Promise(r => setTimeout(r, delay));
  }

  await query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]);
  await log(jobId, `✅ Crawl completed — Products: ${stats.productCount}`);
  runningJobs.delete(jobId);
}

export async function stopCrawlJob(jobId) {
  await query("UPDATE crawl_jobs SET status = 'stopped', updated_at = NOW() WHERE id = $1", [jobId]);
  runningJobs.delete(jobId);
}

export async function getCrawlProgress(jobId) {
  const total = await query("SELECT COUNT(*)::int FROM crawl_queue WHERE job_id = $1", [jobId]);
  const done = await query("SELECT COUNT(*)::int FROM crawl_queue WHERE job_id = $1 AND status = 'done'", [jobId]);
  const processing = await query("SELECT COUNT(*)::int FROM crawl_queue WHERE job_id = $1 AND status = 'processing'", [jobId]);
  const failed = await query("SELECT COUNT(*)::int FROM crawl_queue WHERE job_id = $1 AND status = 'failed'", [jobId]);
  return {
    total: total.rows[0].count,
    done: done.rows[0].count,
    processing: processing.rows[0].count,
    failed: failed.rows[0].count,
  };
}
