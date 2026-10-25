import { cookies } from 'next/headers';

export async function getTamuUser(request?: Request) {
  try {
    let cookieValue: string | undefined;

    // 1. Try retrieving via Next.js cookies() API
    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get('tamu_user')?.value;
    } catch {
      // Fallback if cookies() is called outside dynamic server context
    }

    // 2. Fallback to raw Cookie header parsing if request object is provided
    if (!cookieValue && request) {
      const headerCookie = request.headers.get('cookie') || '';
      const match = headerCookie.match(/(?:^|;\s*)tamu_user=([^;]*)/);
      if (match) {
        cookieValue = decodeURIComponent(match[1]);
      }
    }

    if (!cookieValue) {
      return null;
    }

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

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Allow requests without Origin (GET/Server-to-Server)

  // Account for reverse proxies (Vercel / AWS) via x-forwarded-host
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}