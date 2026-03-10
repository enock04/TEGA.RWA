import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED = ['/dashboard', '/profile', '/booking', '/payment', '/ticket'];
// Routes that require admin/agency role
const ADMIN_ONLY = ['/admin'];
// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  // For admin routes, check token presence (role check happens server-side in API)
  const isAdminRoute = ADMIN_ONLY.some(p => pathname.startsWith(p));
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p));

  // No token + protected route → redirect to login
  if ((isAdminRoute || isProtected) && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/booking/:path*',
    '/payment/:path*',
    '/ticket/:path*',
    '/admin/:path*',
  ],
};
