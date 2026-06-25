import { NextResponse } from 'next/server';

export default async function proxy(request) {
  // Rate limiting (optional, require Upstash env variables)
  // if (request.nextUrl.pathname.startsWith('/api/')) {
  //   const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  //   const { success } = await apiLimiter.limit(ip);
  //   if (!success) {
  //     return new NextResponse('Too Many Requests', { status: 429 });
  //   }
  // }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
