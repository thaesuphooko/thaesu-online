import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req) {
  const user = await authenticate(req);
  // If not logged in, return popular products
  if (!user) {
    const popular = await query(
      'SELECT id, title, price, media, slug FROM products ORDER BY RANDOM() LIMIT 8'
    );
    return NextResponse.json(popular.rows);
  }

  try {
    // Simple collaborative filtering: find users with similar purchase history
    // 1. Get categories of products this user bought
    const userCategories = await query(
      `SELECT DISTINCT p.category FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1 AND p.category IS NOT NULL`,
      [user.id]
    );
    const cats = userCategories.rows.map(r => r.category);
    
    if (cats.length === 0) {
      // No purchase history, fallback to popular
      const popular = await query('SELECT id, title, price, media, slug FROM products ORDER BY RANDOM() LIMIT 8');
      return NextResponse.json(popular.rows);
    }

    // Recommend products from those categories, excluding already bought
    const boughtProductIds = await query(
      `SELECT DISTINCT oi.product_id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1`,
      [user.id]
    );
    const excludeIds = boughtProductIds.rows.map(r => r.product_id);

    let excludeClause = '';
    const params = [];
    if (excludeIds.length > 0) {
      excludeClause = `AND p.id NOT IN (${excludeIds.map((_, i) => `$${i + cats.length + 1}`).join(',')})`;
      params.push(...excludeIds);
    }

    const { rows } = await query(
      `SELECT p.id, p.title, p.price, p.media, p.slug
       FROM products p
       WHERE p.category = ANY($1::text[]) AND p.is_active = true ${excludeClause}
       ORDER BY RANDOM()
       LIMIT 8`,
      [cats, ...params]
    );

    // If not enough, fill with random products
    if (rows.length < 8) {
      const needed = 8 - rows.length;
      const fill = await query(
        `SELECT p.id, p.title, p.price, p.media, p.slug
         FROM products p
         WHERE p.is_active = true AND p.id NOT IN (${excludeIds.length > 0 ? excludeIds.map((_, i) => `$${i + cats.length + 1}`).join(',') : 'SELECT NULL'})
         ORDER BY RANDOM()
         LIMIT $1`,
        [needed]
      );
      rows.push(...fill.rows);
    }
    return NextResponse.json(rows.slice(0, 8));
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json([]);
  }
}
