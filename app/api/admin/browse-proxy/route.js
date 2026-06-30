export const dynamic = 'force-dynamic';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      responseType: 'text',
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: status => status < 500,
    });

    let html = response.data;
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

    // Enhanced injection script – accurate extraction with fallbacks
    const injectionScript = `
<script>
(function() {
  function extractProductData() {
    const data = { title: '', price: '', description: '', images: [], url: window.location.href };
    // JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const parsed = JSON.parse(jsonLd.textContent);
        if (parsed['@type'] === 'Product') {
          data.title = parsed.name || '';
          if (parsed.offers) {
            const offer = Array.isArray(parsed.offers) ? parsed.offers[0] : parsed.offers;
            data.price = offer.price ? String(offer.price) : '';
          }
          data.description = parsed.description || '';
          if (parsed.image) {
            data.images = Array.isArray(parsed.image) ? parsed.image : [parsed.image];
          }
        }
      } catch(e) {}
    }
    // Meta/fallback title
    if (!data.title) data.title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.querySelector('h1')?.innerText?.trim() || document.title;
    // Price: check multiple selectors, content attribute, innerText
    if (!data.price) {
      const priceSel = '[itemprop="price"], .price, .product-price, .product-single__price, .product__price, .product__current-price, .price-item--regular, .pro-price, .sales-price, .current-price';
      const priceEl = document.querySelector(priceSel);
      if (priceEl) {
        let priceText = priceEl.getAttribute('content') || priceEl.innerText || priceEl.textContent;
        // Remove non-numeric except dot
        data.price = priceText.replace(/[^0-9.]/g, '');
      }
      if (!data.price) {
        // Search entire body for price pattern (e.g., 12,345 Ks)
        const bodyText = document.body.innerText;
        const match = bodyText.match(/([\\d,]+)\\s?(Ks|MMK|Kyat|ks|mmk|kyat)/i);
        if (match) data.price = match[1].replace(/,/g, '');
      }
    }
    // Description
    if (!data.description) data.description = document.querySelector('meta[name="description"]')?.getAttribute('content') || document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    // Images: collect from src, data-src, data-lazy, srcset
    const imgSet = new Set();
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy');
      if (src && src.startsWith('http') && !src.match(/(logo|icon|placeholder|avatar)/i)) {
        imgSet.add(src);
      }
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(part => {
          const url = part.trim().split(' ')[0];
          if (url.startsWith('http')) imgSet.add(url);
        });
      }
    });
    if (imgSet.size === 0) {
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImg) imgSet.add(ogImg);
    }
    data.images = Array.from(imgSet).slice(0, 10);
    return data;
  }

  function sendData() {
    const data = extractProductData();
    if (data.title) {
      window.parent.postMessage({ type: 'PRODUCT_DATA', data }, '*');
    }
  }

  // Run after page fully loaded (2 seconds delay to allow dynamic content)
  setTimeout(sendData, 1000);

  // Also observe URL changes (for SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(sendData, 1000);
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
</script>`;

    if ($('head').length) {
      $('head').append(injectionScript);
    } else {
      $('body').prepend(injectionScript);
    }

    const modifiedHtml = $.html();
    return new Response(modifiedHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(`Error fetching page: ${err.message}`, { status: 500 });
  }
}

export async function POST(request) {
  return Response.redirect(new URL(request.url).searchParams.get('redirect') || '/dashboard/browser', 302);
}
