import { query } from './db.js';
import { execSync } from 'child_process';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function pingDb() {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return { status: 'OK', time: Date.now() - start, msg: 'Database connected' };
  } catch (e) {
    return { status: 'ERROR', time: 0, msg: e.message };
  }
}

async function pingRedis() {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
    const start = Date.now();
    await redis.ping();
    return { status: 'OK', time: Date.now() - start, msg: 'Redis connected' };
  } catch (e) {
    return { status: 'ERROR', time: 0, msg: e.message };
  }
}

async function checkBots() {
  try {
    const out = execSync('pm2 jlist').toString();
    const list = JSON.parse(out);
    const bots = list.filter(p => p.name.includes('telegram-bot') || p.name === 'thaesu');
    let ok = 0, total = bots.length;
    for (const b of bots) {
      if (b.pm2_env.status === 'online') ok++;
    }
    const allOk = ok === total;
    return { status: allOk ? 'OK' : 'WARN', msg: `${ok}/${total} bots online` };
  } catch (e) {
    return { status: 'ERROR', msg: e.message };
  }
}

async function checkPage(url, name) {
  const start = Date.now();
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.status === 200) {
      return { status: 'OK', time: Date.now() - start, msg: `${name} OK` };
    }
    return { status: 'WARN', time: 0, msg: `${name} returned ${res.status}` };
  } catch (e) {
    return { status: 'ERROR', time: 0, msg: `${name} unreachable` };
  }
}

async function runAll() {
  const checks = [];
  // Database
  const db = await pingDb();
  checks.push({ component: 'Database', ...db });
  // Redis
  const redis = await pingRedis();
  checks.push({ component: 'Redis', ...redis });
  // Bots
  const bots = await checkBots();
  checks.push({ component: 'Bot Fleet', ...bots });
  // Pages
  const home = await checkPage(BASE_URL, 'Homepage');
  checks.push({ component: 'Homepage', ...home });
  const products = await checkPage(`${BASE_URL}/products`, 'Products');
  checks.push({ component: 'Products Page', ...products });
  // System stats (CPU/RAM via shell)
  let cpu = 'N/A';
  try {
    const cpuLine = execSync("top -bn1 | grep 'CPU' | head -1").toString();
    const idleMatch = cpuLine.match(/(\d+)% idle/);
    cpu = idleMatch ? (100 - parseInt(idleMatch[1])) + '%' : 'N/A';
  } catch {}
  checks.push({ component: 'CPU Usage', status: 'OK', msg: cpu });

  // Save to DB
  for (const c of checks) {
    await query(
      'INSERT INTO system_health_logs (component, status, message, response_time_ms) VALUES ($1,$2,$3,$4)',
      [c.component, c.status, c.msg, c.time || 0]
    ).catch(() => {});
  }
  console.log('Health check completed at', new Date().toISOString());
}

runAll().catch(console.error).then(() => process.exit(0));
