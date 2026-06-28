import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from './db.js';

export async function scrapeAndSave(targetUrl, vendorId, category) {
  const resp = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
  const $ = cheerio.load(resp.data);
  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
  const price = $('meta[property="product:price:amount"]').attr('content') || $('.price').first().text().replace(/[^0-9.]/g, '');
  const description = $('meta[property="og:description"]').attr('content') || $('p').first().text().trim();
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http') && images.length < 5) images.push(src);
  });

  if (!title) throw new Error('No title found');

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
  const res = await query(
    `INSERT INTO products (title, slug, description, price, category, vendor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, slug, description || '', parseFloat(price) || 0, category || null, vendorId || null]
  );
  const product = res.rows[0];

  if (images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      await query(
        `INSERT INTO media (product_id, cloudinary_public_id, cloudinary_url, cloudinary_account, media_type, sort_order)
         VALUES ($1, $2, $3, 'direct', 'image', $4)`,
        [product.id, images[i], images[i], i]
      );
    }
  }
  return product;
}
