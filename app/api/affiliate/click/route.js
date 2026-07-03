import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    // ✅ Correct way to read headers
    const headersList = await headers();
    const authHeader = headersList.get('authorization');  // optional

    const body = await request.json();
    const { code, total_amount } = body;
    const finalAmount = Number(total_amount) || 0;

    const cookieStore = cookies();
    const existing = cookieStore.get('affiliate_code')?.value;
    if (!existing || existing !== code) {
      cookieStore.set('affiliate_code', code, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    }

    // Log click (ignoring errors)
    try {
      await query(
        `INSERT INTO affiliate_clicks (code, total_amount, created_at) VALUES ($1, $2, NOW())`,
        [code, finalAmount]
      );
    } catch (e) { /* ignore */ }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Affiliate click error:', err);
    return NextResponse.json({
      error: 'Internal error',
      details: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
