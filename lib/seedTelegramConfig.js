import { query } from './db.js';
import fs from 'fs';
import path from 'path';

async function seed() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) { console.log('No .env.local'); process.exit(1); }
  const content = fs.readFileSync(envFile, 'utf8');
  const lines = content.split('\n');
  const env = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    env[line.substring(0, eqIndex).trim()] = line.substring(eqIndex + 1).trim();
  }
  const userId1 = env.TELEGRAM_USER_ID, userId2 = env.TELEGRAM_USER_ID_2;
  const userIds = [userId1, userId2].filter(Boolean).join(',');
  if (!userIds) { console.error('No TELEGRAM_USER_ID found'); process.exit(1); }
  await query('DELETE FROM telegram_config');
  for (let i = 1; i <= 5; i++) {
    const token = env[`TELEGRAM_BOT_TOKEN_${i}`];
    if (token) await query('INSERT INTO telegram_config (bot_token, user_ids) VALUES ($1, $2)', [token, userIds]);
  }
  console.log('Telegram config seeded.');
  process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });
