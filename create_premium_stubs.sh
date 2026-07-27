#!/bin/bash

# Define the premium stub template as a function that writes a route file.
create_premium_stub() {
  local route_dir="$1"   # e.g., "app/api/admin/daily-report"
  mkdir -p "$route_dir"
  cat << 'EOF' > "${route_dir}/route.js"
import { NextResponse } from 'next/server';

// ─── Rate Limiter (generous, 100 req/min) ───
const rateLimitMap = new Map();
const WINDOW = 60_000;
const MAX_REQ = 100;

function checkRateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `premium-stub:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (record && (now - record.start < WINDOW)) {
    record.count++;
    if (record.count > MAX_REQ) return false;
  } else {
    rateLimitMap.set(key, { start: now, count: 1 });
  }
  return true;
}

function logRequest(method, req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  console.log(`[PREMIUM STUB] ${method} ${req.url} from ${ip}`);
}

function successResponse() {
  return new NextResponse(
    JSON.stringify({
      message: 'This feature is coming soon. Stay tuned!',
      status: 'planned',
      available_in: 'next release',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

export async function GET(req) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('GET', req);
  return successResponse();
}
export async function POST(req) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('POST', req);
  return successResponse();
}
export async function PUT(req) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('PUT', req);
  return successResponse();
}
export async function DELETE(req) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  logRequest('DELETE', req);
  return successResponse();
}
EOF
}

# Create stubs for the required admin features
for dir in daily-report db-backup forecast key-tester inventory-predict \
           live live-users report run-health-check run-auto-heal crawler; do
  create_premium_stub "app/api/admin/${dir}"
  echo "✅ Created premium stub for ${dir}"
done
