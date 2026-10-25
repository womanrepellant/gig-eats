import { setSpot } from '@/lib/sheets-data';
import { getTamuUser, sameOrigin } from '@/lib/email-auth';
import { restaurants } from '@/app/data';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getTamuUser(request);
  if (!user) return Response.json({ error: 'Sign in to save a spot.' }, { status: 401 });

  try {
    const raw = await request.text();
    if (raw.length > 1000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const input = JSON.parse(raw) as { restaurantId?: string; status?: unknown };
    if (!restaurants.some((restaurant) => restaurant.id === input.restaurantId)
      || ![null, 'want', 'been'].includes(input.status as null | string)) {
      return Response.json({ error: 'Choose a valid spot and list.' }, { status: 400 });
    }
    await setSpot(user.userId, input.restaurantId!, input.status as 'want' | 'been' | null);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/spots failed:', error);
    return Response.json({ error: 'Could not save this spot. Check the Google Sheets setup.' }, { status: 503 });
  }
}
