export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM visitor_tracking LIMIT 1');
  return Response.json(res.rows[0] || { track_ip: true, track_device: true, track_referrer: true, track_page: true });
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  const fields = ['track_ip', 'track_device', 'track_referrer', 'track_page'];
  const sets = fields.filter(f => body[f] !== undefined).map((f, i) => `${f} = $${i+1}`).join(', ');
  const values = fields.filter(f => body[f] !== undefined).map(f => body[f]);
  if (sets.length === 0) return Response.json({ error: 'No fields' }, { status: 400 });
  await query(`UPDATE visitor_tracking SET ${sets}, updated_at = NOW()`, values);
  return Response.json({ message: 'Tracking settings updated' });
}
