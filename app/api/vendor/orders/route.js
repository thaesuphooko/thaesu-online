import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  let where = 'WHERE o.vendor_id = $1';
  const params = [vendor.id];
  if (status !== 'all') { where += ' AND o.status = $2'; params.push(status); }

  const result = await pool.query(
    `SELECT o.*, u.full_name AS customer_name FROM orders o JOIN users u ON o.user_id = u.id ${where} ORDER BY o.created_at DESC`,
    params
  );
  return NextResponse.json(result.rows);
}

export async function PATCH(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { orderId, status } = await request.json();
  await pool.query('UPDATE orders SET status = $1 WHERE id = $2 AND vendor_id = $3', [status, orderId, vendor.id]);
  return NextResponse.json({ success: true });
}
