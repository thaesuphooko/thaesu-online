export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET() {
  const jobs = await query('SELECT * FROM crawl_jobs WHERE status = $1', ['running']);
  const totalProducts = await query('SELECT COUNT(*) FROM products');

  // If a running job hasn't been updated in 30 minutes, it's stuck
  for (const job of jobs.rows) {
    const lastUpdate = new Date(job.updated_at);
    const now = new Date();
    const diffMinutes = (now - lastUpdate) / 60000;
    if (diffMinutes > 30) {
      // Send Telegram alert
      const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
      const chatId = process.env.TELEGRAM_USER_ID;
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ Crawler job "${job.name}" seems stuck. Last update: ${job.updated_at}`,
          }),
        });
      }
    }
  }

  return Response.json({
    runningJobs: jobs.rows,
    totalProducts: parseInt(totalProducts.rows[0].count),
  });
}
