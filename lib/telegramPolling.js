import { query } from './db.js';
// Read tokens from environment (loaded from .env.local)
const ALL_TOKENS = process.env.TELEGRAM_BOT_TOKENS
  ? process.env.TELEGRAM_BOT_TOKENS.split(',').map(s => s.trim()).filter(Boolean)
  : [process.env.TELEGRAM_BOT_TOKEN_1, process.env.TELEGRAM_BOT_TOKEN_2, process.env.TELEGRAM_BOT_TOKEN_3, process.env.TELEGRAM_BOT_TOKEN_4, process.env.TELEGRAM_BOT_TOKEN_5].filter(Boolean);

let offset = 0;

async function poll(token) {
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=30`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.callback_query) {
          const { data: callbackData, message } = update.callback_query;
          const action = callbackData.split('_')[0];
          const orderId = callbackData.split('_')[1];
          if (action === 'confirm') {
            await query("UPDATE orders SET status = 'confirmed' WHERE id = $1", [orderId]);
          } else if (action === 'cancel') {
            await query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId]);
          }
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: update.callback_query.id, text: `Order ${orderId} ${action}ed` }),
          });
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}

async function startPolling() {
  if (ALL_TOKENS.length === 0) {
    console.error('No Telegram bot tokens found in environment variables.');
    process.exit(1);
  }
  let idx = 0;
  while (true) {
    await poll(ALL_TOKENS[idx % ALL_TOKENS.length]);
    idx++;
    await new Promise(r => setTimeout(r, 1000));
  }
}

startPolling();
