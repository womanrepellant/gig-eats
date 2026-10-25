import { cookies } from 'next/headers';

// Constants required by auth routes and lib/supabase-data.ts
export const ACCESS_COOKIE = 'tamu_user';
export const config = { domain: 'tamu.edu' };
export const deliveryReady = true;

// Helper function to parse raw Cookie header strings
export function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Validate @tamu.edu email addresses
export function isTamuEmail(email: string): boolean {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith('@tamu.edu');
}

// Helper JSON response wrapper
export function json(data: any, status = 200) {
  return Response.json(data, { status });
}

// Public user object generator
export function publicUser(email: string) {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  return {
    email: clean,
    name: clean.includes('@') ? clean.split('@')[0] : clean,
  };
}

// Set session cookie with path '/'
export async function setSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set('tamu_user', email, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// Session retriever for server components and API routes
export async function getTamuUser(request?: Request) {
  try {
    let cookieValue: string | undefined;

    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get('tamu_user')?.value || cookieStore.get('access_token')?.value;
    } catch {
      // Fallback if called outside dynamic server context
    }

    if (!cookieValue && request) {
      const headerCookie = request.headers.get('cookie') || '';
      cookieValue = parseCookie(headerCookie, 'tamu_user') || parseCookie(headerCookie, 'access_token') || undefined;
    }

    if (!cookieValue) return null;

    const email = cookieValue.trim().toLowerCase();
    if (!email) return null;

    return {
      userId: email,
      email: email,
      name: email.includes('@') ? email.split('@')[0] : email,
    };
  } catch {
    return null;
  }
}

// Alias helper for user verification
export async function verifiedTamuUser(req: Request) {
  return getTamuUser(req);
}

// Validate request origin for CSRF protection
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

// Stubs for rate limiting & custom fetch helpers
export function throttle(..._args: any[]): boolean {
  return false;
}

export async function authFetch(...args: Parameters<typeof fetch>) {
  return fetch(...args);
}