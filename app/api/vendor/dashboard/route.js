import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const products = await pool.query('SELECT COUNT(*)::int FROM products WHERE vendor_id = $1', [vendor.id]);
    const orders = await pool.query('SELECT COUNT(*)::int FROM orders WHERE vendor_id = $1', [vendor.id]);
    const revenue = await pool.query('SELECT COALESCE(SUM(total),0)::float FROM orders WHERE vendor_id = $1 AND status = \'completed\'', [vendor.id]);

    return NextResponse.json({
      products: products.rows[0].count,
      orders: orders.rows[0].count,
      revenue: revenue.rows[0].sum || 0
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
