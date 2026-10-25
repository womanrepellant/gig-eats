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