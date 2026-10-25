import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('tamu_user');

  if (userCookie && userCookie.value) {
    const email = userCookie.value;
    return NextResponse.json({
      configured: true,
      user: {
        name: email.split('@')[0],
        email: email,
      },
    });
  }

  return NextResponse.json({
    configured: true,
    user: null,
  });
}