import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';
import { scrapeAndSave } from './scraper.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

const DEFAULT_CONFIG = {
  delay: { min: 3000, max: 7000 },
  maxPages: 500,
  useSitemap: true,
  productUrlPatterns: ["/product/", "/item/"],
  categoryUrlPatterns: ["/category/", "/collections/"],
  excludePatterns: ["cart", "checkout", "login", ".jpg", ".png"],
};

const runningJobs = new Map();

async function log(jobId, msg, level = 'info') {
  await query('INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)', [jobId, level, msg]).catch(() => {});
}

async function getJobConfig(jobId) {
  const res = await query('SELECT config FROM crawl_jobs WHERE id = $1', [jobId]);
  return { ...DEFAULT_CONFIG, ...(res.rows[0]?.config || {}) };
}

async function fetchHTML(url) {
  const headers = { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] };
  const resp = await axios.get(url, { headers, timeout: 20000 });
  return resp.data;
}

async function fetchSitemapUrls(jobId, baseUrl, config) {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_products.xml'];
  for (const candidate of candidates) {
    try {
      const sitemapUrl = new URL(candidate, baseUrl).href;
      const html = await fetchHTML(sitemapUrl);
      const $ = cheerio.load(html, { xmlMode: true });
      const urls = [];
      $('url loc').each((i, el) => {
        const loc = $(el).text().trim();
        if (config.productUrlPatterns.some(p => loc.includes(p))) urls.push(loc);
      });
      if (urls.length > 0) {
        await log(jobId, `Found ${urls.length} product URLs in sitemap: ${candidate}`);
        return urls;
      }
    } catch (e) { /* ignore */ }
  }
  return [];
}

async function crawlJob(jobId) {
  const config = await getJobConfig(jobId);
  await query("UPDATE crawl_jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [jobId]);

  const job = await query('SELECT start_url FROM crawl_jobs WHERE id = $1', [jobId]);
  const baseUrl = job.rows[0].start_url;

  // Seed from sitemap or homepage
  let productUrls = [];
  if (config.useSitemap) {
    productUrls = await fetchSitemapUrls(jobId, baseUrl, config);
  }
  if (productUrls.length === 0) {
    await log(jobId, 'No sitemap found, crawling homepage for product links...');
    const html = await fetchHTML(baseUrl);
    const $ = cheerio.load(html);
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && config.productUrlPatterns.some(p => href.includes(p))) {
        try {
          productUrls.push(new URL(href, baseUrl).href);
        } catch {}
      }
    });
    productUrls = [...new Set(productUrls)];
    await log(jobId, `Found ${productUrls.length} product links on homepage`);
  }

  for (const url of productUrls.slice(0, config.maxPages)) {
    const statusRes = await query('SELECT status FROM crawl_jobs WHERE id = $1', [jobId]);
    if (statusRes.rows[0].status !== 'running') break;

    try {
      await scrapeAndSave(url, null, null);
      await log(jobId, `✅ Saved: ${url}`);
    } catch (err) {
      await log(jobId, `❌ Failed: ${url} (${err.message})`, 'error');
    }

    const delay = Math.floor(Math.random() * (config.delay.max - config.delay.min + 1) + config.delay.min);
    await new Promise(r => setTimeout(r, delay));
  }

  await query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]);
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
