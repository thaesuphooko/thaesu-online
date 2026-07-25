import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await pool.query('SELECT * FROM payouts WHERE vendor_id = $1 ORDER BY created_at DESC', [vendor.id]);
  const summary = await pool.query(
    'SELECT COALESCE(SUM(amount),0)::float AS total_earnings FROM payouts WHERE vendor_id = $1 AND status = \'approved\'',
    [vendor.id]
  );
  return NextResponse.json({ payouts: result.rows, total_earnings: summary.rows[0].total_earnings });
}

export async function POST(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { amount } = await request.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  const { rows } = await pool.query(
    'INSERT INTO payouts (vendor_id, amount) VALUES ($1,$2) RETURNING *',
    [vendor.id, amount]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
