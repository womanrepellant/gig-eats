import { config, parseCookie, ACCESS_COOKIE } from "./email-auth";
import type { PublicReview, Spot } from "@/app/data";

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

// Helper to reliably resolve Supabase URL and Key
function getSupabaseConfig() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  url = url.trim().replace(/\/+$/, "");
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return { url, key };
}

export async function dataRequest(
  endpoint: string,
  options: { method?: string; body?: any; cookie?: string | null; prefer?: string } = {}
) {
  const { url: baseUrl, key } = getSupabaseConfig();

  if (!baseUrl) {
    throw new Error("SUPABASE_URL is missing. Please set SUPABASE_URL in Vercel Environment Variables.");
  }
  if (!key) {
    throw new Error("SUPABASE_ANON_KEY is missing. Please set SUPABASE_ANON_KEY in Vercel Environment Variables.");
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const fullUrl = `${baseUrl}/rest/v1/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  if (options.prefer) {
    headers["Prefer"] = options.prefer;
  }

  const response = await fetch(fullUrl, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Database error (${response.status}): ${text}`);
  }

  if (options.prefer?.includes("return=minimal")) {
    return [];
  }

  return response.json();
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
    isMine: currentUserId ? row.user_id === currentUserId : false,
  };
}

export async function allReviews(): Promise<Row[]> {
  try {
    return (await dataRequest("aggie_reviews?select=*&order=updated_at.desc")) as Row[];
  } catch {
    return [];
  }
}
