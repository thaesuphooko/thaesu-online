import { query } from '@/lib/db';

// GET /api/products?page=1&limit=20&search=phone&category=electronics&minPrice=100&maxPrice=500&sort=price_asc
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

    // Build dynamic WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Full-text search using GIN index
    if (search.trim()) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(search.trim());
      paramIndex++;
    }

    // Category filter
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Price range
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

    // Only active products
    conditions.push('is_active = true');

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderClause;
    switch (sort) {
      case 'price_asc': orderClause = 'ORDER BY price ASC'; break;
      case 'price_desc': orderClause = 'ORDER BY price DESC'; break;
      case 'title_asc': orderClause = 'ORDER BY title ASC'; break;
      case 'title_desc': orderClause = 'ORDER BY title DESC'; break;
      case 'newest':
      default: orderClause = 'ORDER BY created_at DESC'; break;
    }

    // Count total matching products for pagination info
    const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Fetch products with media (first image only for performance)
    const productsQuery = `
      SELECT p.*, 
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
    const products = productsResult.rows;

    return Response.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
