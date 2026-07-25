import { NextResponse } from 'next/server';
import { verifyAdminHash } from '@/lib/adminAuth';
import pool from '@/lib/db';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');

    // Build CSV
    const headers = ['ID', 'Title', 'Price', 'Stock', 'Category', 'AI Priced', 'Active', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const p of rows) {
      csvRows.push([
        p.id,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.price,
        p.stock,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.ai_priced ? 'Yes' : 'No',
        p.is_active !== false ? 'Yes' : 'No',
        p.created_at ? new Date(p.created_at).toISOString() : ''
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV Export Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
