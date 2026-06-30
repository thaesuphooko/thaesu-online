import { redis } from './redis.js';

async function init() {
  await redis.set('health:total_requests', '0', { nx: true });
  await redis.set('health:telegram_alerts_today', '0', { nx: true });
  await redis.set('health:ai_healed_total', '0', { nx: true });
  console.log('Health counters initialized.');
  process.exit(0);
}
init().catch(console.error);
