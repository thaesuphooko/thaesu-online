import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Configuration ─────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 15000;
const SCREENSHOT_DIR = './error-screenshots';
const REPORT_JSON = 'client-report-premium.json';
const REPORT_HTML = 'client-report-premium.html';

try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch (e) {}

// ─── Telegram Notification ─────────────────────────
let TELEGRAM_BOT_TOKEN = '';
let TELEGRAM_CHAT_ID = '';
try {
  const envContent = readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('TELEGRAM_BOT_TOKEN=')) TELEGRAM_BOT_TOKEN = line.split('=')[1]?.trim() || '';
    if (line.startsWith('TELEGRAM_CHAT_ID=')) TELEGRAM_CHAT_ID = line.split('=')[1]?.trim() || '';
  }
} catch (e) {}

async function sendTelegramAlert(pageUrl, errors) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const errorList = errors.slice(0, 3).map(e => `• ${e}`).join('%0A');
  const text = `🚨 <b>Client Error Detected</b>%0A📍 <code>${pageUrl}</code>%0A%0A${errorList}`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {}
}

// ─── Pages to test ─────────────────────────────────
const PAGES = [
  { url: '/', name: 'Home', criticalSelectors: ['h1', 'a[href="/products"]'] },
  { url: '/auth/login', name: 'Login', criticalSelectors: ['input[type="email"]', 'input[type="password"]'] },
  { url: '/dashboard', name: 'Dashboard', criticalSelectors: ['.space-y-8', 'h1'] },
  { url: '/dashboard/products', name: 'Admin Products', criticalSelectors: ['table', '.grid'] },
  { url: '/dashboard/crawl', name: 'Admin Crawl', criticalSelectors: ['.space-y-4', '.grid'] },
  { url: '/dashboard/telegram-config', name: 'Telegram Config', criticalSelectors: ['input', 'button'] },
  { url: '/profile', name: 'Profile', criticalSelectors: ['h1', 'img'] },
  { url: '/profile/settings', name: 'Profile Settings', criticalSelectors: ['input[name="full_name"]', 'button[type="submit"]'] },
  { url: '/subscriptions', name: 'Subscriptions', criticalSelectors: ['.grid', 'h1'] },
  { url: '/products', name: 'Product Listing', criticalSelectors: ['.grid', 'a'] },
  { url: '/orders', name: 'Orders', criticalSelectors: ['.space-y-4', 'h1'] },
];

// ─── Scan a single page ────────────────────────────
async function testPage(pageInfo) {
  const { url, name, criticalSelectors } = pageInfo;
  const start = Date.now();
  const errors = [];
  const warnings = [];
  let status = 0;
  let html = '';
  let loadTime = 0;

  try {
    const res = await fetch(`${BASE_URL}${url}`, { timeout: TIMEOUT });
    status = res.status;
    html = await res.text();
    loadTime = Date.now() - start;
  } catch (e) {
    return { url, name, status: 0, loadTime: 0, errors: [`Fetch error: ${e.message}`], warnings: [], missingElements: [], passed: false };
  }

  // Parse HTML with JSDOM
  const virtualConsole = new JSDOM.VirtualConsole();
  const domErrors = [];
  virtualConsole.on('error', (msg) => domErrors.push(msg));
  virtualConsole.on('jsdomError', (msg) => domErrors.push(msg));

  const dom = new JSDOM(html, {
    url: BASE_URL + url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });

  // Wait for React to render and async code to finish
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { document, window: w } = dom;

  // 1. Check for inline server errors
  const bodyText = document.body?.innerHTML || '';
  if (bodyText.includes('Internal Server Error') || bodyText.includes('Application error')) {
    errors.push('Server error detected in page body');
  }

  // 2. Check critical selectors
  const missingElements = [];
  if (criticalSelectors) {
    for (const sel of criticalSelectors) {
      const elem = document.querySelector(sel);
      if (!elem) missingElements.push(sel);
    }
  }
  if (missingElements.length > 0) errors.push(`Missing elements: ${missingElements.join(', ')}`);

  // 3. Collect console errors (from scripts)
  for (const e of domErrors) {
    errors.push(`Console: ${e}`);
  }

  // 4. Check for React error messages in the page
  const reactErrorTexts = ['Something went wrong', 'An error occurred', 'Failed to load', 'TypeError', 'ReferenceError'];
  for (const errText of reactErrorTexts) {
    if (bodyText.includes(errText)) {
      errors.push(`Client error: "${errText}" found in page`);
    }
  }

  // 5. Check for empty content
  const textContent = document.body?.textContent?.trim() || '';
  if (textContent.length < 20) {
    warnings.push('Page body appears empty or has very little content');
  }

  // 6. Performance check
  if (loadTime > 5000) {
    warnings.push(`Slow load: ${loadTime}ms`);
  }

  // 7. Save screenshot (HTML source) if errors exist
  let screenshotFile = null;
  if (errors.length > 0) {
    screenshotFile = join(SCREENSHOT_DIR, `${name.replace(/\s+/g, '_')}_${Date.now()}.html`);
    writeFileSync(screenshotFile, html);
  }

  if (errors.length > 0) sendTelegramAlert(url, errors);
  w.close();

  return { url, name, status, loadTime, errors, warnings, missingElements, screenshot: screenshotFile, passed: errors.length === 0 && status < 400 };
}

// ─── Main ──────────────────────────────────────────
(async () => {
  console.log(`\n🚀 Infinity Premium Client Scanner – ${BASE_URL}`);
  console.log(`📄 Testing ${PAGES.length} pages (sequential)\n`);

  const report = [];
  for (const page of PAGES) {
    const result = await testPage(page);
    report.push(result);
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} [${result.status}] ${result.name} (${result.loadTime}ms)`);
    if (result.errors.length) console.log('   Errors:', result.errors.slice(0, 2).join(' | '));
  }

  writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));

  const passed = report.filter(r => r.passed).length;
  const failed = report.filter(r => !r.passed).length;
  console.log(`\n📊 Total: ${report.length} | ✅ ${passed} passed | ❌ ${failed} failed`);
  console.log(`   Report: ${REPORT_JSON}`);
  console.log(`   Screenshots: ${SCREENSHOT_DIR}/`);
})();
