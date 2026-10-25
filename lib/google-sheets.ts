import { google, type sheets_v4 } from "googleapis";

let sheetsClient: sheets_v4.Sheets | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function privateKey(): string {
  return requiredEnv("GOOGLE_PRIVATE_KEY")
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n");
}

export function spreadsheetId(): string {
  return requiredEnv("GOOGLE_SHEET_ID");
}

export function googleSheets(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
      private_key: privateKey(),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function ensureTable(
  title: string,
  headers: string[],
): Promise<sheets_v4.Sheets> {
  const sheets = googleSheets();
  const id = spreadsheetId();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: id,
    fields: "sheets.properties.title",
  });
  const titles = new Set(metadata.data.sheets?.flatMap((sheet) =>
    sheet.properties?.title ? [sheet.properties.title] : [],
  ));

  if (!titles.has(title)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }

  const range = `'${title}'!A1:${columnName(headers.length)}1`;
  const firstRow = (await sheets.spreadsheets.values.get({ spreadsheetId: id, range })).data.values?.[0];
  if (!firstRow?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  } else if (headers.some((header, index) => firstRow[index] !== header)) {
    throw new Error(`The ${title} sheet has an unexpected header. Preserve its data and review the setup guide before changing it.`);
  }

  return sheets;
}

export function columnName(column: number): string {
  let result = "";
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(((n - 1) % 26) + 65) + result;
  }
  return result;
}
