import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  // GET – List all SEO records or filter by page
  GET: requireAdmin(async (req) => {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    let query = 'SELECT * FROM seo_meta';
    const params = [];
    if (page) {
      query += ' WHERE page = $1';
      params.push(page);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await safeQuery(query, params);
    return Response.json(rows);
  }),

  // POST – Create or update SEO meta for a page
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['page', 'title']);
    
    const { rows: [meta] } = await safeQuery(
      `INSERT INTO seo_meta (page, title, description, keywords, og_image)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (page) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         keywords = EXCLUDED.keywords,
         og_image = EXCLUDED.og_image,
         updated_at = NOW()
       RETURNING *`,
      [body.page, body.title, body.description || '', body.keywords || '', body.og_image || '']
    );
    return Response.json(meta, { status: 201 });
  }),
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
