import { createHmac, timingSafeEqual } from 'node:crypto';

function signingKey(): string {
  const configured = process.env.SESSION_SECRET || process.env.GOOGLE_PRIVATE_KEY;
  if (!configured?.trim()) throw new Error('SESSION_SECRET or GOOGLE_PRIVATE_KEY is required to sign sessions.');
  return configured.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

export function createTamuSession(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const signature = createHmac('sha256', signingKey()).update(normalizedEmail).digest('base64url');
  return `${normalizedEmail}.${signature}`;
}

export function verifyTamuSession(token: string | null): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 0) return null;
  const email = token.slice(0, separator).trim().toLowerCase();
  const signature = token.slice(separator + 1);
  if (!email.endsWith('@tamu.edu') || !signature) return null;
  try {
    const expected = createHmac('sha256', signingKey()).update(email).digest();
    const provided = Buffer.from(signature, 'base64url');
    return provided.length === expected.length && timingSafeEqual(provided, expected) ? email : null;
  } catch {
    return null;
  }
}
