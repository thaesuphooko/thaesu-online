import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const result = await pool.query(
      `SELECT o.*, 
         (SELECT json_agg(json_build_object(
               'product_id', p.id, 'title', p.title, 
               'price', oi.price, 'quantity', oi.quantity
            ) ORDER BY oi.created_at)
          FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id
         ) AS items,
         u.full_name AS user_name, u.phone AS user_phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Admin Order Detail Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update single order status (also used by admin page dropdown)
export async function PUT(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { id } = await params;
  const { status } = await request.json();
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
