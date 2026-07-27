import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM content_blocks ORDER BY page, section');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['page', 'section']);
    const { rows: [block] } = await safeQuery(
      'INSERT INTO content_blocks (page, section, data) VALUES ($1, $2, $3) RETURNING *',
      [body.page, body.section, body.data || '{}']
    );
    return Response.json(block, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id']);
    const { rows: [block] } = await safeQuery(
      `UPDATE content_blocks SET page = $1, section = $2, data = $3
       WHERE id = $4 RETURNING *`,
      [body.page, body.section, body.data, body.id]
    );
    return Response.json(block);
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM content_blocks WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
