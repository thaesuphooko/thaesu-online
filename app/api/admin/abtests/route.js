import { NextResponse } from 'next/server';

// ── Rate Limiting (in‑memory) ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30;        // max requests per window

function rateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `abtests:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && (now - record.start < RATE_LIMIT_WINDOW)) {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) return false;
  } else {
    rateLimitMap.set(key, { start: now, count: 1 });
  }
  return true;
}

// ── Constants ──────────────────────────────────
const NEW_URL = '/api/admin/ab-tests';
const BASE = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const FULL_URL = `${BASE}${NEW_URL}`;

// ── Helpers ────────────────────────────────────
function redirectResponse() {
  return new NextResponse(
    JSON.stringify({
      message: 'This endpoint has been permanently moved.',
      new_url: FULL_URL,
      note: 'Please update your client to use the new URL.',
    }),
    {
      status: 308,
      headers: {
        'Content-Type': 'application/json',
        Location: NEW_URL,
        'X-Deprecation': 'true',
        'X-Deprecation-Message': 'Use /api/admin/ab-tests instead',
      },
    }
  );
}

function logRequest(method, ip) {
  console.log(`[AB-TESTS-DEPRECATED] ${method} from ${ip} → redirected to ${NEW_URL}`);
}

// ── Route Handlers ────────────────────────────
export async function GET(request) {
  if (!rateLimit(request)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('GET', request.headers.get('x-forwarded-for'));
  return redirectResponse();
}

export async function POST(request) {
  if (!rateLimit(request)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('POST', request.headers.get('x-forwarded-for'));
  return redirectResponse();
}

export async function PUT(request) {
  if (!rateLimit(request)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('PUT', request.headers.get('x-forwarded-for'));
  return redirectResponse();
}

export async function DELETE(request) {
  if (!rateLimit(request)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('DELETE', request.headers.get('x-forwarded-for'));
  return redirectResponse();
}
