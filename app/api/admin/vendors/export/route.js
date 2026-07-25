import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;
  try {
    const result = await pool.query('SELECT name, email, phone, status, created_at FROM vendors ORDER BY created_at DESC');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vendors');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Joined', key: 'created_at', width: 20 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    result.rows.forEach(row => sheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="vendors.xlsx"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
