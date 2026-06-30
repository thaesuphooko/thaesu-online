import { query } from './db.js';
import { execSync } from 'child_process';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

async function sendAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_USER_ID, text: message }),
  }).catch(() => {});
}

async function run() {
  // Find errors in last 5 minutes that haven't been actioned
  const newErrors = await query(
    "SELECT * FROM error_logs WHERE action_taken IS NULL AND created_at > NOW() - INTERVAL '5 minutes'"
  );
  for (const err of newErrors.rows) {
    let action = '';
    if (err.error_message.includes('ECONNREFUSED') || err.error_message.includes('timeout')) {
      try { execSync('pm2 restart thaesu'); action = 'Restarted thaesu'; } catch { action = 'Restart failed'; }
    } else if (err.error_message.includes('Memory') || err.error_message.includes('cache')) {
      try { execSync('rm -rf .next node_modules/.cache'); action = 'Cleared cache'; } catch { action = 'Cache clear failed'; }
    } else {
      action = 'No automatic action';
    }
    await query('UPDATE error_logs SET action_taken = $1 WHERE id = $2', [action, err.id]);
    if (action.includes('Restart') || action.includes('Clear')) {
      await sendAlert(`✅ Auto-Heal: ${action} (Error: ${err.error_message.slice(0,50)})`);
    }
  }
  process.exit(0);
}
run();
