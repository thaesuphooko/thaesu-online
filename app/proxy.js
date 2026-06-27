import { NextResponse } from 'next/server';

export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Allow public order API without rate limiting (optional)
  if (pathname.startsWith('/api/orders')) {
    return NextResponse.next();
  }

  // Rate limiting for other API routes (if you have rateLimiter)
  // if (pathname.startsWith('/api/')) { ... }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
