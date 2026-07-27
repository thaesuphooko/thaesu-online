import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM giftcards ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['code', 'value']);
    const { rows: [giftcard] } = await safeQuery(
      'INSERT INTO giftcards (code, value, balance, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [body.code, body.value, body.value, true]
    );
    return Response.json(giftcard, { status: 201 });
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('UPDATE giftcards SET is_active = false WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
