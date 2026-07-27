// cron-order-status.js – Infinity Premium Ultra Pro Max
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import db from './lib/db.js';

try {
  const envContent = readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#') && vals.length)
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const REPORT_DIR = './cron-reports';
try { mkdirSync(REPORT_DIR, { recursive: true }); } catch {}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

async function queryWithRetry(sql, params = [], { retries = 3, baseDelayMs = 500 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try { return await db.query(sql, params); }
    catch (e) {
      if (i === retries) throw e;
      const delay = baseDelayMs * 2 ** i + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function main() {
  const start = Date.now();
  console.log('🚀 [CRON-ORDER] Starting…');
  let success = false, cancelledCount = 0, columnUsed = 'timer_expiry', errorMsg = '';

  try {
    const cols = ['timer_expiry', 'expires_at', 'created_at'];
    let col = null;
    for (const c of cols) {
      const { rows } = await queryWithRetry(
        `SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name=$1`, [c]);
      if (rows.length > 0) { col = c; break; }
    }
    if (!col) throw new Error('No suitable timer column found');
    columnUsed = col;

    // Auto‑fix constraint if needed (attempt once)
    try {
      const { rows: constraints } = await queryWithRetry(
        `SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c'`);
      const orderCheck = constraints.find(c => c.def.includes('status'));
      if (orderCheck && !orderCheck.def.includes("'cancelled'")) {
        await queryWithRetry(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS "${orderCheck.conname}"`);
        await queryWithRetry(`ALTER TABLE orders ADD CONSTRAINT "${orderCheck.conname}" CHECK (status IN ('pending','processing','shipped','delivered','cancelled','confirmed','preparing'))`);
      }
    } catch {}

    let result;
    if (col === 'timer_expiry') result = await queryWithRetry(`UPDATE orders SET status='cancelled' WHERE status='pending' AND timer_expiry < NOW()`);
    else if (col === 'expires_at') result = await queryWithRetry(`UPDATE orders SET status='cancelled' WHERE status='pending' AND expires_at < NOW()`);
    else result = await queryWithRetry(`UPDATE orders SET status='cancelled' WHERE status='pending' AND created_at < NOW() - INTERVAL '60 minutes'`);

    cancelledCount = result.rowCount;
    success = true;
    console.log(`✅ Cancelled ${cancelledCount} orders.`);
    if (cancelledCount > 0) await sendTelegram(`⏰ <b>Order Cleanup</b>\n📦 ${cancelledCount} cancelled\n⏱ ${Date.now()-start}ms`);
  } catch (e) {
    errorMsg = e.message;
    console.error('❌ Fail:', e);
    await sendTelegram(`🚨 <b>Order Cleanup Failed</b>\n${e.message}`);
  } finally {
    const now = new Date();
    const fn = `cron-order-${now.toISOString().replace(/[:.]/g,'-')}.html`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order Cleanup Report</title><style>body{font-family:sans-serif;background:#0a0a0a;color:#e0e0e0;padding:2rem}h1{color:#a855f7}.card{background:#1a1a2e;border-radius:1rem;padding:1.5rem;margin:1rem 0}.metric{display:flex;gap:2rem}.metric-item{text-align:center}.metric-value{font-size:2rem;font-weight:bold}.success{color:#22c55e}.error{color:#ef4444}table{width:100%;border-collapse:collapse;background:#111;border-radius:0.5rem}th{background:#1a1a2e;padding:0.75rem}td{padding:0.75rem;border-bottom:1px solid #222}</style></head><body><h1>⚡ Order Cleanup Report</h1><div class="card"><h2>Summary</h2><div class="metric"><div class="metric-item"><div class="metric-value ${success?'success':'error'}">${success?'✅ Success':'❌ Failed'}</div></div><div class="metric-item"><div class="metric-value">${cancelledCount}</div>Orders Cancelled</div><div class="metric-item"><div class="metric-value">${Date.now()-start}ms</div>Duration</div></div>${errorMsg?`<p class="error">${errorMsg}</p>`:''}<table><tr><th>Start</th><td>${new Date(start).toISOString()}</td></tr><tr><th>Timer Column</th><td>${columnUsed}</td></tr></table></div></body></html>`;
    writeFileSync(join(REPORT_DIR, fn), html);
    console.log(`📄 Report saved: ${fn}`);
    process.exit(0);
  }
}
main();
