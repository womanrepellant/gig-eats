import type { PublicReview, Spot } from "@/app/data";
import { ensureTable, spreadsheetId } from "./google-sheets";

export type Row = {
  id: string;
  user_id: string;
  restaurant_id: string;
  author: string;
  rating: number;
  dish: string;
  body: string;
  spend: number;
  visited_at: string;
  updated_at: string;
};

type SpotRow = { user_id: string; restaurant_id: string; status: "want" | "been" };

const REVIEW_HEADERS = ["id", "user_id", "restaurant_id", "author", "rating", "dish", "body", "spend", "visited_at", "updated_at"];
const SPOT_HEADERS = ["user_id", "restaurant_id", "status"];
const REVIEWS_RANGE = "'Reviews'!A2:J";
const SPOTS_RANGE = "'Spots'!A2:C";

function toReview(values: string[]): Row | null {
  if (!values[0]) return null;
  return {
    id: values[0] ?? "",
    user_id: values[1] ?? "",
    restaurant_id: values[2] ?? "",
    author: values[3] ?? "",
    rating: Number(values[4]),
    dish: values[5] ?? "",
    body: values[6] ?? "",
    spend: Number(values[7]),
    visited_at: values[8] ?? "",
    updated_at: values[9] ?? "",
  };
}

function reviewValues(row: Row): (string | number)[] {
  return [row.id, row.user_id, row.restaurant_id, row.author, row.rating, row.dish, row.body, row.spend, row.visited_at, row.updated_at];
}

export function publicReview(row: Row, currentUserId?: string): PublicReview {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    author: row.author,
    rating: row.rating,
    dish: row.dish,
    body: row.body,
    spend: row.spend,
    visitedAt: row.visited_at,
    updatedAt: row.updated_at,
    own: currentUserId ? row.user_id === currentUserId : false,
  };
}

async function readReviews(): Promise<{ rows: Row[]; values: string[][] }> {
  const sheets = await ensureTable("Reviews", REVIEW_HEADERS);
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId(), range: REVIEWS_RANGE });
  const values = (response.data.values ?? []) as string[][];
  return { rows: values.map(toReview).filter((row): row is Row => !!row), values };
}

export async function allReviews(): Promise<Row[]> {
  const { rows } = await readReviews();
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id));
}

export async function upsertReview(review: Row): Promise<void> {
  const { rows, values } = await readReviews();
  const index = rows.findIndex((row) => row.user_id === review.user_id && row.restaurant_id === review.restaurant_id);
  const sheets = await ensureTable("Reviews", REVIEW_HEADERS);
  const id = spreadsheetId();
  if (index >= 0) {
    const physicalRow = values.findIndex((row) => row[0] === rows[index].id) + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `'Reviews'!A${physicalRow}:J${physicalRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [reviewValues({ ...review, id: rows[index].id })] },
    });
    return;
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: "'Reviews'!A:J",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [reviewValues(review)] },
  });
}

export async function deleteReview(userId: string, restaurantId: string): Promise<void> {
  const { rows, values } = await readReviews();
  const index = rows.findIndex((row) => row.user_id === userId && row.restaurant_id === restaurantId);
  if (index < 0) return;
  const physicalRow = values.findIndex((row) => row[0] === rows[index].id) + 2;
  const sheets = await ensureTable("Reviews", REVIEW_HEADERS);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId(),
    range: `'Reviews'!A${physicalRow}:J${physicalRow}`,
  });
}

async function readSpots(): Promise<{ rows: SpotRow[]; values: string[][] }> {
  const sheets = await ensureTable("Spots", SPOT_HEADERS);
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: spreadsheetId(), range: SPOTS_RANGE });
  const values = (response.data.values ?? []) as string[][];
  const rows = values.filter((row) => row[0] && row[1]).map((row) => ({
    user_id: row[0], restaurant_id: row[1], status: row[2] as "want" | "been",
  }));
  return { rows, values };
}

export async function ownSpots(userId: string): Promise<Spot[]> {
  const { rows } = await readSpots();
  return rows.filter((row) => row.user_id === userId).map((row) => ({ restaurantId: row.restaurant_id, status: row.status }));
}

export async function setSpot(userId: string, restaurantId: string, status: "want" | "been" | null): Promise<void> {
  const { rows, values } = await readSpots();
  const index = rows.findIndex((row) => row.user_id === userId && row.restaurant_id === restaurantId);
  const sheets = await ensureTable("Spots", SPOT_HEADERS);
  const id = spreadsheetId();
  if (status === null) {
    if (index < 0) return;
    const rowIndex = values.findIndex((row) => row[0] === userId && row[1] === restaurantId) + 2;
    await sheets.spreadsheets.values.clear({ spreadsheetId: id, range: `'Spots'!A${rowIndex}:C${rowIndex}` });
  } else if (index >= 0) {
    const rowIndex = values.findIndex((row) => row[0] === userId && row[1] === restaurantId) + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `'Spots'!A${rowIndex}:C${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [[userId, restaurantId, status]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: "'Spots'!A:C",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[userId, restaurantId, status]] },
    });
  }
}
