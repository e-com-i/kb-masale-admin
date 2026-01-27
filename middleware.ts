import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth'];

// Check if the path is a public route
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(route => pathname.startsWith(route));
};

// Get allowed admin emails from environment
const getAllowedAdmins = (): string[] => {
  const adminList = process.env.ALLOWED_ADMIN_EMAILS || '';
  return adminList
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    // Get the JWT token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // No token = not authenticated
    if (!token) {
      console.log(`Middleware: No token, redirecting to login from ${pathname}`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify email exists
    if (!token.email) {
      console.error('Middleware: Token exists but no email');
      return NextResponse.redirect(new URL('/login?error=NoEmail', request.url));
    }

    // STRICT: Re-validate admin status on EVERY request
    const allowedAdmins = getAllowedAdmins();
    const isAdmin = allowedAdmins.includes((token.email as string).toLowerCase());

    if (!isAdmin) {
      console.error(`Middleware: ${token.email} is not an authorized admin`);
      // Clear any session and redirect to login with error
      const response = NextResponse.redirect(
        new URL('/login?error=AccessDenied', request.url)
      );
      // Delete the session cookie
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      return response;
    }

    // Check token age - force re-auth if token is too old (8 hours)
    const tokenAge = token.authTime ? Date.now() - (token.authTime as number) : Infinity;
    const maxTokenAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    if (tokenAge > maxTokenAge) {
      console.log('Middleware: Token expired, forcing re-authentication');
      const response = NextResponse.redirect(
        new URL('/login?error=SessionExpired', request.url)
      );
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      return response;
    }

    // Add security headers to response
    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    // Add user info to headers for logging (not sensitive)
    response.headers.set('X-User-Email-Hash', hashEmail(token.email as string));

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On any error, redirect to login for safety
    return NextResponse.redirect(new URL('/login?error=AuthError', request.url));
  }
}

// Simple hash function for logging (not cryptographic)
function hashEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
