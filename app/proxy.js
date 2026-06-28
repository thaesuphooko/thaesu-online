import { NextResponse } from 'next/server';

export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Allow all dashboard routes (authentication is handled by layout)
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/orders')) return NextResponse.next();

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}
