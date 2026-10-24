import { getDb } from "@/db";
import { reviews, spots } from "@/db/schema";
import { getTamuUser } from "@/lib/email-auth";
import { eq, desc, sql } from "drizzle-orm";
export async function GET() {
  const user=await getTamuUser();
  try {
    const db=getDb();
    const rows=await db.select().from(reviews).orderBy(desc(reviews.updatedAt)).limit(50);
    const ownReviews=user ? await db.select().from(reviews).where(eq(reviews.userId,user.userId)).orderBy(desc(reviews.updatedAt)) : [];
    const month=new Date().toISOString().slice(0,7);
    const monthly=await db.all<{restaurantId:string;n:number;avg:number}>(sql`
      SELECT restaurant_id AS restaurantId, COUNT(*) AS n, AVG(rating) AS avg
      FROM reviews WHERE substr(updated_at,1,7) = ${month}
      GROUP BY restaurant_id ORDER BY avg DESC, n DESC LIMIT 10
    `);
    const totals=await db.all<{restaurantId:string;n:number;avg:number;spend:number}>(sql`
      WITH ordered_spend AS (
        SELECT restaurant_id, spend,
          ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY spend) AS position,
          COUNT(*) OVER (PARTITION BY restaurant_id) AS total
        FROM reviews
      ), median_spend AS (
        SELECT restaurant_id, AVG(spend) AS spend
        FROM ordered_spend
        WHERE position IN ((total + 1) / 2, (total + 2) / 2)
        GROUP BY restaurant_id
      )
      SELECT r.restaurant_id AS restaurantId, COUNT(*) AS n,
        AVG(r.rating) AS avg, m.spend AS spend
      FROM reviews r JOIN median_spend m ON m.restaurant_id = r.restaurant_id
      GROUP BY r.restaurant_id
    `);
    const saved=user ? await db.select({restaurantId:spots.restaurantId,status:spots.status}).from(spots).where(eq(spots.userId,user.userId)) : [];
    return Response.json({reviews:rows.map(({userId,...review})=>({...review,own:userId===user?.userId})),ownReviews:ownReviews.map(({userId,...review})=>({...review,own:true})),monthly,month,spots:saved,stats:Object.fromEntries(totals.map(({restaurantId,...stat})=>[restaurantId,stat]))},{headers:{"Cache-Control":"private, no-store"}});
  } catch {return Response.json({error:"Your spots and community reviews could not be loaded. Please try again."},{status:503});}
}
