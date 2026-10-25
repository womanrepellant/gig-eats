import { cookies } from 'next/headers';
import { verifyTamuSession } from './session-cookie';

export { createTamuSession, verifyTamuSession } from './session-cookie';

export type ProviderSession = { userId: string; email: string; name: string };
export const ACCESS_COOKIE = 'tamu_user';

export function isTamuEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@tamu\.edu$/i.test(email.trim());
}

export function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function getTamuUser(request?: Request): Promise<ProviderSession | null> {
  try {
    let token: string | null = null;
    try {
      token = (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
    } catch {
      // Route handlers can use the incoming Request as a fallback.
    }
    token ??= parseCookie(request?.headers.get('cookie') ?? null, ACCESS_COOKIE);
    const email = verifyTamuSession(token);
    return email ? { userId: email, email, name: email.split('@')[0] } : null;
  } catch {
    return null;
  }
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
