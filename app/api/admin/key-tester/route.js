export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';

async function testTelegram(token, chatId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Key test from Thaesu Admin' }),
    });
    const data = await res.json();
    return data.ok ? 'OK' : data.description;
  } catch (e) {
    return e.message;
  }
}

async function testDeepSeek(apiKey) {
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });
    const data = await res.json();
    return data.choices ? 'OK' : (data.error?.message || 'Invalid');
  } catch (e) {
    return e.message;
  }
}

async function testRedis() {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
    await redis.ping();
    return 'OK';
  } catch (e) {
    return e.message;
  }
}

async function testDatabase() {
  try {
    const { query } = await import('@/lib/db');
    await query('SELECT 1');
    return 'OK';
  } catch (e) {
    return e.message;
  }
}

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const results = {};

  // Telegram
  const telegramConfig = await import('@/lib/db').then(m => m.query(
    'SELECT bot_token, user_ids FROM telegram_config WHERE is_active = true LIMIT 1'
  ));
  if (telegramConfig.rows.length > 0) {
    const { bot_token, user_ids } = telegramConfig.rows[0];
    const chatId = user_ids.split(',')[0].trim();
    results.telegram = await testTelegram(bot_token, chatId);
  } else {
    results.telegram = 'Not configured';
  }

  // DeepSeek
  const deepKey = process.env.DEEPSEEK_API_KEY;
  if (deepKey) {
    results.deepseek = await testDeepSeek(deepKey);
  } else {
    results.deepseek = 'No API key set';
  }

  // Redis
  results.redis = await testRedis();

  // Database
  results.database = await testDatabase();

  return Response.json(results);
}
