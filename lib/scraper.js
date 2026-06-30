import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';

function cleanPrice(text) {
  if (!text) return null;
  let cleaned = text.replace(/[^0-9.]/g, '');
  cleaned = cleaned.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export async function scrapeAndSave(targetUrl, vendorId, category) {
  // Fetch with retry and longer timeout
  let html;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      };
      const resp = await axios.get(targetUrl, { headers, timeout: 30000 });
      html = resp.data;
      break;
    } catch (err) {
      if (attempt === 3) throw new Error(`Failed after 3 attempts: ${err.message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }

  const $ = cheerio.load(html);

  // 1. Title from JSON-LD, meta, h1
  let title = '';
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product') {
        title = data.name;
        return false;
      }
    } catch {}
  });
  if (!title) title = $('meta[property="og:title"]').attr('content');
  if (!title) title = $('h1').first().text().trim();
  if (!title) title = $('title').text().trim();
  if (!title || title.length < 3) throw new Error('No title found');

  // 2. Price – JSON-LD, meta, itemprops, common classes
  let price = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product' && data.offers) {
        const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        price = cleanPrice(offer.price);
        if (price) return false;
      }
    } catch {}
  });
  if (!price) price = cleanPrice($('meta[property="product:price:amount"]').attr('content'));
  if (!price) price = cleanPrice($('[itemprop="price"]').attr('content'));
  if (!price) {
    const selectors = '.price, .product-price, .product-single__price, .product__price, .sales-price, .current-price, [data-price]';
    const el = $(selectors).first();
    if (el.length) price = cleanPrice(el.text() || el.attr('content'));
  }
  price = price || 0;

  // 3. Description
  let description = '';
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product' && data.description) {
        description = data.description;
        return false;
      }
    } catch {}
  });
  if (!description) description = $('meta[name="description"]').attr('content');
  if (!description) description = $('meta[property="og:description"]').attr('content');
  if (!description) description = $('p').first().text().trim();

  // 4. Images – collect from src, data-src, data-lazy, srcset
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
    if (src && src.startsWith('http') && !src.match(/(logo|icon|placeholder|avatar)/i)) {
      images.push(src);
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      srcset.split(',').forEach(part => {
        const url = part.trim().split(' ')[0];
        if (url.startsWith('http')) images.push(url);
      });
    }
  });
  if (images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) images.push(ogImg);
  }
  const uniqueImages = [...new Set(images)].slice(0, 10);

  // Save to DB
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 80) + '-' + Date.now().toString(36);
  const productRes = await query(
    `INSERT INTO products (title, slug, description, price, category, vendor_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, slug, description || '', price, category || null, vendorId || null]
  );
  const product = productRes.rows[0];

  if (uniqueImages.length > 0) {
    for (let i = 0; i < uniqueImages.length; i++) {
      await query(
        `INSERT INTO media (product_id, cloudinary_public_id, cloudinary_url, cloudinary_account, media_type, sort_order) VALUES ($1,$2,$3,'direct','image',$4)`,
        [product.id, uniqueImages[i], uniqueImages[i], i]
      );
    }
  }
  return product;
}
