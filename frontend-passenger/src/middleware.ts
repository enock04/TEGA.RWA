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

const PROTECTED = ['/dashboard', '/profile', '/booking', '/payment', '/ticket'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const role = token ? getJwtRole(token) : null;

  // Staff users don't belong on passenger app — redirect to their portals
  // (These would be on different ports/domains in production)
  if (role === 'admin' || role === 'agency') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!token && isProtected) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/booking/:path*', '/payment/:path*', '/ticket/:path*'],
};
