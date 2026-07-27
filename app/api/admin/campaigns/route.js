import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM email_campaigns ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['name', 'subject']);
    const { rows: [campaign] } = await safeQuery(
      'INSERT INTO email_campaigns (name, subject, content, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [body.name, body.subject, body.content || '', body.status || 'draft']
    );
    return Response.json(campaign, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id']);
    const { rows: [campaign] } = await safeQuery(
      `UPDATE email_campaigns SET name = $1, subject = $2, content = $3, status = $4
       WHERE id = $5 RETURNING *`,
      [body.name, body.subject, body.content, body.status, body.id]
    );
    return Response.json(campaign);
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM email_campaigns WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
