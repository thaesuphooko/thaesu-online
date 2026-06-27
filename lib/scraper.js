import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';

async function getScrapingConfig() {
  const res = await query("SELECT value FROM config WHERE key = 'scraping_engine'");
  return res.rows[0]?.value || { enabled: false };
}

const PROXY_LIST = [];

// Human-like headers pool
const HEADERS_POOL = [
  { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
  { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', 'Accept-Language': 'en-GB,en;q=0.8' },
  { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.7' },
];

function randomHeaders() {
  return HEADERS_POOL[Math.floor(Math.random() * HEADERS_POOL.length)];
}

export async function scrapeURL(targetUrl) {
  const config = await getScrapingConfig();
  if (!config.enabled) throw new Error('Scraping engine is disabled');

  const headers = randomHeaders();
  let axiosConfig = { headers, timeout: 30000 };

  if (config.scraper_api_key) {
    const scraperUrl = `http://api.scraperapi.com?api_key=${config.scraper_api_key}&url=${encodeURIComponent(targetUrl)}`;
    const resp = await axios.get(scraperUrl, { timeout: 30000 });
    return extractProductData(resp.data, targetUrl);
  }

  if (config.proxy_rotation && PROXY_LIST.length > 0) {
    const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
    axiosConfig.proxy = proxy;
  }

  const resp = await axios.get(targetUrl, axiosConfig);
  return extractProductData(resp.data, targetUrl);
}

function extractProductData(html, pageUrl) {
  const $ = cheerio.load(html);
  const product = { title: '', price: '', description: '', images: [], variants: [], category: '', tags: [] };

  // 1. JSON-LD structured data
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      if (data['@type'] === 'Product') {
        product.title = data.name;
        product.price = data.offers?.price;
        product.description = data.description;
        product.images = data.image ? (Array.isArray(data.image) ? data.image : [data.image]) : [];
        if (data.category) product.category = data.category;
      }
    } catch {}
  }

  // 2. Fallback meta tags
  if (!product.title) product.title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim();
  if (!product.price) product.price = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content') || $('.price, .product-price, [data-price]').first().text().replace(/[^0-9.]/g, '').trim();
  if (!product.description) product.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('p').first().text().trim();

  // 3. Images (all visible product images)
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('banner')) {
      if (product.images.length < 10) product.images.push(src);
    }
  });
  if (product.images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) product.images.push(ogImg);
  }

  // 4. Breadcrumbs / category
  const breadcrumb = [];
  $('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a').each((i, el) => breadcrumb.push($(el).text().trim()));
  if (breadcrumb.length > 0) product.category = breadcrumb.join(' > ');

  // 5. Variants (sizes, colors)
  $('select, .variant-selector option').each((i, el) => {
    const variant = $(el).text().trim();
    if (variant && !product.variants.includes(variant)) product.variants.push(variant);
  });

  // 6. Tags (from meta or product tags)
  $('meta[name="keywords"]').attr('content')?.split(',').forEach(t => product.tags.push(t.trim()));
  $('.tag, .product-tag').each((i, el) => product.tags.push($(el).text().trim()));

  return product;
}

export async function scrapeAndSave(targetUrl, vendorId, category) {
  const data = await scrapeURL(targetUrl);
  if (!data.title) throw new Error('Could not extract product data');

  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  const price = parseFloat(data.price) || 0;

  const result = await query(
    `INSERT INTO products (vendor_id, title, slug, description, price, category, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [vendorId || null, data.title, slug, data.description || '', price, category || data.category || null, data.tags]
  );
  const product = result.rows[0];

  // Save images to media table
  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      await query(
        `INSERT INTO media (product_id, cloudinary_public_id, cloudinary_url, cloudinary_account, media_type, sort_order)
         VALUES ($1, $2, $3, 'direct', 'image', $4)`,
        [product.id, data.images[i], data.images[i], i]
      );
    }
  }

  // Save variants as product attributes (JSONB)
  if (data.variants && data.variants.length > 0) {
    await query('UPDATE products SET attributes = jsonb_set(attributes, $1, $2) WHERE id = $3',
      ['{variants}', JSON.stringify(data.variants), product.id]);
  }

  return product;
}
