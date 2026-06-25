import { NextResponse } from 'next/server';

// Time-Gate Middleware for 18+ content
export function middleware(request) {
  // Get current hour in Myanmar Time (UTC+6:30) — adjust for DST if needed
  const now = new Date();
  const myanmarHour = (now.getUTCHours() + 6.5) % 24; // simplified, could use Intl for better accuracy
  const restrictedHour = parseInt(process.env.TIME_GATE_RESTRICTED_HOUR || '20');

  // Check if request path is under /products and query has is_18_plus=true
  // Or hardcode a custom header/slug check. For now, we use a simple query-based check.
  const url = new URL(request.url);
  const is18PlusPage =
    url.pathname.startsWith('/products') &&
    url.searchParams.get('is_18_plus') === 'true';

  // If it's 18+ content and current hour < restricted hour, redirect or block
  if (is18PlusPage && myanmarHour < restrictedHour) {
    // Return a 403 or redirect to a notice page
    return new NextResponse(
      JSON.stringify({ error: '18+ content is only available after 8 PM Myanmar Time.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Allow the request
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/products/:path*', '/api/products/:path*'],
};
