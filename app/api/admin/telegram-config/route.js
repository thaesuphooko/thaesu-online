export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

// ── Helpers ─────────────────────────────────
async function getConfig() {
  const res = await query('SELECT * FROM telegram_config ORDER BY created_at DESC LIMIT 1');
  return res.rows[0] || null;
}

async function updateConfig(id, fields) {
  const setClause = Object.keys(fields)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ');
  const values = Object.values(fields);
  const res = await query(
    `UPDATE telegram_config SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function insertConfig(data) {
  const { bot_token, user_ids, notify_order = true, notify_lowstock = true, notify_crawler = true, is_active = true } = data;
  const res = await query(
    `INSERT INTO telegram_config (bot_token, user_ids, notify_order, notify_lowstock, notify_crawler, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [bot_token, user_ids, notify_order, notify_lowstock, notify_crawler, is_active]
  );
  return res.rows[0];
}

async function sendTestMessage(bot_token, chat_id) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text: '✅ Thaesu Online – Telegram configuration is working perfectly!',
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Unknown error');
    return { success: true };
  } catch (error) {
    throw new Error(`Telegram send failed: ${error.message}`);
  }
}

// ── Route Handlers ──────────────────────────
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const config = await getConfig();
  // Mask token for security
  if (config?.bot_token) config.bot_token = config.bot_token.slice(0, 8) + '...';
  return Response.json({ config });
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.bot_token || !body.user_ids) {
    return Response.json({ error: 'bot_token and user_ids are required' }, { status: 400 });
  }

  // Deactivate existing configs
  await query('UPDATE telegram_config SET is_active = false WHERE is_active = true');

  const config = await insertConfig(body);
  return Response.json({ config }, { status: 201 });
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });

  const allowedFields = ['bot_token', 'user_ids', 'notify_order', 'notify_lowstock', 'notify_crawler', 'is_active'];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 });

  const config = await updateConfig(body.id, updates);
  if (!config) return Response.json({ error: 'Config not found' }, { status: 404 });
  return Response.json({ config });
}

export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // Soft delete – deactivate all configs
  await query('UPDATE telegram_config SET is_active = false WHERE is_active = true');
  return Response.json({ message: 'All configurations deactivated' });
}

// Premium: Test notification endpoint
export async function PUT(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const config = await getConfig();
  if (!config) return Response.json({ error: 'No Telegram configuration found' }, { status: 404 });

  const { chat_id } = await request.json();
  const targetChat = chat_id || config.user_ids?.split(',')[0]?.trim(); // first user_id as fallback
  if (!targetChat) return Response.json({ error: 'chat_id required' }, { status: 400 });

  try {
    await sendTestMessage(config.bot_token, targetChat);
    return Response.json({ success: true, message: 'Test message sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
