export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET() {
  const res = await query("SELECT key, value FROM global_settings WHERE key IN ('music_url','music_volume','music_enabled','wishlist_icon','dark_mode_default')");
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });
  return Response.json(settings);
}
