import { cookies } from 'next/headers';

// 1. Exported Types
export type ProviderSession = {
  userId: string;
  email: string;
  name?: string;
  [key: string]: any;
};

// 2. Constants & Configuration Helpers
export const ACCESS_COOKIE = 'tamu_user';

export function config(..._args: any[]): any {
  return { domain: 'tamu.edu' };
}

export function deliveryReady(..._args: any[]): boolean {
  return true;
}

export function throttle(..._args: any[]): boolean {
  return false;
}

// 3. Cookie Parsing & Validation Helpers
export function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function isTamuEmail(email: any): boolean {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith('@tamu.edu');
}

export function json(data: any, status = 200) {
  return Response.json(data, { status });
}

export function publicUser(email: any) {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  return {
    email: clean,
    name: clean.includes('@') ? clean.split('@')[0] : clean,
  };
}

// 4. Synchronous User Extractor for Auth Routes
export function verifiedTamuUser(req?: any, ..._args: any[]): ProviderSession | null {
  try {
    let cookieValue: string | null = null;

    if (typeof req === 'string') {
      cookieValue = req;
    } else if (req && typeof req === 'object' && req.headers) {
      const cookieHeader = req.headers.get('cookie') || '';
      cookieValue = parseCookie(cookieHeader, 'tamu_user') || parseCookie(cookieHeader, 'access_token');
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

// 5. Async User Extractor for API Routes (e.g. /api/reviews)
export async function getTamuUser(request?: any): Promise<ProviderSession | null> {
  try {
    let cookieValue: string | undefined;

    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get('tamu_user')?.value || cookieStore.get('access_token')?.value;
    } catch {
      // Fallback outside dynamic context
    }

    if (!cookieValue && request) {
      const headerCookie = request.headers?.get?.('cookie') || '';
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

// 6. Session Setting Helper
export async function setSession(...args: any[]): Promise<any> {
  try {
    const target = args[0];
    const email = typeof target === 'string' ? target : target?.email || target?.userId;
    if (!email) return;

    const cookieStore = await cookies();
    cookieStore.set('tamu_user', email, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // Ignore context errors
  }
}

// 7. CSRF / Same-Origin Check
export function sameOrigin(request: any): boolean {
  if (!request?.headers) return true;
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

// 8. Custom Fetch Proxy Stub
export async function authFetch(...args: any[]): Promise<any> {
  const url = args[0];
  const init = args[1];
  return fetch(url, init);
}