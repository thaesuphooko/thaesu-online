import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Coupons');
    sheet.columns = [
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Type', key: 'discount_type', width: 15 },
      { header: 'Value', key: 'discount_value', width: 10 },
      { header: 'Max Uses', key: 'max_uses', width: 10 },
      { header: 'Used', key: 'used_count', width: 10 },
      { header: 'Expires', key: 'expires_at', width: 20 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    result.rows.forEach(row => sheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="coupons.xlsx"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
