export const dynamic = 'force-dynamic';
export async function POST(request) {
  const { message, stack, url, userAgent } = await request.json();
  const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
  const chatId = process.env.TELEGRAM_USER_ID;

  if (token && chatId) {
    const text = `⚠️ **Client Error**\n\nMessage: ${message}\nURL: ${url}\nUserAgent: ${userAgent}\n\n\`\`\`${stack}\`\`\``;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  }
  return Response.json({ ok: true });
}
