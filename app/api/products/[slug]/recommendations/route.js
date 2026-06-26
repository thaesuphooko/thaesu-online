import { query } from '@/lib/db';

export async function GET(request, { params }) {
  const { slug } = await params;
  const productRes = await query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (productRes.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const productId = productRes.rows[0].id;

  // Find orders that contain this product
  const relatedOrders = await query(
    `SELECT DISTINCT order_id FROM order_items WHERE product_id = $1 LIMIT 50`,
    [productId]
  );

  if (relatedOrders.rows.length === 0) {
    // Fallback: recommend random active products
    const random = await query(
      `SELECT id, title, slug, price, 
        (SELECT cloudinary_url FROM media WHERE product_id = products.id ORDER BY sort_order LIMIT 1) as image_url
      FROM products WHERE is_active = true AND id != $1 ORDER BY RANDOM() LIMIT 4`,
      [productId]
    );
    return Response.json(random.rows);
  }

  const orderIds = relatedOrders.rows.map(r => r.order_id);

  // Find other products bought together
  const recommendations = await query(
    `SELECT p.id, p.title, p.slug, p.price,
      COUNT(*) as frequency,
      (SELECT cloudinary_url FROM media WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image_url
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id AND p.is_active = true
    WHERE oi.order_id = ANY($1) AND p.id != $2
    GROUP BY p.id
    ORDER BY frequency DESC
    LIMIT 4`,
    [orderIds, productId]
  );

  if (recommendations.rows.length === 0) {
    // Fallback: random active products
    const random = await query(
      `SELECT id, title, slug, price,
        (SELECT cloudinary_url FROM media WHERE product_id = products.id ORDER BY sort_order LIMIT 1) as image_url
      FROM products WHERE is_active = true AND id != $1 ORDER BY RANDOM() LIMIT 4`,
      [productId]
    );
    return Response.json(random.rows);
  }

  return Response.json(recommendations.rows);
}
