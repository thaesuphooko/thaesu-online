export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(`title ILIKE $${paramIndex}`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    conditions.push('is_active = true');
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const productsQuery = `
      SELECT p.*, 
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', m.id, 'url', m.cloudinary_url, 'type', m.media_type))
        FILTER (WHERE m.id IS NOT NULL), '[]') AS media
      FROM products p
      LEFT JOIN media m ON m.product_id = p.id AND m.sort_order = 0
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const productsResult = await query(productsQuery, params);

    return Response.json({
      data: productsResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
