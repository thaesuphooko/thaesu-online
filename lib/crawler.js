import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';
import { scrapeAndSave } from './scraper.js';
import pLimit from 'p-limit';
import crypto from 'crypto';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const DEFAULT_CONFIG = {
  delay: { min: 5000, max: 15000 },
  maxPages: 1000,
  useSitemap: true,
  concurrency: 2,
  productUrlPatterns: ["/product/", "/products/", "/item/", "/p/"],
  headers: USER_AGENTS,
};

const runningJobs = new Map();

async function log(jobId, message, level = 'info') {
  await query('INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)', [jobId, level, message]).catch(() => {});
}

async function getJobConfig(jobId) {
  const res = await query('SELECT config FROM crawl_jobs WHERE id = $1', [jobId]);
  return { ...DEFAULT_CONFIG, ...(res.rows[0]?.config || {}) };
}

function md5Hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function fetchHTML(url, config) {
  const headers = {
    'User-Agent': config.headers[Math.floor(Math.random() * config.headers.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': new URL(url).origin,
  };
  const resp = await axios.get(url, { headers, timeout: 30000 });
  return resp.data;
}

// Recursive sitemap parser
async function fetchSitemapUrlsRecursive(jobId, sitemapUrl, config, visited = new Set()) {
  if (visited.has(sitemapUrl)) return [];
  visited.add(sitemapUrl);
  try {
    const html = await fetchHTML(sitemapUrl, config);
    const $ = cheerio.load(html, { xmlMode: true });
    let urls = [];
    const sitemapTags = $('sitemap > loc');
    if (sitemapTags.length > 0) {
      for (let i = 0; i < sitemapTags.length; i++) {
        const loc = $(sitemapTags[i]).text().trim();
        if (loc && loc.startsWith('http')) {
          const subUrls = await fetchSitemapUrlsRecursive(jobId, loc, config, visited);
          urls = urls.concat(subUrls);
        }
      }
    } else {
      $('url > loc').each((i, el) => {
        const loc = $(el).text().trim();
        if (loc && config.productUrlPatterns.some(p => loc.includes(p))) {
          urls.push(loc);
        }
      });
    }
    return urls;
  } catch (e) { return []; }
}

async function fetchSitemapUrls(jobId, baseUrl, config) {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_products.xml', '/sitemap-products.xml'];
  for (const candidate of candidates) {
    const sitemapUrl = new URL(candidate, baseUrl).href;
    const urls = await fetchSitemapUrlsRecursive(jobId, sitemapUrl, config);
    if (urls.length > 0) {
      await log(jobId, `✅ Found ${urls.length} product URLs from sitemap`);
      return urls;
    }
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
      if (config.productUrlPatterns.some(p => absolute.includes(p)) &&
          !absolute.match(/\.(jpg|png|gif|css|js)/)) {
        links.add(absolute);
      }
    } catch {}
  });
  return [...links];
}

async function productExists(url) {
  const hash = md5Hash(url);
  const res = await query('SELECT id FROM products WHERE slug = $1', [hash]);
  return res.rows.length > 0;
}

// Process a single product URL
async function processProductUrl(jobId, url, config, stats) {
  try {
    if (await productExists(url)) {
      await log(jobId, `⏭️ Skipped duplicate: ${url}`);
      return;
    }
    await scrapeAndSave(url, null, null);
    stats.productCount++;
    await log(jobId, `✅ Saved product: ${url}`);
    // Telegram notification (optional)
    const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
    const chatId = process.env.TELEGRAM_USER_ID;
    if (token && chatId) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `🆕 New product: ${url}` }),
      }).catch(() => {});
    }
  } catch (err) {
    await log(jobId, `❌ Failed: ${url} (${err.message})`, 'error');
  }
}

async function crawlJob(jobId) {
  const config = await getJobConfig(jobId);
  // Resume: reset any 'processing' items to 'pending'
  await query("UPDATE crawl_queue SET status = 'pending' WHERE job_id = $1 AND status = 'processing'", [jobId]);
  await query("UPDATE crawl_jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [jobId]);
  await log(jobId, `🚀 Crawl started (concurrency: ${config.concurrency})`);

  const job = await query('SELECT start_url FROM crawl_jobs WHERE id = $1', [jobId]);
  const baseUrl = job.rows[0].start_url;

  // Seed queue if empty
  const pendingCount = await query("SELECT COUNT(*) FROM crawl_queue WHERE job_id = $1 AND status = 'pending'", [jobId]);
  if (parseInt(pendingCount.rows[0].count) === 0) {
    let productUrls = [];
    if (config.useSitemap) {
      productUrls = await fetchSitemapUrls(jobId, baseUrl, config);
    }
    if (productUrls.length === 0) {
      await log(jobId, 'No sitemap found, crawling homepage...');
      const html = await fetchHTML(baseUrl, config);
      productUrls = extractProductLinks(html, baseUrl, config);
      await log(jobId, `Found ${productUrls.length} product links on homepage`);
    }
    for (const url of productUrls.slice(0, config.maxPages)) {
      await query('INSERT INTO crawl_queue (job_id, url, type, depth) VALUES ($1,$2,$3,0) ON CONFLICT (job_id, url) DO NOTHING', [jobId, url, 'product']);
    }
  }

  const limit = pLimit(config.concurrency);
  const stats = { productCount: 0 };

  // Process pending items in a loop
  while (true) {
    const jobStatus = await query('SELECT status FROM crawl_jobs WHERE id = $1', [jobId]);
    if (jobStatus.rows[0]?.status !== 'running') break;

    const item = await query("SELECT * FROM crawl_queue WHERE job_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT 1", [jobId]);
    if (item.rows.length === 0) break; // all done

    const queueItem = item.rows[0];
    await query("UPDATE crawl_queue SET status = 'processing' WHERE id = $1", [queueItem.id]);
    await limit(() => processProductUrl(jobId, queueItem.url, config, stats)).finally(async () => {
      await query("UPDATE crawl_queue SET status = 'done' WHERE id = $1", [queueItem.id]);
    });

    const delay = Math.floor(Math.random() * (config.delay.max - config.delay.min + 1) + config.delay.min);
    await new Promise(r => setTimeout(r, delay));
  }

  await query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]);
  await log(jobId, `✅ Crawl completed — Products: ${stats.productCount}`);
  runningJobs.delete(jobId);
}

export async function startCrawlJob(jobId) {
  if (runningJobs.has(jobId)) throw new Error('Already running');
  runningJobs.set(jobId, true);
  crawlJob(jobId).catch(console.error);
}

export async function stopCrawlJob(jobId) {
  await query("UPDATE crawl_jobs SET status = 'stopped', updated_at = NOW() WHERE id = $1", [jobId]);
  runningJobs.delete(jobId);
}

// Get progress of a crawl job
export async function getCrawlProgress(jobId) {
  const total = await query("SELECT COUNT(*) FROM crawl_queue WHERE job_id = $1", [jobId]);
  const done = await query("SELECT COUNT(*) FROM crawl_queue WHERE job_id = $1 AND status = 'done'", [jobId]);
  const processing = await query("SELECT COUNT(*) FROM crawl_queue WHERE job_id = $1 AND status = 'processing'", [jobId]);
  return {
    total: parseInt(total.rows[0].count),
    done: parseInt(done.rows[0].count),
    processing: parseInt(processing.rows[0].count),
  };
}
