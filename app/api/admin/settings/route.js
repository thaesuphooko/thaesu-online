export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT key, value FROM global_settings');
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
