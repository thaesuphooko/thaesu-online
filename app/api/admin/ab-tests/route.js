import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

const handlers = {
  // List all tests with optional active filter
  GET: requireAdmin(async (req) => {
    const url = new URL(req.url);
    const active = url.searchParams.get('active');
    let query = 'SELECT * FROM ab_tests';
    const params = [];
    if (active === 'true') {
      query += ' WHERE is_active = true';
    } else if (active === 'false') {
      query += ' WHERE is_active = false';
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await safeQuery(query, params);
    return Response.json(rows);
  }),

  // Create new test (supports multi-variant)
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['name']);
    const { rows: [test] } = await safeQuery(
      `INSERT INTO ab_tests (name, variant_a, variant_b, variant_c, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [body.name, body.variant_a || null, body.variant_b || null, body.variant_c || null, body.is_active ?? true]
    );
    return Response.json(test, { status: 201 });
  }),

  // Update test
  PUT: requireAdmin(async (req) => {
    const body = await req.json();
    validateBody(body, ['id']);
    const { rows: [test] } = await safeQuery(
      `UPDATE ab_tests SET name = $1, variant_a = $2, variant_b = $3, variant_c = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [body.name, body.variant_a, body.variant_b, body.variant_c, body.is_active, body.id]
    );
    if (!test) return Response.json({ error: 'Test not found' }, { status: 404 });
    return Response.json(test);
  }),

  // Delete test
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM ab_tests WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
