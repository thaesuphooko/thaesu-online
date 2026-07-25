import { NextResponse } from 'next/server';

// Reuse rate limiter & cache (same pattern)
const rateLimitMap2 = new Map();
function checkRateLimit2(ip) {
  const now = Date.now();
  const entry = rateLimitMap2.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + 60000;
  } else {
    entry.count++;
  }
  rateLimitMap2.set(ip, entry);
  return entry.count <= 30;
}

const cacheGeo = new Map();
const CACHE_TTL_GEO = 10 * 60 * 1000;

function getCachedGeo(key) {
  const entry = cacheGeo.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_GEO) return entry.data;
  cacheGeo.delete(key);
  return null;
}

function setCacheGeo(key, data) {
  cacheGeo.set(key, { data, timestamp: Date.now() });
}

export async function GET(request) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (!checkRateLimit2(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });

  const cacheKey = `geo:${q}`;
  const cached = getCachedGeo(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT', 'X-Response-Time': `${Date.now() - startTime}ms` } });
  }

  try {
    const url = `https://api.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=my&countrycodes=mm`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Geocode HTTP ${res.status}`);
      return NextResponse.json({ error: 'Geocoding service error' }, { status: 502 });
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const result = {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name,
        type: item.type,
        importance: item.importance,
        address: {
          house_number: item.address?.house_number,
          road: item.address?.road,
          suburb: item.address?.suburb,
          city: item.address?.city || item.address?.town,
          state: item.address?.state,
          postcode: item.address?.postcode,
          country: item.address?.country,
        },
      };
      setCacheGeo(cacheKey, result);
      return NextResponse.json(result, { headers: { 'X-Cache': 'MISS', 'X-Response-Time': `${Date.now() - startTime}ms` } });
    }
    return NextResponse.json(null, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    console.error('❌ Geocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
