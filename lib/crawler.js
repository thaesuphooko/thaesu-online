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
  maxProducts: 500,
  useSitemap: true,
  productUrlPatterns: ["/product/", "/item/", "/products/"],
};

async function log(jobId, msg, level = 'info') {
  await query('INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)', [jobId, level, msg]).catch(() => {});
}

async function getJobConfig(jobId) {
  const res = await query('SELECT config FROM crawl_jobs WHERE id = $1', [jobId]);
  return { ...DEFAULT_CONFIG, ...(res.rows[0]?.config || {}) };
}

// Fetch HTML with random User-Agent
async function fetchHTML(url) {
  const headers = { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)], 'Accept-Language': 'en-US,en;q=0.9' };
  const resp = await axios.get(url, { headers, timeout: 20000 });
  return resp.data;
}

// Extract all links from a page that match product patterns
function extractProductLinks(html, baseUrl, config) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const absolute = new URL(href, baseUrl).href;
      if (config.productUrlPatterns.some(p => absolute.includes(p))) {
        links.add(absolute);
      }
    } catch {}
  });
  return [...links];
}

// Get all product URLs from a single sitemap URL (supports both urlset and sitemapindex)
async function processSitemapUrl(sitemapUrl, config, collectedUrls = new Set()) {
  try {
    const html = await fetchHTML(sitemapUrl);
    const $ = cheerio.load(html, { xmlMode: true });
    
    // Standard URLs
    $('url loc').each((i, el) => {
      const loc = $(el).text().trim();
      if (loc && config.productUrlPatterns.some(p => loc.includes(p))) {
        collectedUrls.add(loc);
      }
    });
    
    // Nested sitemaps
    $('sitemap loc').each(async (i, el) => {
      const loc = $(el).text().trim();
      if (loc) await processSitemapUrl(loc, config, collectedUrls);
    });
  } catch (e) {}
  return collectedUrls;
}

// Try to find all product URLs from a website (sitemap first, then crawl homepage)
async function discoverProductUrls(jobId, baseUrl, config) {
  let allUrls = new Set();

  // 1. Try sitemap
  if (config.useSitemap) {
    const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap_products.xml', '/sitemap-products.xml'];
    for (const candidate of candidates) {
      try {
        const sitemapUrl = new URL(candidate, baseUrl).href;
        await log(jobId, `🔍 Trying sitemap: ${sitemapUrl}`);
        await processSitemapUrl(sitemapUrl, config, allUrls);
        if (allUrls.size > 0) {
          await log(jobId, `✅ Found ${allUrls.size} product URLs from sitemap`);
          break;
        }
      } catch (e) {}
    }
  }

  // 2. Fallback: crawl homepage and category pages
  if (allUrls.size === 0) {
    await log(jobId, 'Sitemap empty, crawling homepage for links...');
    const homeHtml = await fetchHTML(baseUrl);
    const homeLinks = extractProductLinks(homeHtml, baseUrl, config);
    homeLinks.forEach(url => allUrls.add(url));
    await log(jobId, `Found ${allUrls.size} product links on homepage`);
  }

  return [...allUrls];
}

async function crawlJob(jobId) {
  const config = await getJobConfig(jobId);
  await query("UPDATE crawl_jobs SET status = 'running', updated_at = NOW() WHERE id = $1", [jobId]);
  
  const job = await query('SELECT start_url FROM crawl_jobs WHERE id = $1', [jobId]);
  const baseUrl = job.rows[0].start_url;

  const productUrls = await discoverProductUrls(jobId, baseUrl, config);
  
  if (productUrls.length === 0) {
    await log(jobId, 'No product URLs found. Try a different website or use /dashboard/scrape for single URLs.');
    await query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]);
    return;
  }

  // Limit to maxProducts
  const urlsToScrape = productUrls.slice(0, config.maxProducts);
  await log(jobId, `Starting to scrape ${urlsToScrape.length} products...`);

  let productCount = 0;
  for (const url of urlsToScrape) {
    const statusRes = await query('SELECT status FROM crawl_jobs WHERE id = $1', [jobId]);
    if (statusRes.rows[0].status !== 'running') break;

    try {
      await scrapeAndSave(url, null, null);
      productCount++;
      await log(jobId, `✅ (${productCount}/${urlsToScrape.length}) Saved: ${url}`);
    } catch (err) {
      await log(jobId, `❌ Failed: ${url} (${err.message})`, 'error');
    }

    const delay = Math.floor(Math.random() * (config.delay.max - config.delay.min + 1) + config.delay.min);
    await new Promise(r => setTimeout(r, delay));
  }

  await query("UPDATE crawl_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1", [jobId]);
  await log(jobId, `✅ Crawl completed — Products: ${productCount}`);
}

export async function startCrawlJob(jobId) {
  crawlJob(jobId).catch(console.error);
}

export async function stopCrawlJob(jobId) {
  await query("UPDATE crawl_jobs SET status = 'stopped', updated_at = NOW() WHERE id = $1", [jobId]);
}
