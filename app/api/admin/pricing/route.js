import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM pricing_rules ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['name', 'discount']);
    const { rows: [rule] } = await safeQuery(
      'INSERT INTO pricing_rules (name, discount, min_amount, max_amount, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [body.name, body.discount, body.min_amount || 0, body.max_amount || 999999, true]
    );
    return Response.json(rule, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id']);
    const { rows: [rule] } = await safeQuery(
      `UPDATE pricing_rules SET name = $1, discount = $2, min_amount = $3, max_amount = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [body.name, body.discount, body.min_amount, body.max_amount, body.is_active, body.id]
    );
    return Response.json(rule);
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM pricing_rules WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
