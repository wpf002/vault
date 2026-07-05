import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Login-first gate: nothing in the app — not even the catalog — is visible
 * without an account. Any unauthenticated request to a page is redirected
 * to /login. The auth routes (/login, /api/auth/*) and Next's own static
 * assets are the only things reachable signed out; the register endpoint
 * lives under /api/auth so it stays reachable before an account exists.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    const login = new URL('/login', req.url);
    // remember where they were headed so we can send them back after sign-in
    if (req.nextUrl.pathname !== '/') login.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
