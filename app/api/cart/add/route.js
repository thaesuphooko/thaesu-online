import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import pool from '@/lib/db';

export async function POST(req) {
  const user = authenticate(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { productId, quantity = 1 } = await req.json();
  if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

  // Check product exists
  const prod = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
  if (prod.rows.length === 0) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  // Insert or update cart item
  const cartItem = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [user.id, productId]
  );
  if (cartItem.rows.length > 0) {
    await pool.query('UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2', [quantity, cartItem.rows[0].id]);
  } else {
    await pool.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)', [user.id, productId, quantity]);
  }
  return NextResponse.json({ success: true });
}
