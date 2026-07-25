import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import pool from '@/lib/db';
import { verifyAdminHash } from '@/lib/adminAuth';

export async function GET(request, { params }) {
  const authError = verifyAdminHash(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const orderRes = await pool.query(`
      SELECT o.*, u.name as user_name, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);
    if (orderRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const order = orderRes.rows[0];
    const itemsRes = await pool.query(`
      SELECT oi.*, p.title as product_title
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);
    order.items = itemsRes.rows;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Build PDF content
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Order ID: ${order.id}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.text(`Customer: ${order.user_name || 'Guest'}`);
    if (order.shipping_address) doc.text(`Address: ${order.shipping_address}`);
    doc.moveDown();
    doc.text('Items:', { underline: true });
    order.items.forEach((item, i) => {
      doc.text(`${i+1}. ${item.product_title || 'Product'} - Qty: ${item.quantity} - Price: ${item.price} Ks`);
    });
    doc.moveDown();
    doc.fontSize(12).text(`Total: ${order.total_amount} Ks`, { bold: true });

    doc.end();

    const pdfBuffer = Buffer.concat(buffers);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${id.slice(0,8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Invoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
