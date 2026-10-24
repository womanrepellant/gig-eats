import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { getTamuUser } from "@/lib/email-auth";
import { restaurants } from "@/app/data";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
const schema=z.object({restaurantId:z.string().refine(id=>restaurants.some(r=>r.id===id)),author:z.string().trim().min(2).max(40),rating:z.number().int().min(1).max(5),dish:z.string().trim().min(1).max(100),body:z.string().trim().min(10).max(1500),spend:z.number().int().min(1).max(500),visitedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v<=new Date().toISOString().slice(0,10))});
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams,id=params.get("restaurantId"),rawOffset=params.get("offset")||"0";
  if(!restaurants.some(r=>r.id===id)||!/^\d{1,6}$/.test(rawOffset))return Response.json({error:"Choose a valid restaurant and review page."},{status:400});
  const user=await getTamuUser(),offset=Number(rawOffset);
  try{
    const db=getDb();
    const rows=await db.select().from(reviews).where(eq(reviews.restaurantId,id!)).orderBy(desc(reviews.updatedAt),desc(reviews.id)).limit(21).offset(offset);
    const page=rows.slice(0,20);
    if(user&&offset===0){const own=await db.select().from(reviews).where(and(eq(reviews.restaurantId,id!),eq(reviews.userId,user.userId))).limit(1);if(own[0]&&!page.some(r=>r.id===own[0].id))page.push(own[0])}
    return Response.json({reviews:page.map(({userId,...r})=>({...r,own:userId===user?.userId})),hasMore:rows.length>20,nextOffset:offset+20},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return Response.json({error:"Could not load this restaurant’s reviews."},{status:503})}
}
export async function POST(request:Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin)return Response.json({error:"Invalid request origin."},{status:403});
  const user=await getTamuUser();
  if(!user)return Response.json({error:"Sign in to write a review."},{status:401});
  if(user.email.toLowerCase().split("@")[1]!=="tamu.edu")return Response.json({error:"A verified @tamu.edu email is required to post reviews."},{status:403});
  try {
    const raw=await request.text();if(raw.length>12000)return Response.json({error:"Review too large."},{status:413});
    const parsed=schema.safeParse(JSON.parse(raw));
    if(!parsed.success)return Response.json({error:"Please check the review fields and visit date."},{status:400});
    const db=getDb();
    const [recent]=await db.select({updatedAt:reviews.updatedAt}).from(reviews).where(eq(reviews.userId,user.userId)).orderBy(desc(reviews.updatedAt)).limit(1);
    if(recent&&Date.now()-Date.parse(recent.updatedAt)<10000)return Response.json({error:"Please wait a few seconds before posting another review."},{status:429});
    const values={...parsed.data,updatedAt:new Date().toISOString()};
    await db.insert(reviews).values({id:crypto.randomUUID(),userId:user.userId,...values}).onConflictDoUpdate({target:[reviews.userId,reviews.restaurantId],set:values});
    return Response.json({ok:true});
  } catch {return Response.json({error:"Your review could not be saved. Please try again."},{status:503});}
}
export async function DELETE(request:Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin)return Response.json({error:"Invalid request origin."},{status:403});
  const user=await getTamuUser();
  if(!user)return Response.json({error:"Sign in first."},{status:401});
  try {
    const raw=await request.text();if(raw.length>1000)return Response.json({error:"Request too large."},{status:413});
    const {restaurantId}=JSON.parse(raw);
    if(typeof restaurantId!=="string")return Response.json({error:"Invalid restaurant."},{status:400});
    await getDb().delete(reviews).where(and(eq(reviews.userId,user.userId),eq(reviews.restaurantId,restaurantId)));
    return Response.json({ok:true});
  } catch {return Response.json({error:"Could not delete the review."},{status:503});}
}
