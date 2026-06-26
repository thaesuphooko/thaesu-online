export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('ref');
  if (!code) return NextResponse.redirect(new URL('/', request.url));

  // Record the click
  const referrer = await query('SELECT referrer_id FROM referrals WHERE code = $1', [code]);
  if (referrer.rows.length > 0) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await query('INSERT INTO affiliate_clicks (referrer_id, code, ip_address) VALUES ($1, $2, $3)', 
      [referrer.rows[0].referrer_id, code, ip]);
  }

  // Set cookie so we know this user came from affiliate
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('affiliate_code', code, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return response;
}
