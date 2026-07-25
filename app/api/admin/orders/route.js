import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  try {
    let query = `
      SELECT o.id, o.created_at, o.total_amount, o.status, o.shipping_address,
             u.name as user_name, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (o.id::text ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`;
      paramIdx++;
    }
    if (status) {
      params.push(status);
      query += ` AND o.status = $${paramIdx}`;
      paramIdx++;
    }
    if (from) {
      params.push(from);
      query += ` AND DATE(o.created_at) >= $${paramIdx}`;
      paramIdx++;
    }
    if (to) {
      params.push(to);
      query += ` AND DATE(o.created_at) <= $${paramIdx}`;
      paramIdx++;
    }

    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Orders API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Bulk status update (for multi-select)
export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { ids, status } = await request.json();
    if (!ids || !status) return NextResponse.json({ error: 'Missing ids or status' }, { status: 400 });

    // Update multiple orders
    await pool.query(`UPDATE orders SET status = $1 WHERE id = ANY($2::uuid[])`, [status, ids]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bulk status update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
