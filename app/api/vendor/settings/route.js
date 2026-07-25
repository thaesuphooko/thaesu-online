import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/vendorAuth';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows } = await pool.query('SELECT store_name, store_slug, phone, email FROM users WHERE id = $1', [vendor.id]);
  return NextResponse.json(rows[0]);
}

export async function PUT(request) {
  const vendor = await verifyVendor(request);
  if (!vendor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { store_name, store_slug, phone, new_password } = body;

  // Update store info
  if (store_name || store_slug || phone) {
    await pool.query(
      'UPDATE users SET store_name = COALESCE($1, store_name), store_slug = COALESCE($2, store_slug), phone = COALESCE($3, phone) WHERE id = $4',
      [store_name, store_slug, phone, vendor.id]
    );
  }
  // Change password if provided
  if (new_password && new_password.length >= 6) {
    const hashed = await hashPassword(new_password);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, vendor.id]);
  }

  return NextResponse.json({ success: true });
}
