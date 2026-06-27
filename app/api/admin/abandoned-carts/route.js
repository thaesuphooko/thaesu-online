export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  // Find carts last active > 1 hour ago but not ordered
  const abandoned = await query(
    `SELECT ca.id, ca.user_id, u.email, ca.cart_items, ca.created_at 
     FROM cart_abandonment ca
     JOIN users u ON u.id = ca.user_id
     WHERE ca.reminder_sent = false AND ca.created_at < NOW() - INTERVAL '1 hour'`
  );

  // Send reminders (simulated)
  for (const row of abandoned.rows) {
    // Generate coupon
    const couponCode = 'COMEBACK' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
       VALUES ($1, 'percent', 10, 0, 1, NOW() + INTERVAL '24 hours')`,
      [couponCode]
    );
    await query('UPDATE cart_abandonment SET reminder_sent = true, coupon_code = $1 WHERE id = $2', [couponCode, row.id]);

    // Mock email (using our mock sender)
    const { sendEmail } = await import('@/lib/email');
    sendEmail({
      to: row.email,
      subject: 'You left something behind!',
      html: `<p>Complete your order now and use code <b>${couponCode}</b> for 10% off!</p>`,
    }).catch(() => {});
  }

  return Response.json({ abandoned_carts_reminded: abandoned.rows.length });
}
