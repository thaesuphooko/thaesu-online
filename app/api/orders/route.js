import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { withTransaction } from '@/lib/db-wrapper';
import { withErrorHandler, validateBody } from '@/lib/api-wrapper';

// POST – Create order (ACID)
export const POST = withErrorHandler(async (req) => {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let user;
  try {
    user = verifyToken(token);
    if (!user?.id) throw new Error('Invalid token');
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const body = await req.json();
  validateBody(body, ['items']);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'At least one order item is required' }, { status: 400 });
  }

  const order = await withTransaction(async (client) => {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        throw Object.assign(new Error('Each item must have product_id and quantity >= 1'), { statusCode: 400 });
      }
      const { rows: [product] } = await client.query(
        'SELECT id, title, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );
      if (!product) throw Object.assign(new Error(`Product not found: ${item.product_id}`), { statusCode: 404 });
      if (product.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for "${product.title}"`), { statusCode: 409 });

      const lineTotal = parseFloat(product.price) * item.quantity;
      totalAmount += lineTotal;
      orderItems.push({ product_id: product.id, title: product.title, quantity: item.quantity, price: product.price });
    }

    for (const item of orderItems) {
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1', [item.quantity, item.product_id]);
    }

    const { rows: [order] } = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, payment_status, shipping_address, phone)
       VALUES ($1, $2, 'pending', 'unpaid', $3, $4) RETURNING *`,
      [user.id, totalAmount.toFixed(2), body.shipping_address ? JSON.stringify(body.shipping_address) : null, body.phone || null]
    );

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, quantity, price) VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.title, item.quantity, item.price]
      );
    }

    return order;
  });

  return NextResponse.json(order, { status: 201 });
});

// GET – List user orders with pagination & filter
export const GET = withErrorHandler(async (req) => {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let user;
  try {
    user = verifyToken(token);
    if (!user?.id) throw new Error('Invalid token');
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status');

  let where = 'WHERE o.user_id = $1';
  const params = [user.id];
  if (status) {
    where += ` AND o.status = $${params.length + 1}`;
    params.push(status);
  }

  const { rows: orders } = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT o.*, COALESCE(json_agg(json_build_object('product_id', oi.product_id, 'title', oi.product_title, 'quantity', oi.quantity, 'price', oi.price)) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
       ${where} GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return rows;
  });

  const { rows: [{ count }] } = await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT COUNT(*)::int FROM orders ${where}`, params);
    return rows;
  });

  return NextResponse.json({
    orders,
    pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(parseInt(count) / limit) }
  });
});
