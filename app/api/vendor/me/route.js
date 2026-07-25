import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

// ========== Configuration ==========
const CACHE_TTL = 30 * 1000; // 30 seconds

// ========== In-memory cache ==========
const cache = new Map();

function getCachedData(vendorId) {
  const entry = cache.get(vendorId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(vendorId);
  return null;
}

function setCacheData(vendorId, data) {
  cache.set(vendorId, { data, timestamp: Date.now() });
}

// ========== API Handler ==========
export async function GET(request) {
  const startTime = Date.now();

  // Verify vendor
  const vendor = await verifyVendor(request);
  if (!vendor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check cache
  const cached = getCachedData(vendor.id);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  }

  try {
    // Fetch vendor profile
    const vendorRes = await pool.query(
      `SELECT id, full_name AS name, email, phone, store_name, store_slug,
              vendor_status AS status, created_at, avatar_url
       FROM users WHERE id = $1`,
      [vendor.id]
    );

    if (vendorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const vendorData = vendorRes.rows[0];

    // If vendor is not approved, return minimal info (pending screen)
    if (vendorData.status !== 'approved') {
      const pendingData = {
        id: vendorData.id,
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone,
        store_name: vendorData.store_name,
        store_slug: vendorData.store_slug,
        status: vendorData.status,
        created_at: vendorData.created_at,
        avatar_url: vendorData.avatar_url,
        stats: null,
        recent_orders: [],
      };
      setCacheData(vendor.id, pendingData);
      return NextResponse.json(pendingData, {
        headers: {
          'X-Cache': 'MISS',
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });
    }

    // Approved vendor – gather statistics
    const [
      productsCount,
      ordersCount,
      revenueRes,
      pendingPayoutsRes,
      avgRatingRes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int FROM products WHERE vendor_id = $1', [vendor.id]),
      pool.query('SELECT COUNT(*)::int FROM orders WHERE vendor_id = $1', [vendor.id]),
      pool.query(
        "SELECT COALESCE(SUM(total_amount),0)::float AS total FROM orders WHERE vendor_id = $1 AND status = 'completed'",
        [vendor.id]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount),0)::float AS total FROM payouts WHERE vendor_id = $1 AND status = 'pending'",
        [vendor.id]
      ),
      pool.query(
        `SELECT COALESCE(AVG(r.rating),0)::float AS avg_rating
         FROM reviews r
         JOIN products p ON r.product_id = p.id
         WHERE p.vendor_id = $1 AND r.rating IS NOT NULL`,
        [vendor.id]
      ),
    ]);

    vendorData.stats = {
      total_products: productsCount.rows[0].count,
      total_orders: ordersCount.rows[0].count,
      total_revenue: revenueRes.rows[0].total,
      pending_payouts: pendingPayoutsRes.rows[0].total,
      average_rating: avgRatingRes.rows[0].avg_rating || 0,
    };

    // Recent 5 orders with customer info and item count
    const recentOrders = await pool.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at,
              u.full_name AS customer_name,
              COUNT(oi.id)::int AS items_count
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.vendor_id = $1
       GROUP BY o.id, u.full_name
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [vendor.id]
    );
    vendorData.recent_orders = recentOrders.rows;

    // Cache the result
    setCacheData(vendor.id, vendorData);

    return NextResponse.json(vendorData, {
      headers: {
        'X-Cache': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error('❌ Vendor/Me API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
