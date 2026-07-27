import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req, { params }) {
  const { uid } = await params;

  try {
    const userRes = await query('SELECT id FROM users WHERE uid = $1', [uid]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { rows } = await query(
      'SELECT id, title, price, slug, media FROM products WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userRes.rows[0].id]
    );
    return NextResponse.json({ products: rows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
