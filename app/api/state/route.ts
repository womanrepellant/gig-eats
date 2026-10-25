import { allReviews, ownSpots, publicReview } from '@/lib/sheets-data';
import { getTamuUser } from '@/lib/email-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getTamuUser();
  try {
    const rows = await allReviews();
    const month = new Date().toISOString().slice(0, 7);
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) grouped.set(row.restaurant_id, [...(grouped.get(row.restaurant_id) ?? []), row]);

    const stats = Object.fromEntries([...grouped].map(([id, values]) => {
      const prices = values.map((value) => value.spend).sort((a, b) => a - b);
      return [id, {
        n: values.length,
        avg: values.reduce((sum, value) => sum + value.rating, 0) / values.length,
        spend: (prices[Math.floor((prices.length - 1) / 2)] + prices[Math.floor(prices.length / 2)]) / 2,
      }];
    }));
    const monthly = [...grouped].map(([restaurantId, values]) => {
      const recent = values.filter((value) => value.updated_at.startsWith(month));
      return {
        restaurantId,
        n: recent.length,
        avg: recent.length ? recent.reduce((sum, value) => sum + value.rating, 0) / recent.length : 0,
      };
    }).filter((entry) => entry.n).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 10);
    const saved = user ? await ownSpots(user.userId) : [];

    return Response.json({
      reviews: rows.slice(0, 50).map((row) => publicReview(row, user?.userId)),
      ownReviews: user ? rows.filter((row) => row.user_id === user.userId).map((row) => publicReview(row, user.userId)) : [],
      monthly,
      month,
      spots: saved,
      stats,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('GET /api/state failed:', error);
    return Response.json({ error: 'Community reviews could not be loaded. Check the Google Sheets setup.' }, { status: 503 });
  }
}
