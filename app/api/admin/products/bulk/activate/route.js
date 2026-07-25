import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function PATCH(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { ids, is_active } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }
    
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const allParams = [...ids, is_active];
    
    await pool.query(
      `UPDATE products SET is_active = $${ids.length + 1}, updated_at = NOW() WHERE id IN (${placeholders})`,
      allParams
    );

    return NextResponse.json({ success: true, affected: ids.length, is_active });
  } catch (error) {
    console.error('Bulk Activate Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
