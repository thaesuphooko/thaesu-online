import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const configRes = await query("SELECT value FROM config WHERE key = 'tracking_timings'");
    if (configRes.rows.length === 0) return NextResponse.json({ error: 'Config not found' }, { status: 500 });
    const timings = configRes.rows[0].value;

    // Update pending → confirmed after order_received seconds
    await query(
      `UPDATE orders SET status = 'confirmed', updated_at = NOW()
       WHERE status = 'pending' AND created_at <= NOW() - INTERVAL '${timings.order_received} seconds'`
    );

    // Update confirmed → processing after processing seconds
    await query(
      `UPDATE orders SET status = 'processing', updated_at = NOW()
       WHERE status = 'confirmed' AND created_at <= NOW() - INTERVAL '${timings.processing} seconds'`
    );

    // Update processing → shipped after shipped seconds (also set shipping_started_at)
    await query(
      `UPDATE orders SET status = 'shipped', shipping_started_at = NOW(), updated_at = NOW()
       WHERE status = 'processing' AND created_at <= NOW() - INTERVAL '${timings.shipped} seconds'`
    );

    // Update shipped → delivered after delivered seconds
    await query(
      `UPDATE orders SET status = 'delivered', updated_at = NOW()
       WHERE status = 'shipped' AND created_at <= NOW() - INTERVAL '${timings.delivered} seconds'`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
