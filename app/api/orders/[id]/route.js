import { NextResponse } from 'next/server';
import pool from '@/lib/db'; // Use default pool export

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    // Fetch order details with structured items
    const res = await pool.query(
      `SELECT o.*, 
         (SELECT json_agg(json_build_object(
               'product_id', p.id, 'title', p.title, 
               'price', oi.price, 'quantity', oi.quantity, 
               'image', (SELECT m.cloudinary_url FROM media m WHERE m.product_id = p.id ORDER BY m.sort_order LIMIT 1)
            ) ORDER BY oi.created_at)
          FROM order_items oi 
          JOIN products p ON oi.product_id = p.id 
          WHERE oi.order_id = o.id
         ) AS items
       FROM orders o WHERE o.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = res.rows[0];
    // Ensure items is always an array
    order.items = order.items || [];

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
