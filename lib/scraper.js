import axios from 'axios';
import { query } from './db.js';

async function getScrapingConfig() {
  const res = await query("SELECT value FROM config WHERE key = 'scraping_engine'");
  return res.rows[0]?.value || { enabled: false };
}

const PROXY_LIST = []; // ကိုယ့် Proxy တွေ ထည့်ပါ (ဥပမာ 'http://user:pass@ip:port')

async function scrapeWithProxy(targetUrl, proxy) {
  const axiosConfig = { timeout: 30000 };
  if (proxy) {
    const [protocol, rest] = proxy.split('://');
    const [auth, hostPort] = rest.split('@');
    const [host, port] = hostPort.split(':');
    axiosConfig.proxy = {
      protocol: protocol || 'http',
      host: host,
      port: parseInt(port),
    };
    if (auth) {
      const [username, password] = auth.split(':');
      axiosConfig.proxy.auth = { username, password };
    }
  }
  return axios.get(targetUrl, axiosConfig);
}

export async function scrapeURL(targetUrl) {
  const config = await getScrapingConfig();
  if (!config.enabled) {
    throw new Error('Scraping engine is disabled');
  }

  // If ScraperAPI key is set, use it (ignores proxy)
  if (config.scraper_api_key) {
    const scraperUrl = `http://api.scraperapi.com?api_key=${config.scraper_api_key}&url=${encodeURIComponent(targetUrl)}`;
    const response = await axios.get(scraperUrl, { timeout: 30000 });
    return response.data;
  }

  // Try proxies if rotation enabled and list not empty
  if (config.proxy_rotation && PROXY_LIST.length > 0) {
    const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
    try {
      const response = await scrapeWithProxy(targetUrl, proxy);
      return response.data;
    } catch (proxyErr) {
      console.warn('Proxy failed, trying direct:', proxyErr.message);
    }
  }

  // Direct request as fallback
  const response = await axios.get(targetUrl, { timeout: 30000 });
  return response.data;
}
