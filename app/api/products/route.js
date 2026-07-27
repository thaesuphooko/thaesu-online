import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const slug = searchParams.get('slug') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'created_at';   // created_at, price_asc, price_desc
    const order = sort === 'price_asc' ? 'ASC' : sort === 'price_desc' ? 'DESC' : 'DESC';
    const orderColumn = sort.startsWith('price') ? 'p.price' : 'p.created_at';
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 999999999;
    const fast = searchParams.get('fast') === 'true';         // skip exact count
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // ────── Single product detail ──────
    if (slug) {
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
      const product = result.rows[0] || null;
      if (product && product.media?.length) {
        const firstImage = product.media.find(m => m.type === 'image');
        product.image_url = firstImage ? firstImage.url : null;
      }
      return NextResponse.json(
        { product },
        { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } }
      );
    }

    // ────── Build WHERE clause ──────
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push(`(p.title ILIKE $${params.length+1} OR p.description ILIKE $${params.length+2})`);
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      conditions.push(`p.category = $${params.length+1}`);
      params.push(category);
    }
    if (minPrice > 0) {
      conditions.push(`p.price >= $${params.length+1}`);
      params.push(minPrice);
    }
    if (maxPrice < 999999999) {
      conditions.push(`p.price <= $${params.length+1}`);
      params.push(maxPrice);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // ────── Optimized main query ──────
    // Window function ဖြင့် count ကို ပင်မ query နှင့်အတူ ယူခြင်း (fast=true ဆိုရင် count မယူ)
    const queryText = fast ? `
      SELECT 
        p.id, p.title, p.price, p.stock, p.category, p.is_active, p.slug, p.description,
        media.url AS image_url
      FROM products p
      LEFT JOIN LATERAL (
        SELECT cloudinary_url AS url
        FROM media m
        WHERE m.product_id = p.id AND m.media_type = 'image'
        ORDER BY m.created_at LIMIT 1
      ) media ON true
      ${where}
      ORDER BY ${orderColumn} ${order}
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    ` : `
      SELECT 
        p.id, p.title, p.price, p.stock, p.category, p.is_active, p.slug, p.description,
        media.url AS image_url,
        COUNT(*) OVER() AS total_count
      FROM products p
      LEFT JOIN LATERAL (
        SELECT cloudinary_url AS url
        FROM media m
        WHERE m.product_id = p.id AND m.media_type = 'image'
        ORDER BY m.created_at LIMIT 1
      ) media ON true
      ${where}
      ORDER BY ${orderColumn} ${order}
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    `;

    const result = await query(queryText, [...params, limit, offset]);

    const products = result.rows.map(row => {
      const { total_count, ...rest } = row;
      return rest;
    });
    const total = fast ? null : (result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0);

    const responsePayload = {
      products,
      ...(fast ? {} : { total, totalPages: Math.ceil(total / limit) }),
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('❌ Products API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
