import { requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';

export const POST = requireAdmin(async (req) => {
  const body = await req.json();
  
  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return Response.json({ error: 'Product IDs array required' }, { status: 400 });
  }
  
  if (body.ids.length > 100) {
    return Response.json({ error: 'Max 100 products per batch' }, { status: 400 });
  }
  
  const { rowCount } = await safeQuery(
    'UPDATE products SET is_deleted = false, deleted_at = NULL WHERE id = ANY($1::uuid[])',
    [body.ids]
  );
  
  return Response.json({ restored: rowCount });
});
