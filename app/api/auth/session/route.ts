import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function handleSession() {
  const cookieStore = await cookies();
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

// Enable GET and POST requests for session checks
export async function GET() {
  return handleSession();
}

export async function POST() {
  return handleSession();
}