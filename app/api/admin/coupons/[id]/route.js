import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function PUT(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { id } = await params;
  try {
    const { code, discount_type, discount_value, max_uses, expires_at } = await request.json();
    const result = await pool.query(
      `UPDATE coupons SET code=COALESCE($2,code), discount_type=COALESCE($3,discount_type), discount_value=COALESCE($4,discount_value), max_uses=$5, expires_at=$6 WHERE id=$1 RETURNING *`,
      [id, code, discount_type, discount_value, max_uses || null, expires_at || null]
    );
    if (result.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  const { id } = await params;
  try {
    await pool.query('DELETE FROM coupons WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
