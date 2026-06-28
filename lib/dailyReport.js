import { query } from './db.js';

export async function generateDailyReport() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const orders = await query(
    "SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue FROM orders WHERE created_at >= $1",
    [yesterday]
  );
  const newUsers = await query("SELECT COUNT(*) FROM users WHERE created_at >= $1", [yesterday]);
  const newProducts = await query("SELECT COUNT(*) FROM products WHERE created_at >= $1", [yesterday]);

  const report = {
    date: today.toISOString().slice(0, 10),
    orders: parseInt(orders.rows[0].count),
    revenue: parseFloat(orders.rows[0].revenue),
    newUsers: parseInt(newUsers.rows[0].count),
    newProducts: parseInt(newProducts.rows[0].count),
  };

  const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
  const chatId = process.env.TELEGRAM_USER_ID;
  if (token && chatId) {
    const text = `📊 *Daily Report (${report.date})*\n\nOrders: ${report.orders}\nRevenue: ${report.revenue.toLocaleString()} Ks\nNew Users: ${report.newUsers}\nNew Products: ${report.newProducts}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  }
  return report;
}
