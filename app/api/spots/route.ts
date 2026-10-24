import { getDb } from "@/db";
import { spots } from "@/db/schema";
import { getTamuUser } from "@/lib/email-auth";
import { restaurants } from "@/app/data";
import { and, eq } from "drizzle-orm";
export async function POST(request:Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin)return Response.json({error:"Invalid request origin."},{status:403});
  const user=await getTamuUser();
  if(!user)return Response.json({error:"Sign in to save a spot."},{status:401});
  try {
    const input=await request.text();if(input.length>1000)return Response.json({error:"Request too large."},{status:413});
    const {restaurantId,status}=JSON.parse(input);
    if(!restaurants.some(r=>r.id===restaurantId)||![null,"want","been"].includes(status))return Response.json({error:"Choose a valid spot and list."},{status:400});
    const db=getDb();
    if(status===null)await db.delete(spots).where(and(eq(spots.userId,user.userId),eq(spots.restaurantId,restaurantId)));
    else await db.insert(spots).values({id:crypto.randomUUID(),userId:user.userId,restaurantId,status}).onConflictDoUpdate({target:[spots.userId,spots.restaurantId],set:{status}});
    return Response.json({ok:true});
  } catch {return Response.json({error:"Could not save this spot. Please try again."},{status:503});}
}
