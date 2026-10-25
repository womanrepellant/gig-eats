import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('tamu_user');
    const email = userCookie?.value || null;

    return NextResponse.json({
      reviews: [],
      spots: [],
      stats: {},
      monthly: [],
      month: new Date().toISOString().slice(0, 7),
      ownReviews: [],
      user: email ? { name: email.split('@')[0], email } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch state' }, { status: 500 });
  }
}