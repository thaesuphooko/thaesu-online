export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query('SELECT * FROM pricing_rules ORDER BY priority DESC');
  return Response.json(res.rows);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  const { name, description, rule_type, condition, adjustment_type, adjustment_value, is_active, priority } = body;
  if (!name || !rule_type || !adjustment_type || adjustment_value === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const res = await query(
    `INSERT INTO pricing_rules (name, description, rule_type, condition, adjustment_type, adjustment_value, is_active, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, description || '', rule_type, JSON.stringify(condition || {}), adjustment_type, adjustment_value, is_active !== false, priority || 0]
  );
  return Response.json(res.rows[0], { status: 201 });
}
