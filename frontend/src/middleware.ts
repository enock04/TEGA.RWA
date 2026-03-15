import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Decode JWT payload without verifying the signature (routing only — API still enforces auth)
function getJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return decoded?.role ?? null;
  } catch {
    return null;
  }
}

// Passenger-facing routes
const PASSENGER_ROUTES = ['/dashboard', '/profile', '/booking', '/payment', '/ticket'];
// Staff-only routes
const STAFF_ONLY = ['/admin', '/agency'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect the login pages themselves
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get('accessToken')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  const isStaffRoute = STAFF_ONLY.some(p => pathname.startsWith(p));
  const isPassengerRoute = PASSENGER_ROUTES.some(p => pathname.startsWith(p));

  // Not authenticated → redirect to appropriate login
  if (!token) {
    if (isStaffRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (isPassengerRoute) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Decode role from JWT payload
  const role = getJwtRole(token);

  // Enforce role boundaries
  if (role === 'admin') {
    if (isPassengerRoute) return NextResponse.redirect(new URL('/admin', request.url));
    if (pathname.startsWith('/agency')) return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (role === 'agency') {
    if (isPassengerRoute) return NextResponse.redirect(new URL('/agency', request.url));
    if (pathname.startsWith('/admin')) return NextResponse.redirect(new URL('/agency', request.url));
  }

  if (role === 'passenger') {
    if (isStaffRoute) return NextResponse.redirect(new URL('/auth/login', request.url));
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
    '/agency/:path*',
  ],
};
