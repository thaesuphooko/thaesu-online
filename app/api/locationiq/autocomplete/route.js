import { NextResponse } from 'next/server';

// ========== In-Memory Rate Limiter ==========
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + 60000;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  return entry.count <= 30; // 30 requests per minute
}

// ========== In-Memory Cache ==========
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ========== API Handler ==========
export async function GET(request) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    console.error('❌ LOCATIONIQ_API_KEY not configured');
    return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
  }

  // Check cache
  const cacheKey = `auto:${q}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'X-Response-Time': `${Date.now() - startTime}ms` },
    });
  }

  try {
    const url = `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(q)}&limit=5&accept-language=my&countrycodes=mm&tag=place:city,place:town,place:village,highway:residential`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`LocationIQ Autocomplete HTTP ${res.status}: ${await res.text()}`);
      return NextResponse.json({ error: 'Upstream service error' }, { status: 502 });
    }

    const data = await res.json();
    const suggestions = (Array.isArray(data) ? data : []).map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
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
      place_id: item.place_id,
    }));

    // Cache the result
    setCache(cacheKey, suggestions);

    return NextResponse.json(suggestions, {
      headers: {
        'X-Cache': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error('❌ Autocomplete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
