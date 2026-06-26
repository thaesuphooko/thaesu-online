export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query(`
    SELECT p.*, v.store_name, u.email as vendor_email
    FROM payouts p
    JOIN vendors v ON v.id = p.vendor_id
    JOIN users u ON u.id = v.user_id
    ORDER BY p.created_at DESC
  `);
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { vendor_id, amount, notes } = await request.json();
  if (!vendor_id || !amount) return Response.json({ error: 'vendor_id and amount required' }, { status: 400 });
  const res = await query(
    `INSERT INTO payouts (vendor_id, amount, notes) VALUES ($1, $2, $3) RETURNING *`,
    [vendor_id, amount, notes || '']
  );
  return Response.json(res.rows[0], { status: 201 });
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { id, status } = await request.json();
  if (!id || !status) return Response.json({ error: 'id and status required' }, { status: 400 });
  await query(`UPDATE payouts SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
  return Response.json({ message: 'Payout updated' });
}
