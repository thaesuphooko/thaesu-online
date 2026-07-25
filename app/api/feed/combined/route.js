import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticate } from '@/lib/socialAuth';

export async function GET(req) {
  const user = authenticate(req);
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const postsNeeded = Math.ceil(limit * 3 / 6);
    const productsNeeded = Math.floor(limit * 2 / 6);
    const wattpadNeeded = limit - postsNeeded - productsNeeded;

    // 1. Posts (unchanged)
    const postsOffset = (page - 1) * postsNeeded;
    let postsQuery, postsParams;
    if (user) {
      postsQuery = `
        SELECT p.*,
          COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) AS comment_count,
          COALESCE((SELECT COUNT(*) FROM shares WHERE post_id = p.id), 0) AS share_count,
          EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $3) AS liked_by_user,
          u.full_name AS user_name, u.avatar_url AS user_avatar, u.uid AS user_uid
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      postsParams = [postsNeeded, postsOffset, user.id];
    } else {
      postsQuery = `
        SELECT p.*,
          COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) AS comment_count,
          COALESCE((SELECT COUNT(*) FROM shares WHERE post_id = p.id), 0) AS share_count,
          FALSE AS liked_by_user,
          u.full_name AS user_name, u.avatar_url AS user_avatar, u.uid AS user_uid
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      postsParams = [postsNeeded, postsOffset];
    }
    const postsResult = await query(postsQuery, postsParams);
    const posts = postsResult.rows;

    for (const post of posts) {
      if (post.product_id) {
        const prod = await query('SELECT title, price, slug FROM products WHERE id = $1', [post.product_id]);
        if (prod.rows.length > 0) post.product = prod.rows[0];
      }
    }

    // 2. Products – include slug
    const productsOffset = (page - 1) * productsNeeded;
    const productsResult = await query(
      `SELECT p.id, p.title, p.price, p.description, p.category, p.slug,
         COALESCE(
           (SELECT m.cloudinary_url FROM media m WHERE m.product_id = p.id ORDER BY m.sort_order LIMIT 1),
           '/placeholder.jpg'
         ) AS image
       FROM products p
       WHERE p.is_active = true
       ORDER BY RANDOM()
       LIMIT $1 OFFSET $2`,
      [productsNeeded, productsOffset]
    );
    const products = productsResult.rows.map(p => ({
      ...p,
      description: p.description?.substring(0, 120) || ''
    }));

    // 3. Wattpad Stories
    const wattpadOffset = (page - 1) * wattpadNeeded;
    const wattpadResult = await query(
      `SELECT story_id, title, description, cover_url, author, url
       FROM wattpad_cache
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [wattpadNeeded, wattpadOffset]
    );
    const wattpadStories = wattpadResult.rows.map(s => ({
      ...s,
      image: s.cover_url || '/placeholder.jpg',
    }));

    // Merge
    const items = [];
    let pi = 0, pr = 0, wi = 0;
    while (items.length < limit && (pi < posts.length || pr < products.length || wi < wattpadStories.length)) {
      for (let i = 0; i < 3 && pi < posts.length && items.length < limit; i++) {
        items.push({ type: 'post', data: posts[pi++] });
      }
      if (pr < products.length && items.length < limit) {
        items.push({ type: 'product', data: products[pr++] });
      }
      if (wi < wattpadStories.length && items.length < limit) {
        items.push({ type: 'wattpad', data: wattpadStories[wi++] });
      }
    }
    while (pi < posts.length && items.length < limit) { items.push({ type: 'post', data: posts[pi++] }); }
    while (pr < products.length && items.length < limit) { items.push({ type: 'product', data: products[pr++] }); }
    while (wi < wattpadStories.length && items.length < limit) { items.push({ type: 'wattpad', data: wattpadStories[wi++] }); }

    const hasMore = posts.length === postsNeeded || products.length === productsNeeded || wattpadStories.length === wattpadNeeded;
    return NextResponse.json({ items, page, hasMore });
  } catch (error) {
    console.error('Combined feed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
