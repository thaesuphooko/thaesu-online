import { NextResponse } from 'next/server';

export default function proxy(request) {
  // Admin paths protection (optional – API routes still use checkAdmin)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const adminSession = request.cookies.get('admin_session')?.value;
    // Allow if cookie exists or if it's login page (hash auth is client-side)
    if (!adminSession && !request.nextUrl.pathname.startsWith('/dashboard/login')) {
      // return NextResponse.redirect(new URL('/dashboard/login', request.url));
    }
  }
  return NextResponse.next();
}
