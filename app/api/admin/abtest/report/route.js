import { requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

export const GET = requireAdmin(async (req) => {
  const url = new URL(req.url);
  const testId = url.searchParams.get('id');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  let query = `
    SELECT t.*,
      (SELECT COUNT(*) FROM orders o WHERE o.ab_test_id = t.id) as total_conversions,
      (SELECT COUNT(*) FILTER (WHERE o.ab_variant = 'A') FROM orders o WHERE o.ab_test_id = t.id) as variant_a_conversions,
      (SELECT COUNT(*) FILTER (WHERE o.ab_variant = 'B') FROM orders o WHERE o.ab_test_id = t.id) as variant_b_conversions,
      (SELECT COUNT(*) FILTER (WHERE o.ab_variant = 'C') FROM orders o WHERE o.ab_test_id = t.id) as variant_c_conversions
    FROM ab_tests t
  `;
  const params = [];
  
  if (testId) {
    query += ' WHERE t.id = $1';
    params.push(testId);
  }
  
  query += ' ORDER BY t.created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);
  
  const { rows } = await safeQuery(query, params);
  return Response.json(testId ? rows[0] || null : rows);
});
