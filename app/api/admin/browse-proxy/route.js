export const dynamic = 'force-dynamic';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.ADMIN_HASH) {
    const headerSecret = request.headers.get('x-admin-secret');
    if (headerSecret !== process.env.ADMIN_HASH) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  let targetUrl = searchParams.get('url');
  if (!targetUrl) return new Response('Missing url parameter', { status: 400 });
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  try {
    const response = await client.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      responseType: 'text',
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: status => status < 500,
    });

    let html = response.data;
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      return new Response(html, { headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' } });
    }

    const $ = cheerio.load(html);
    const baseUrl = new URL(targetUrl);

    const rewriteAttribute = (el, attr) => {
      let val = $(el).attr(attr);
      if (!val) return;
      if (val.startsWith('/api/admin/browse-proxy') || val.startsWith('/api/proxy-image')) return;
      try {
        const absolute = new URL(val, baseUrl).href;
        if (attr === 'src' && $(el).is('img')) {
          $(el).attr(attr, `/api/proxy-image?url=${encodeURIComponent(absolute)}`);
        } else {
          $(el).attr(attr, `/api/admin/browse-proxy?url=${encodeURIComponent(absolute)}&secret=${secret}`);
        }
      } catch (e) {}
    };

    $('a[href]').each((i, el) => { rewriteAttribute(el, 'href'); });
    $('link[href]').each((i, el) => { rewriteAttribute(el, 'href'); });
    $('img[src]').each((i, el) => { rewriteAttribute(el, 'src'); });
    $('script[src]').each((i, el) => { rewriteAttribute(el, 'src'); });
    $('form[action]').each((i, el) => { rewriteAttribute(el, 'action'); });
    $('img[srcset]').each((i, el) => {
      let srcset = $(el).attr('srcset');
      if (!srcset) return;
      const parts = srcset.split(',').map(part => {
        const [url, size] = part.trim().split(/\s+/);
        try {
          const absolute = new URL(url, baseUrl).href;
          return `/api/proxy-image?url=${encodeURIComponent(absolute)} ${size || ''}`;
        } catch { return part; }
      });
      $(el).attr('srcset', parts.join(', '));
    });

    $('meta[http-equiv="X-Frame-Options"]').remove();
    $('meta[http-equiv="Content-Security-Policy"]').remove();

    // Injection script (same as before)
    const injectionScript = `
<script>
(function() {
  let lastUrl = window.location.href;
  let lastDataSent = '';
  function extractProductData() {
    const data = { title: '', price: '', description: '', images: [], url: window.location.href };
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const parsed = JSON.parse(jsonLd.textContent);
        if (parsed['@type'] === 'Product') {
          data.title = parsed.name || '';
          data.price = parsed.offers?.price || '';
          data.description = parsed.description || '';
          if (parsed.image) data.images = Array.isArray(parsed.image) ? parsed.image : [parsed.image];
        }
      } catch(e) {}
    }
    if (!data.title) data.title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.querySelector('h1')?.innerText?.trim() || document.title;
    if (!data.price) {
      const priceEl = document.querySelector('[itemprop="price"]') || document.querySelector('.price') || document.querySelector('[class*="price"]');
      if (priceEl) data.price = priceEl.getAttribute('content') || priceEl.innerText.replace(/[^0-9.]/g, '');
    }
    if (!data.description) data.description = document.querySelector('meta[name="description"]')?.getAttribute('content') || document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      let originalSrc = src;
      if (src && src.startsWith('/api/proxy-image?url=')) {
        originalSrc = decodeURIComponent(src.split('url=')[1].split('&')[0]);
      }
      if (originalSrc && originalSrc.startsWith('http') && !originalSrc.match(/(logo|icon|placeholder|avatar)/i) && data.images.length < 10) {
        data.images.push(originalSrc);
      }
    });
    return data;
  }
  function sendData() {
    const data = extractProductData();
    if (data.title && data.title !== lastDataSent) {
      window.parent.postMessage({ type: 'PRODUCT_DATA', data }, '*');
      lastDataSent = data.title;
    }
  }
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(sendData, 1000);
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  setTimeout(sendData, 1000);
})();
</script>`;

    if ($('head').length) {
      $('head').append(injectionScript);
    } else {
      $('body').prepend(injectionScript);
    }

    const modifiedHtml = $.html();
    return new Response(modifiedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(`Error fetching page: ${err.message}`, { status: 500 });
  }
}

export async function POST(request) {
  // Similar auth check for POST
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.ADMIN_HASH) {
    const headerSecret = request.headers.get('x-admin-secret');
    if (headerSecret !== process.env.ADMIN_HASH) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  let targetUrl = searchParams.get('url');
  if (!targetUrl) return new Response('Missing url parameter', { status: 400 });
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  try {
    const formData = await request.formData();
    await client.post(targetUrl, formData, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ...',
        'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
      },
      maxRedirects: 5,
      validateStatus: status => status < 500,
    });
    return Response.redirect(new URL(request.url).searchParams.get('redirect') || '/dashboard/browser', 302);
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
