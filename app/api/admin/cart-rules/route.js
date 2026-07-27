import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM cart_rules ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['name']);
    const { rows: [rule] } = await safeQuery(
      'INSERT INTO cart_rules (name, rule_json, is_active) VALUES ($1, $2, $3) RETURNING *',
      [body.name, body.rule_json || '{}', body.is_active ?? true]
    );
    return Response.json(rule, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id']);
    const { rows: [rule] } = await safeQuery(
      `UPDATE cart_rules SET name = $1, rule_json = $2, is_active = $3
       WHERE id = $4 RETURNING *`,
      [body.name, body.rule_json, body.is_active, body.id]
    );
    return Response.json(rule);
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM cart_rules WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
