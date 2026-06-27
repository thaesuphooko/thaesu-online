// Rotating 5 tokens from TELEGRAM_BOT_TOKENS env (comma-separated)
const ALL_TOKENS = process.env.TELEGRAM_BOT_TOKENS
  ? process.env.TELEGRAM_BOT_TOKENS.split(',').map(s => s.trim()).filter(Boolean)
  : [process.env.TELEGRAM_BOT_TOKEN_1].filter(Boolean);

let tokenIndex = 0;
function getNextToken() {
  if (ALL_TOKENS.length === 0) return null;
  const token = ALL_TOKENS[tokenIndex % ALL_TOKENS.length];
  tokenIndex++;
  return token;
}

// Send plain text notification (admin only)
export async function sendOrderNotification(orderId, items, totalAmount, phone) {
  const token = getNextToken();
  if (!token || !process.env.TELEGRAM_USER_ID) return;
  const itemsList = items.map(i => `• ${i.product_title} x${i.quantity} (${i.price} Ks)`).join('\n');
  const text = `🛒 *New Order*\nOrder ID: \`${orderId}\`\nPhone: ${phone || 'N/A'}\nItems:\n${itemsList}\nTotal: ${totalAmount.toLocaleString()} Ks`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_USER_ID, text, parse_mode: 'Markdown' }),
  });
}

// Send photo with inline keyboard (uses specific token from rotation)
export async function sendOrderNotificationWithKeyboard(orderId, items, totalAmount, phone, screenshotUrl) {
  const token = getNextToken();
  if (!token || !process.env.TELEGRAM_USER_ID) return;
  const itemsList = items.map(i => `• ${i.product_title} x${i.quantity} (${i.price} Ks)`).join('\n');
  const text = `📸 *Payment Screenshot Received!*\nOrder ID: \`${orderId}\`\nPhone: ${phone || 'N/A'}\nItems:\n${itemsList}\nTotal: ${totalAmount.toLocaleString()} Ks`;
  return fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_USER_ID,
      photo: screenshotUrl,
      caption: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Confirm Order', callback_data: `confirm_${orderId}` },
          { text: '❌ Cancel Order', callback_data: `cancel_${orderId}` },
        ]],
      },
    }),
  });
}

// Test function for a specific token (admin panel)
export async function testBotToken(token, chatId) {
  if (!token || !chatId) return { ok: false, error: 'Missing token or chatId' };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: '🤖 Bot test message from Thaesu Admin Panel' }),
  });
  return res.json();
}
