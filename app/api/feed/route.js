import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    // Fetch random products – limit 8, with media
    const result = await pool.query(
      `SELECT id, title, price, description, media, category, created_at
       FROM products
       WHERE is_active = true AND media IS NOT NULL AND jsonb_array_length(media) > 0
       ORDER BY RANDOM()
       LIMIT 8`
    );

    // For each product, pick a random image URL from media array
    const products = result.rows.map(product => {
      let image = '/placeholder.jpg';
      if (product.media && Array.isArray(product.media) && product.media.length > 0) {
        // Choose a random image from media array
        const randomIndex = Math.floor(Math.random() * product.media.length);
        image = product.media[randomIndex]?.url || '/placeholder.jpg';
      }
      return {
        ...product,
        image,
        // Remove large description to save payload (optional)
        description: product.description?.substring(0, 120) || ''
      };
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Feed products error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
