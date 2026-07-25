import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  try {
    const { code, discount_type, discount_value, max_uses, expires_at } = await request.json();
    if (!code || !discount_type || !discount_value) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const result = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [code, discount_type, discount_value, max_uses || null, expires_at || null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
