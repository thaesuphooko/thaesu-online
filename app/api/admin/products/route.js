import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '5000');
    
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1',
      [Math.min(limit, 10000)]
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Products GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
