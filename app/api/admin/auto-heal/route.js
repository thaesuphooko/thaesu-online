export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { redis } from '@/lib/redis';
import { pool } from '@/lib/db';

async function sendTelegramAlert(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN_1;
  const chatId = process.env.TELEGRAM_USER_ID;
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch (e) {
    console.error('Telegram send failed:', e);
  }
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await pool.query('SELECT 1');
    await redis.set('health:autoheal_check', 'ok');
    await redis.del('products:list', 'products:featured', 'categories:all');
    const healed = await redis.incr('health:ai_healed_total');
    await sendTelegramAlert(`✅ Auto-Heal Complete\nTotal Healed: ${healed}`);
    return NextResponse.json({ message: 'System Optimization Complete! 100% Secure', healed });
  } catch (error) {
    console.error('Auto-heal error:', error);
    await sendTelegramAlert(`❌ Auto-Heal Failed\nError: ${error.message}`);
    return NextResponse.json({ error: 'Heal process failed' }, { status: 500 });
  }
}
