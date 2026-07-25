import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [orderRes, revenueRes, productRes, userRes] = await Promise.all([
      query('SELECT COUNT(*) FROM orders').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COALESCE(SUM(total_amount),0) FROM orders').catch(() => ({ rows: [{ coalesce: 0 }] })),
      query('SELECT COUNT(*) FROM products').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) FROM users').catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    return NextResponse.json({
      totalOrders: parseInt(orderRes.rows[0].count),
      totalRevenue: parseFloat(revenueRes.rows[0].coalesce).toFixed(2),
      totalProducts: parseInt(productRes.rows[0].count),
      totalUsers: parseInt(userRes.rows[0].count),
    });
  } catch (error) {
    return NextResponse.json({ totalOrders:0, totalRevenue:"0.00", totalProducts:0, totalUsers:0 });
  }
}
