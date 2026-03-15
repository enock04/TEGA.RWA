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

const PROTECTED = ['/agency'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const role = token ? getJwtRole(token) : null;

  // Non-agency users don't belong on agency app
  if (token && role !== 'agency') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!token && isProtected) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/agency/:path*'],
};
