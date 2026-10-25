import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createTamuSession, sameOrigin } from '@/lib/email-auth';
import { googleSheets, spreadsheetId } from '@/lib/google-sheets';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  try {
    const { email, password, action } = (await req.json()) as {
      email?: string;
      password?: string;
      action?: 'login' | 'register';
    };

    if (typeof email !== 'string' || !email.trim().toLowerCase().endsWith('@tamu.edu')) {
      return NextResponse.json(
        { error: 'Registration and login are restricted to @tamu.edu email addresses.' },
        { status: 400 },
      );
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Password must be between 8 and 72 characters.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const sheets = googleSheets();
    const id = spreadsheetId();
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'Sheet1!A:C' });
    const rows = response.data.values ?? [];
    const accountIndex = rows.findIndex((row) => typeof row[0] === 'string' && row[0].trim().toLowerCase() === cleanEmail);
    const account = accountIndex >= 0 ? rows[accountIndex] : undefined;

    if (action === 'register') {
      if (account) {
        return NextResponse.json({ error: 'An account with this TAMU email already exists. Please log in.' }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await sheets.spreadsheets.values.append({
        spreadsheetId: id,
        range: 'Sheet1!A:C',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[cleanEmail, passwordHash, new Date().toISOString()]] },
      });
    } else if (action === 'login') {
      if (!account || typeof account[1] !== 'string' || !await bcrypt.compare(password, account[1])) {
        return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }

    const responseBody = action === 'register'
      ? { success: true, message: 'Account created successfully!', user: { name: cleanEmail.split('@')[0], email: cleanEmail } }
      : { success: true, message: 'Logged in successfully!', user: { name: cleanEmail.split('@')[0], email: cleanEmail } };
    const result = NextResponse.json(responseBody);
    result.cookies.set('tamu_user', createTamuSession(cleanEmail), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return result;
  } catch (error) {
    console.error('Google Sheets auth failure:', error);
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Check the Google Sheets configuration.' }, { status: 503 });
  }
}
