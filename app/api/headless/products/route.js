export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { validateApiKey } from '@/lib/apiKeys';

export async function GET(request) {
  const userId = await validateApiKey(request);
  if (!userId) return Response.json({ error: 'Invalid API key' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
  const offset = (page - 1) * limit;

  const result = await query(
    'SELECT * FROM products WHERE is_active = true LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const count = await query('SELECT COUNT(*) FROM products WHERE is_active = true');
  const total = parseInt(count.rows[0].count);

  return Response.json({
    data: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
