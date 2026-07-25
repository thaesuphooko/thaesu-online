import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
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
      SELECT o.id, o.created_at, o.total_amount, o.status, o.payment_method, o.shipping_address,
             u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (o.id::text ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
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
    const { rows: orders } = await pool.query(query, params);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

    // Header row
    sheet.columns = [
      { header: 'Order ID', key: 'id', width: 40 },
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'Customer Name', key: 'user_name', width: 25 },
      { header: 'Email', key: 'user_email', width: 30 },
      { header: 'Phone', key: 'user_phone', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 15 },
      { header: 'Shipping Address', key: 'shipping_address', width: 35 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' }, // Purple
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Data rows
    orders.forEach(order => {
      sheet.addRow({
        id: order.id,
        created_at: order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : '',
        user_name: order.user_name || '',
        user_email: order.user_email || '',
        user_phone: order.user_phone || '',
        total_amount: order.total_amount ? parseFloat(order.total_amount) : 0,
        status: order.status || '',
        payment_method: order.payment_method || 'N/A',
        shipping_address: order.shipping_address || '',
      });
    });

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: `I${orders.length + 1}` };

    // Set column alignment for data rows
    for (let i = 2; i <= orders.length + 1; i++) {
      const row = sheet.getRow(i);
      row.alignment = { vertical: 'middle', wrapText: true };
    }

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename with date
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const filename = `orders_${dateStr}_${timeStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
