import { allReviews, deleteReview, publicReview, upsertReview, type Row } from '@/lib/sheets-data';
import { getTamuUser, sameOrigin } from '@/lib/email-auth';
import { restaurants } from '@/app/data';
import { z } from 'zod';

const schema = z.object({
  restaurantId: z.string().refine((id) => restaurants.some((restaurant) => restaurant.id === id)),
  author: z.string().trim().min(2).max(40),
  rating: z.number().int().min(1).max(5),
  dish: z.string().trim().min(1).max(100),
  body: z.string().trim().min(10).max(1500),
  spend: z.number().int().min(1).max(500),
  visitedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
    Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10)),
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const restaurantId = params.get('restaurantId');
  const rawOffset = params.get('offset') || '0';
  if (!restaurants.some((restaurant) => restaurant.id === restaurantId) || !/^\d{1,6}$/.test(rawOffset)) {
    return Response.json({ error: 'Choose a valid restaurant and review page.' }, { status: 400 });
  }

  try {
    const user = await getTamuUser(request);
    const offset = Number(rawOffset);
    const rows = (await allReviews()).filter((row) => row.restaurant_id === restaurantId);
    const page = rows.slice(offset, offset + 20);
    if (user && offset === 0) {
      const own = rows.find((row) => row.user_id === user.userId);
      if (own && !page.some((row) => row.id === own.id)) page.push(own);
    }
    return Response.json({
      reviews: page.map((row) => publicReview(row, user?.userId)),
      hasMore: rows.length > offset + 20,
      nextOffset: offset + 20,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('GET /api/reviews failed:', error);
    return Response.json({ error: 'Could not load reviews from Google Sheets.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getTamuUser(request);
  if (!user) return Response.json({ error: 'Sign in to write a review.' }, { status: 401 });

  try {
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: 'Review too large.' }, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return Response.json({ error: 'Check the review fields.' }, { status: 400 });

    const value = parsed.data;
    const existing = (await allReviews())
      .filter((row) => row.user_id === user.userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    if (existing && Date.now() - Date.parse(existing.updated_at) < 10000) {
      return Response.json({ error: 'Please wait a few seconds before posting another review.' }, { status: 429 });
    }

    const row: Row = {
      id: crypto.randomUUID(),
      user_id: user.userId,
      restaurant_id: value.restaurantId,
      author: value.author,
      rating: value.rating,
      dish: value.dish,
      body: value.body,
      spend: value.spend,
      visited_at: value.visitedAt,
      updated_at: new Date().toISOString(),
    };
    await upsertReview(row);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/reviews failed:', error);
    return Response.json({ error: 'Your review could not be saved to Google Sheets.' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getTamuUser(request);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  try {
    const raw = await request.text();
    if (raw.length > 1000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const input = JSON.parse(raw) as { restaurantId?: string };
    if (!restaurants.some((restaurant) => restaurant.id === input.restaurantId)) {
      return Response.json({ error: 'Invalid restaurant.' }, { status: 400 });
    }
    await deleteReview(user.userId, input.restaurantId!);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/reviews failed:', error);
    return Response.json({ error: 'Could not delete your review from Google Sheets.' }, { status: 503 });
  }
}
