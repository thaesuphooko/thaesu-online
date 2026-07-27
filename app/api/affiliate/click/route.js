import { NextResponse } from 'next/server';
import { safeQuery } from '@/lib/db-wrapper';
import crypto from 'crypto';

// In-memory IP-based rate limiter for clicks (prevents bot floods)
const clickRateLimitMap = new Map();
const CLICK_RATE_LIMIT_WINDOW = 60 * 1000;
const CLICK_RATE_LIMIT_MAX = 30;

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  // Rate limiting
  const key = `click:${ip}`;
  const now = Date.now();
  const record = clickRateLimitMap.get(key);
  if (record && (now - record.start < CLICK_RATE_LIMIT_WINDOW)) {
    record.count++;
    if (record.count > CLICK_RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  } else {
    clickRateLimitMap.set(key, { start: now, count: 1 });
  }
  
  try {
    const body = await req.json();
    if (!body.code) return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    
    // Verify referral code exists
    const { rows: [referrer] } = await safeQuery('SELECT id FROM users WHERE referral_code = $1', [body.code]);
    if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    
    // Record click with hashed fingerprint for deduplication
    const fingerprint = crypto.createHash('sha256').update(`${ip}:${body.code}:${Date.now()}`).digest('hex');
    
    await safeQuery(
      'INSERT INTO affiliate_clicks (referrer_id, code, ip_address, fingerprint) VALUES ($1, $2, $3::inet, $4)',
      [referrer.id, body.code, ip, fingerprint]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Affiliate click error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
