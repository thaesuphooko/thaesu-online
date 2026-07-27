import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM shipping_zones ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['region_name']);
    const { rows: [zone] } = await safeQuery(
      'INSERT INTO shipping_zones (region_name, rate, estimated_days, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [body.region_name, body.rate || 0, body.estimated_days || 5, true]
    );
    return Response.json(zone, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id', 'region_name']);
    const { rows: [zone] } = await safeQuery(
      `UPDATE shipping_zones SET region_name = $1, rate = $2, estimated_days = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [body.region_name, body.rate, body.estimated_days, body.is_active, body.id]
    );
    return Response.json(zone);
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM shipping_zones WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
