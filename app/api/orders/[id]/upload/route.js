export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (using first account)
const cloudinaryConfig = () => {
  const url = process.env.CLOUDINARY_URL_1 || process.env.CLOUDINARY_URL;
  if (!url) return null;
  const parsed = new URL(url);
  return {
    cloud_name: parsed.host,
    api_key: parsed.username,
    api_secret: parsed.password,
  };
};

export async function POST(request, { params }) {
  const { id } = await params;
  // Check order exists and is pending
  const orderRes = await query('SELECT id, status, timer_expiry FROM orders WHERE id = $1', [id]);
  if (orderRes.rows.length === 0) return Response.json({ error: 'Order not found' }, { status: 404 });
  const order = orderRes.rows[0];
  if (order.status !== 'pending' || new Date(order.timer_expiry) < new Date()) {
    return Response.json({ error: 'Order expired or already processed' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

  // Save to temporary folder
  const tmpDir = process.env.HOME + '/tmp';
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const tempPath = path.join(tmpDir, `screenshot_${id}_${Date.now()}.jpg`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(tempPath, buffer);

  // Upload to Cloudinary (if configured)
  let screenshotUrl = null;
  const cloud = cloudinaryConfig();
  if (cloud) {
    cloudinary.config(cloud);
    try {
      const uploadRes = await cloudinary.uploader.upload(tempPath, { folder: 'thaesu_screenshots' });
      screenshotUrl = uploadRes.secure_url;
    } catch (e) { console.error('Cloudinary upload failed', e); }
  }

  // If Cloudinary not available, store the local path (for demo only)
  if (!screenshotUrl) screenshotUrl = tempPath;

  await unlink(tempPath);

  // Update order
  await query('UPDATE orders SET screenshot_url = $1, payment_status = $2 WHERE id = $3', [screenshotUrl, 'paid', id]);

  // Notify admin via Telegram with inline keyboard
  const itemsRes = await query('SELECT oi.product_title, oi.quantity, oi.price FROM order_items oi WHERE oi.order_id = $1', [id]);
  const items = itemsRes.rows;
  const totalRes = await query('SELECT total_amount, phone FROM orders WHERE id = $1', [id]);
  const { total_amount, phone } = totalRes.rows[0];
  const { sendOrderNotificationWithKeyboard } = await import('@/lib/telegram');
  sendOrderNotificationWithKeyboard(id, items, total_amount, phone, screenshotUrl).catch(console.error);

  return Response.json({ message: 'Screenshot uploaded, waiting for admin confirmation' });
}
