import { NextResponse } from 'next/server';
import { getTamuUser } from '@/lib/email-auth';

async function handleSession() {
  const user = await getTamuUser();
  return NextResponse.json({
    configured: true,
    user: user ? { name: user.name, email: user.email } : null,
  });
}

// Enable GET and POST requests for session checks
export async function GET() {
  return handleSession();
}

export async function POST() {
  return handleSession();
}
