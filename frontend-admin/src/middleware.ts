import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return decoded?.role ?? null;
  } catch { return null; }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const role = token ? getJwtRole(token) : null;

  // Allow unauthenticated access to the login page
  if (pathname === '/admin/login') return NextResponse.next();

  const isAdminRoute  = pathname.startsWith('/admin');
  const isAgencyRoute = pathname.startsWith('/agency');

  if (!isAdminRoute && !isAgencyRoute) return NextResponse.next();

  // Not logged in — redirect to login
  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Wrong role for the section they're trying to access
  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (isAgencyRoute && role !== 'agency') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/agency', '/agency/:path*'],
};
