import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

// ========== Cache & Config ==========
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function loadData() {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_DURATION) return cachedData;
  try {
    const filePath = path.join(process.cwd(), 'lib', 'myanmarTownshipsData.json');
    const raw = readFileSync(filePath, 'utf-8');
    cachedData = JSON.parse(raw);
    cacheTime = now;
    console.log('✅ Myanmar locations data loaded & cached');
  } catch (error) {
    console.error('❌ Failed to load locations data:', error.message);
    throw new Error('Locations data unavailable');
  }
  return cachedData;
}

// ========== Simple In-Memory Rate Limiter ==========
const rateLimitMap = new Map();
const RATE_LIMIT = 30; // requests per minute

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
  return entry.count <= RATE_LIMIT;
}

// ========== Validation ==========
const ALLOWED_LEVELS = ['region', 'district', 'township', 'ward'];

function validateParams(level, region, district, township) {
  if (!level || !ALLOWED_LEVELS.includes(level)) {
    return 'Invalid or missing level parameter. Allowed: region, district, township, ward';
  }
  if ((level === 'district' || level === 'township' || level === 'ward') && !region) {
    return 'Region parameter is required for this level';
  }
  if ((level === 'township' || level === 'ward') && !district) {
    return 'District parameter is required for this level';
  }
  if (level === 'ward' && !township) {
    return 'Township parameter is required for ward level';
  }
  return null;
}

// ========== API Handler ==========
export async function GET(request) {
  const startTime = Date.now();

  // Rate limit check
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const region = searchParams.get('region');
    const district = searchParams.get('district');
    const township = searchParams.get('township');

    // Validate
    const validationError = validateParams(level, region, district, township);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const data = loadData();
    let result = [];

    switch (level) {
      case 'region':
        result = Object.keys(data).map(name => ({ name }));
        break;

      case 'district': {
        const districtsObj = data[region];
        if (!districtsObj) {
          return NextResponse.json({ error: `Region '${region}' not found` }, { status: 404 });
        }
        result = Object.keys(districtsObj).map(name => ({ name }));
        break;
      }

      case 'township': {
        const districtsObj = data[region];
        if (!districtsObj) {
          return NextResponse.json({ error: `Region '${region}' not found` }, { status: 404 });
        }
        const townshipsArr = districtsObj[district];
        if (!townshipsArr) {
          return NextResponse.json({ error: `District '${district}' not found in '${region}'` }, { status: 404 });
        }
        result = townshipsArr.map(name => ({ name }));
        break;
      }

      case 'ward': {
        // No ward data in JSON, generate default
        for (let i = 1; i <= 10; i++) {
          result.push({ name: `ရပ်ကွက် ${i}` });
        }
        result.push({ name: 'ကျေးရွာအုပ်စုများ' });
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    const responseTime = Date.now() - startTime;
    console.log(`📍 Locations API | ${level} | ${region || '-'} | ${district || '-'} | ${township || '-'} | ${responseTime}ms | ${result.length} results`);

    return NextResponse.json(result, {
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache': cachedData ? 'HIT' : 'MISS',
        'X-Total-Results': result.length.toString(),
      },
    });
  } catch (error) {
    console.error('Locations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
