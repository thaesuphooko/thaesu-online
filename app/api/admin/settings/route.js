export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT key, value FROM global_settings ORDER BY key');
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });
  return Response.json(settings);
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { key, value } = await request.json();
  await query(
    'INSERT INTO global_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
    [key, value]
  );
  return Response.json({ message: 'Setting updated' });
}

// Test endpoints
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { action, key } = await request.json();
  
  if (action === 'test-cloudinary') {
    const url = (await query("SELECT value FROM global_settings WHERE key = $1", [key])).rows[0]?.value;
    if (!url) return Response.json({ error: 'No URL configured' }, { status: 400 });
    try {
      const parsed = new URL(url);
      cloudinary.config({ cloud_name: parsed.host, api_key: parsed.username, api_secret: parsed.password });
      const result = await cloudinary.api.ping();
      return Response.json({ success: result.status === 'ok' });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }
  
  if (action === 'test-telegram') {
    const token = (await query("SELECT value FROM global_settings WHERE key = 'telegram_bot_token_1'")).rows[0]?.value;
    const chatId = (await query("SELECT value FROM global_settings WHERE key = 'telegram_user_id'")).rows[0]?.value;
    if (!token || !chatId) return Response.json({ error: 'Missing token or chat ID' }, { status: 400 });
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: '✅ Connection test from Thaesu Admin' }),
      });
      const tgData = await tgRes.json();
      return Response.json({ success: tgData.ok });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
