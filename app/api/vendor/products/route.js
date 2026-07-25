import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await pool.query('SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC', [vendor.id]);
  return NextResponse.json(result.rows);
}

export async function POST(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, price, stock, category, description } = await request.json();
  const { rows } = await pool.query(
    'INSERT INTO products (vendor_id, title, price, stock, category, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [vendor.id, title, price, stock, category, description || '']
  );
  return NextResponse.json(rows[0], { status: 201 });
}
