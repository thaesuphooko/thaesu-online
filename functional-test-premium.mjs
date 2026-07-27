import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';

// ─── Config ──────────────────────────────────
let BASE = process.env.BASE_URL || 'http://localhost:3000';
let ADMIN_LOGIN = 'thaesuphooko@gmail.com';
let ADMIN_PASSWORD = 'step@2003';

try {
  const env = readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    if (line.startsWith('ADMIN_EMAIL=')) ADMIN_LOGIN = line.split('=')[1]?.trim() || ADMIN_LOGIN;
    if (line.startsWith('ADMIN_PASSWORD=')) ADMIN_PASSWORD = line.split('=')[1]?.trim() || ADMIN_PASSWORD;
    if (line.startsWith('TELEGRAM_BOT_TOKEN=')) process.env.TELEGRAM_BOT_TOKEN = line.split('=')[1]?.trim() || '';
    if (line.startsWith('TELEGRAM_CHAT_ID=')) process.env.TELEGRAM_CHAT_ID = line.split('=')[1]?.trim() || '';
  }
} catch {}

const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m', W = '\x1b[37m', N = '\x1b[0m';

let token = '';

// ─── Telegram ──────────────────────────────────
async function sendTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

// ─── Test Functions ────────────────────────────
async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
  token = data.token;
  console.log(`${G}✅ Login successful${N}`);
}

async function testHomepage() {
  const res = await fetch(`${BASE}/`);
  if (!res.ok || !(await res.text()).includes('Thaesu')) throw new Error('Homepage broken');
  console.log(`${G}✅ Homepage loads${N}`);
}

async function testProfileUpdate() {
  const newName = 'Test User ' + Math.random().toString(36).substring(2, 6);
  const res = await fetch(`${BASE}/api/user/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ full_name: newName }),
  });
  if (!res.ok) throw new Error(`Profile update failed: ${res.status}`);
  console.log(`${G}✅ Profile updated${N}`);
}

async function testDashboardCrawl() {
  const res = await fetch(`${BASE}/api/admin/crawler`);
  if (!res.ok) throw new Error(`Crawl API failed: ${res.status}`);
  console.log(`${G}✅ Dashboard crawl works${N}`);
}

async function testDashboardProducts() {
  const res = await fetch(`${BASE}/api/admin/products?limit=5`);
  if (!res.ok) throw new Error(`Products API failed: ${res.status}`);
  console.log(`${G}✅ Dashboard products loaded${N}`);
}

async function testTelegramConfig() {
  const res = await fetch(`${BASE}/api/admin/telegram-config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Telegram config failed: ${res.status}`);
  console.log(`${G}✅ Telegram config accessible${N}`);
}

async function testCreateOrder() {
  // Get a product first
  const prodRes = await fetch(`${BASE}/api/products?limit=1`);
  const { products } = await prodRes.json();
  if (!products?.length) { console.log(`${Y}⚠️ No products to test order – skipping${N}`); return; }
  const product = products[0];
  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: [{ product_id: product.id, quantity: 1, title: product.title, price: product.price }] }),
  });
  if (res.status === 409) { console.log(`${Y}⚠️ Stock insufficient – skipping order${N}`); return; }
  if (!res.ok) throw new Error(`Order creation failed: ${res.status}`);
  console.log(`${G}✅ Order created${N}`);
}

async function testListOrders() {
  const res = await fetch(`${BASE}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`List orders failed: ${res.status}`);
  console.log(`${G}✅ Orders listed${N}`);
}

// ─── Run All ──────────────────────────────────
(async () => {
  console.log(`${C}🚀 Infinity Premium Functional Test${N}`);
  console.log(`${W}Base: ${BASE} | Login: ${ADMIN_LOGIN}${N}\n`);

  const tests = [
    { name: 'Login', fn: login },
    { name: 'Homepage', fn: testHomepage },
    { name: 'Profile Update', fn: testProfileUpdate },
    { name: 'Dashboard Crawl', fn: testDashboardCrawl },
    { name: 'Dashboard Products', fn: testDashboardProducts },
    { name: 'Telegram Config', fn: testTelegramConfig },
    { name: 'Create Order', fn: testCreateOrder },
    { name: 'List Orders', fn: testListOrders },
  ];

  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
    } catch (e) {
      console.log(`${R}❌ ${t.name}: ${e.message}${N}`);
      failed++;
      await sendTelegram(`❌ <b>${t.name} Failed</b>\n${e.message}`);
    }
  }

  console.log(`\n${C}🎯 Results: ${G}${passed} passed${N}, ${R}${failed} failed${N}`);
  if (failed === 0) {
    console.log(`${G}🎉 All functional tests passed!${N}`);
  }
})();
