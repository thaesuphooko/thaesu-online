import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

// Create promotions table if not exists (run once)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
      discount_value DECIMAL(10,2) NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    await ensureTable();
    
    const { product_id, discount_type, discount_value, start_date, end_date } = await request.json();

    if (!product_id || !discount_type || discount_value == null || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['percentage', 'flat'].includes(discount_type)) {
      return NextResponse.json({ error: 'Invalid discount_type' }, { status: 400 });
    }

    if (discount_value <= 0) {
      return NextResponse.json({ error: 'discount_value must be positive' }, { status: 400 });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO promotions (product_id, discount_type, discount_value, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product_id, discount_type, discount_value, start_date, end_date]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Promotion POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
