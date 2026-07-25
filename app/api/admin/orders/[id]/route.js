import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    // Order header
    const orderRes = await pool.query(`
      SELECT o.*, u.name as user_name, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);
    if (orderRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Order items
    const itemsRes = await pool.query(`
      SELECT oi.*, p.title as product_title
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    const order = orderRes.rows[0];
    order.items = itemsRes.rows;
    return NextResponse.json(order);
  } catch (error) {
    console.error('Order detail error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update single order status
export async function PUT(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const { status } = await request.json();
    if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
