import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/email-auth';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const res = NextResponse.json({ success: true });
  res.cookies.set('tamu_user', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
