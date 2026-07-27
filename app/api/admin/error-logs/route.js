import { createApiRoute, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';
import db from '@/lib/db';

async function notifyAdminsViaTelegram(message, stack) {
  try {
    const { rows: [config] } = await db.query('SELECT * FROM telegram_configs ORDER BY created_at DESC LIMIT 1');
    if (!config) return;
    
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: `🚨 New Error Log\n\n📝 ${message}\n\n📄 ${stack?.slice(0, 200) || 'N/A'}`,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Failed to notify admins:', e);
  }
}

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100');
    return Response.json(rows);
  }),
  
  POST: async (req) => {
    const body = await req.json();
    if (!body.message) return Response.json({ error: 'Message required' }, { status: 400 });
    
    await safeQuery('INSERT INTO error_logs (message, stack) VALUES ($1, $2)', [body.message, body.stack || '']);
    
    // Broadcast critical errors asynchronously
    notifyAdminsViaTelegram(body.message, body.stack);
    
    return Response.json({ success: true }, { status: 201 });
  }
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
