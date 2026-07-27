import { createApiRoute, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT * FROM music_config ORDER BY created_at DESC LIMIT 1');
    return Response.json(rows[0] || {});
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    if (!body.url && !body.title) return Response.json({ error: 'URL or title required' }, { status: 400 });
    const { rows: [config] } = await safeQuery(
      'INSERT INTO music_config (url, title, volume, speed, enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [body.url, body.title || 'Untitled', body.volume || 0.5, body.speed || 1.0, body.enabled ?? true]
    );
    return Response.json(config, { status: 201 });
  }),
  
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    if (!body.id) return Response.json({ error: 'ID required' }, { status: 400 });
    const { rows: [config] } = await safeQuery(
      `UPDATE music_config SET url = $1, title = $2, volume = $3, speed = $4, enabled = $5
       WHERE id = $6 RETURNING *`,
      [body.url, body.title, body.volume, body.speed, body.enabled, body.id]
    );
    return Response.json(config);
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
