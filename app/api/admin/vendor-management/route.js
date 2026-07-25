import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  let where = "WHERE u.role = 'vendor'";
  const params = [];
  if (status !== 'all') {
    where += ' AND u.vendor_status = $1';
    params.push(status);
  }

  const result = await pool.query(`
    SELECT 
      u.id, u.full_name AS name, u.email, u.phone,
      u.store_name, u.store_slug,
      COALESCE(u.vendor_status, 'pending') AS status, u.created_at,
      COUNT(p.id)::int AS product_count
    FROM users u
    LEFT JOIN products p ON p.vendor_id = u.id
    ${where}
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, params);

  return NextResponse.json({ vendors: result.rows });
}
