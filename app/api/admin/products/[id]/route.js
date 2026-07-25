import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function PUT(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    
    // Allowed fields to update
    const allowedFields = ['title', 'price', 'stock', 'category', 'is_active'];
    const updates = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIdx}::uuid RETURNING *`,
      values
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('❌ Product PUT Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1::uuid', [id]);
    
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Product DELETE Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
