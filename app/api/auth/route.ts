import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

function getGoogleSheetsClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

  // 1. Remove surrounding double/single quotes if present
  privateKey = privateKey.replace(/^["']|["']$/g, '');

  // 2. Unescape escaped newlines (\n -> actual line break)
  privateKey = privateKey.replace(/\\n/g, '\n');

  // 3. Ensure header and footer have proper newline formatting
  if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function POST(req: Request) {
  try {
    const { email, password, action } = (await req.json()) as {
      email?: string;
      password?: string;
      action?: 'login' | 'register';
    };

    if (!email || !email.trim().toLowerCase().endsWith('@tamu.edu')) {
      return NextResponse.json(
        { error: 'Registration and login are restricted to @tamu.edu email addresses.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C',
    });

    const rows = response.data.values || [];
    const userRow = rows.find(
      (row) => row[0] && row[0].toLowerCase() === cleanEmail
    );

    // --- REGISTER ---
    if (action === 'register') {
      if (userRow) {
        return NextResponse.json(
          { error: 'An account with this TAMU email already exists. Please log in.' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const createdAt = new Date().toISOString();

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:C',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[cleanEmail, hashedPassword, createdAt]],
        },
      });

      const res = NextResponse.json({
        success: true,
        message: 'Account created successfully!',
        user: { name: cleanEmail.split('@')[0], email: cleanEmail },
      });

      res.cookies.set('tamu_user', cleanEmail, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    // --- LOGIN ---
    if (action === 'login') {
      if (!userRow) {
        return NextResponse.json(
          { error: 'No account found with this TAMU email. Please register first.' },
          { status: 404 }
        );
      }

      const storedHashedPassword = userRow[1];
      const isPasswordValid = await bcrypt.compare(password, storedHashedPassword);

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Incorrect password.' },
          { status: 401 }
        );
      }

      const res = NextResponse.json({
        success: true,
        message: 'Logged in successfully!',
        user: { name: cleanEmail.split('@')[0], email: cleanEmail },
      });

      res.cookies.set('tamu_user', cleanEmail, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}