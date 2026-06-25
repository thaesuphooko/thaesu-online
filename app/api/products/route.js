import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const minPrice = parseFloat(searchParams.get('minPrice'));
    const maxPrice = parseFloat(searchParams.get('maxPrice'));
    const sort = searchParams.get('sort') || 'newest';
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(search.trim());
      paramIndex++;
    }
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (!isNaN(minPrice)) {
      conditions.push(`price >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }
    if (!isNaN(maxPrice)) {
      conditions.push(`price <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }
    conditions.push('is_active = true');

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderClause;
    switch (sort) {
      case 'price_asc': orderClause = 'ORDER BY price ASC'; break;
      case 'price_desc': orderClause = 'ORDER BY price DESC'; break;
      case 'title_asc': orderClause = 'ORDER BY title ASC'; break;
      case 'title_desc': orderClause = 'ORDER BY title DESC'; break;
      default: orderClause = 'ORDER BY created_at DESC'; break;
    }

    // Optimized: only fetch needed fields
    const countResult = await query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const productsQuery = `
      SELECT p.id, p.title, p.slug, p.price, p.compare_at_price, p.stock, p.category, p.tags, p.created_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', m.id, 'url', m.cloudinary_url, 'type', m.media_type))
          FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS media
      FROM products p
      LEFT JOIN media m ON m.product_id = p.id AND m.sort_order = 0
      ${whereClause}
      GROUP BY p.id
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const productsResult = await query(productsQuery, params);

    return new Response(
      JSON.stringify({
        data: productsResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Products API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
