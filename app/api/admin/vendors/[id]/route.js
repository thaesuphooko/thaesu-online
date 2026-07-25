import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function PUT(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { id } = await params;
  const body = await request.json();
  const { status, name, email, phone } = body;

  // If status update only
  if (status && !name && !email && !phone) {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    await pool.query('UPDATE users SET vendor_status = $1 WHERE id = $2 AND role = \'vendor\'', [status, id]);
    return NextResponse.json({ success: true });
  }

  // If updating vendor details
  if (name || email || phone) {
    const updates = [];
    const values = [];
    let idx = 1;
    if (name) { updates.push(`full_name = $${idx++}`); values.push(name); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }
    if (phone) { updates.push(`phone = $${idx++}`); values.push(phone); }
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} AND role = 'vendor' RETURNING id, full_name AS name, email, phone, store_name, store_slug, vendor_status AS status`,
      values
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
}
