import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const slug = searchParams.get('slug') || '';
    const category = searchParams.get('category') || '';
    const limit = 20;
    const offset = (page - 1) * limit;

    const IMAGE_SUBQUERY = `(SELECT m.cloudinary_url FROM media m WHERE m.product_id = p.id AND m.media_type = 'image' LIMIT 1) AS image_url`;

    if (slug) {
      // For detail page – return full product with all media
      const result = await query(
        `SELECT p.*,
         COALESCE(
           (SELECT json_agg(json_build_object('id', m.id, 'url', m.cloudinary_url, 'type', m.media_type, 'video_url', m.video_url))
            FROM media m WHERE m.product_id = p.id),
           '[]'::json
         ) AS media
         FROM products p
         WHERE p.slug = $1`,
        [slug]
      );
      const product = result.rows[0];
      // Add single image_url for convenience
      if (product && product.media && product.media.length > 0) {
        const firstImage = product.media.find(m => m.type === 'image');
        product.image_url = firstImage ? firstImage.url : null;
      }
      return NextResponse.json({ product });
    }

    let where = '';
    const params = [];
    if (search) {
      where += ` AND (p.title ILIKE $${params.length+1} OR p.description ILIKE $${params.length+2})`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      where += ` AND p.category = $${params.length+1}`;
      params.push(category);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM products p WHERE 1=1 ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.id, p.title, p.price, p.stock, p.category, p.is_active, p.slug, p.description,
              ${IMAGE_SUBQUERY}
       FROM products p
       WHERE 1=1 ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      products: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
