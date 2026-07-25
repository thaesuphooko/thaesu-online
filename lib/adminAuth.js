import { NextResponse } from 'next/server';

// တစ်မိနစ်အတွင်း အကြိမ်ရေ ကန့်သတ်ရန် (rate limiting) - simple in-memory
const rateLimitMap = new Map();

export function verifyAdminHash(request) {
  // Rate limit (max 30 requests per minute per IP)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + 60000;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  if (entry.count > 30) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let hash = request.headers.get('x-admin-hash');
  if (!hash) {
    const url = new URL(request.url);
    hash = url.searchParams.get('admin_hash');
  }
  if (!hash) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      hash = authHeader.slice(7);
    }
  }

  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_HASH;
  if (!adminSecret) {
    console.error('❌ No admin secret configured');
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  if (!hash || hash !== adminSecret) {
    return NextResponse.json({ error: 'Forbidden: Invalid Admin Credentials' }, { status: 403 });
  }

  return null;
}

export const checkAdmin = verifyAdminHash;
