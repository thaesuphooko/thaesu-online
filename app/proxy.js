import { NextResponse } from 'next/server';

export default async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Block all /dashboard routes unless hash or magic-link token present
  if (pathname.startsWith('/dashboard')) {
    const hash = request.nextUrl.hash.substring(1);
    const token = request.nextUrl.searchParams.get('token');
    const adminHash = process.env.NEXT_PUBLIC_ADMIN_HASH;

    // Allow if hash matches, or if token is present (magic link page)
    if (hash !== adminHash && !token) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // Allow public order API without rate limiting
  if (pathname.startsWith('/api/orders')) return NextResponse.next();

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}
