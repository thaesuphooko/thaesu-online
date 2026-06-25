const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

export async function sendOrderNotification(orderId, items, totalAmount, userEmail) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) return;

  const itemsList = items.map(i => `• ${i.title} x${i.quantity} (${i.price} Ks)`).join('\n');
  const text = `🛒 *New Order!*
Order ID: \`${orderId}\`
From: ${userEmail}
Items:
${itemsList}
Total: ${totalAmount.toLocaleString()} Ks`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_USER_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Telegram notify error:', err);
  }
}
