import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function DELETE(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  try {
    const { ids } = await request.json();
    if (!ids || !ids.length) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    await pool.query('DELETE FROM coupons WHERE id = ANY($1::uuid[])', [ids]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
