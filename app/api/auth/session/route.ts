import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies(); // Omit 'await' if using Next.js 14 or earlier
  const userCookie = cookieStore.get('tamu_user');

  if (userCookie?.value) {
    const email = userCookie.value;
    return NextResponse.json({
      configured: true,
      user: {
        name: email.includes('@') ? email.split('@')[0] : email,
        email: email,
      },
    });
  }

  return NextResponse.json({
    configured: true,
    user: null,
  });
}

export async function POST(request: Request) {
  return GET();
}