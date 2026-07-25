import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Get product - cast id to uuid
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1::uuid', [productId]);
    if (!rows.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = rows[0];
    const currentPrice = parseFloat(product.price);
    
    // Smart pricing logic based on stock levels
    let suggestedPrice;
    if (product.stock <= 5) {
      suggestedPrice = Math.round(currentPrice * 1.15 * 100) / 100;
    } else if (product.stock > 50) {
      suggestedPrice = Math.round(currentPrice * 0.92 * 100) / 100;
    } else {
      const variation = 0.95 + Math.random() * 0.1;
      suggestedPrice = Math.round(currentPrice * variation * 100) / 100;
    }

    suggestedPrice = Math.max(suggestedPrice, 100);

    // Update product price - cast id to uuid
    await pool.query(
      'UPDATE products SET price = $1, ai_priced = true, updated_at = NOW() WHERE id = $2::uuid',
      [suggestedPrice, productId]
    );

    return NextResponse.json({ newPrice: suggestedPrice, oldPrice: currentPrice, productId });
  } catch (error) {
    console.error('❌ AI Price Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
