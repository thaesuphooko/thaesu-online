import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import { query } from '@/lib/db';

// In-memory cache and rate limiter
const cache = new Map();
const rateLimitMap = new Map();
const CACHE_TTL = 30000; // 30s
const RATE_LIMIT = 20;   // requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 1; entry.reset = now + 60000; }
  else { entry.count++; }
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

export async function GET(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const cacheKey = `addr_${user.id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ addresses: cached.data, cached: true });
  }

  try {
    const { rows } = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [user.id]);
    cache.set(cacheKey, { data: rows, timestamp: Date.now() });
    return NextResponse.json({ addresses: rows });
  } catch (error) {
    console.error('Address GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await req.json();
    const {
      label, full_name, phone, region, district, township, ward,
      manual_address, is_default, latitude, longitude
    } = body;

    if (!full_name || !phone) {
      return NextResponse.json({ error: 'အမည်နှင့် ဖုန်းနံပါတ် လိုအပ်ပါသည်' }, { status: 400 });
    }

    // Map new fields to legacy columns
    const streetValue = manual_address || '';
    const cityValue = township || '';

    if (is_default) {
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [user.id]);
    }

    const { rows } = await query(
      `INSERT INTO addresses
        (user_id, label, full_name, phone, street, city, state, zip_code, country,
         region, district, township, ward, manual_address, is_default, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        user.id, label || 'နေအိမ်', full_name, phone,
        streetValue, cityValue, null, null, 'Myanmar',
        region || null, district || null, township || null, ward || null,
        manual_address || '', is_default || false,
        latitude || null, longitude || null
      ]
    );
    // Invalidate cache
    cache.delete(`addr_${user.id}`);
    return NextResponse.json({ address: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Address POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
