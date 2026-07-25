import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function PUT(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { ids, status } = await request.json();
  if (!Array.isArray(ids) || !status) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  await pool.query(
    `UPDATE users SET vendor_status = $1 WHERE id = ANY($2::uuid[]) AND role = 'vendor'`,
    [status, ids]
  );
  return NextResponse.json({ success: true });
}
