import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function DELETE(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }

    // Use parameterized query for safety
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const { rowCount } = await pool.query(
      `DELETE FROM products WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({ deleted: rowCount });
  } catch (error) {
    console.error('Bulk Delete Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
