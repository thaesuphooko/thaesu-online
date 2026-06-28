export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import PDFDocument from 'pdfkit';
export async function GET(request, { params }) {
  const { id } = await params;
  const order = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (order.rows.length === 0) return new Response('Not found', { status: 404 });
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.fontSize(16).text('Invoice #' + order.rows[0].id.slice(0,8));
  doc.text('Total: ' + order.rows[0].total_amount + ' Ks');
  items.rows.forEach(item => doc.text(item.product_title + ' x' + item.quantity));
  doc.end();
  const pdfBuffer = await new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  return new Response(pdfBuffer, { headers: { 'Content-Type': 'application/pdf' } });
}
