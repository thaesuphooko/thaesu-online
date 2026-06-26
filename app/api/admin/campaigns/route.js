export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM email_campaigns ORDER BY created_at DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { name, subject, body, trigger_event } = await request.json();
  const res = await query(
    'INSERT INTO email_campaigns (name, subject, body, trigger_event) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, subject, body, trigger_event]
  );
  return Response.json(res.rows[0], { status: 201 });
}
