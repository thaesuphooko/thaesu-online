import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function PATCH(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { ids, factor } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }
    
    if (!factor || typeof factor !== 'number') {
      return NextResponse.json({ error: 'Invalid factor' }, { status: 400 });
    }

    // Update prices: multiply by factor and round to 2 decimal places
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const allParams = [...ids];
    
    await pool.query(
      `UPDATE products SET price = ROUND(price * $${ids.length + 1}::numeric, 2), updated_at = NOW() WHERE id IN (${placeholders})`,
      [...allParams, factor]
    );

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    console.error('Bulk Price Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
