import {allReviews,dataRequest,publicReview,type Row} from "@/lib/supabase-data";
import {getTamuUser,sameOrigin} from "@/lib/email-auth";
import {restaurants} from "@/app/data";
import {z} from "zod";
const schema=z.object({restaurantId:z.string().refine(id=>restaurants.some(r=>r.id===id)),author:z.string().trim().min(2).max(40),rating:z.number().int().min(1).max(5),dish:z.string().trim().min(1).max(100),body:z.string().trim().min(10).max(1500),spend:z.number().int().min(1).max(500),visitedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v<=new Date().toISOString().slice(0,10))});
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,id=params.get("restaurantId"),raw=params.get("offset")||"0";
 if(!restaurants.some(r=>r.id===id)||!/^\d{1,6}$/.test(raw))return Response.json({error:"Choose a valid restaurant and review page."},{status:400});
 try{const user=await getTamuUser();const offset=Number(raw);const rows=await dataRequest(`aggie_reviews?select=*&restaurant_id=eq.${encodeURIComponent(id!)}&order=updated_at.desc,id.desc&limit=21&offset=${offset}`) as Row[];
 const page=rows.slice(0,20);if(user&&offset===0){const own=await dataRequest(`aggie_reviews?select=*&restaurant_id=eq.${encodeURIComponent(id!)}&user_id=eq.${user.userId}&limit=1`) as Row[];if(own[0]&&!page.some(r=>r.id===own[0].id))page.push(own[0])}
 return Response.json({reviews:page.map(r=>publicReview(r,user?.userId)),hasMore:rows.length>20,nextOffset:offset+20},{headers:{"Cache-Control":"private, no-store"}})}catch{return Response.json({error:"Could not load reviews."},{status:503})}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});const user=await getTamuUser();if(!user)return Response.json({error:"Sign in to write a review."},{status:401});
 try{const raw=await request.text();if(raw.length>12000)return Response.json({error:"Review too large."},{status:413});const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:"Check the review fields."},{status:400});
 const v=parsed.data,cookie=request.headers.get("cookie");const own=await dataRequest(`aggie_reviews?select=updated_at&user_id=eq.${user.userId}&order=updated_at.desc&limit=1`,{cookie}) as Row[];
 if(own[0]&&Date.now()-Date.parse(own[0].updated_at)<10000)return Response.json({error:"Please wait a few seconds before posting another review."},{status:429});
 await dataRequest("aggie_reviews?on_conflict=user_id,restaurant_id",{method:"POST",cookie,prefer:"resolution=merge-duplicates,return=minimal",body:{user_id:user.userId,restaurant_id:v.restaurantId,author:v.author,rating:v.rating,dish:v.dish,body:v.body,spend:v.spend,visited_at:v.visitedAt,updated_at:new Date().toISOString()}});return Response.json({ok:true})
 }catch{return Response.json({error:"Your review could not be saved."},{status:503})}
}
export async function DELETE(request:Request){if(!sameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});const user=await getTamuUser();if(!user)return Response.json({error:"Sign in first."},{status:401});try{const raw=await request.text();if(raw.length>1000)return Response.json({error:"Request too large."},{status:413});const {restaurantId}=JSON.parse(raw);if(!restaurants.some(r=>r.id===restaurantId))return Response.json({error:"Invalid restaurant."},{status:400});await dataRequest(`aggie_reviews?user_id=eq.${user.userId}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,{method:"DELETE",cookie:request.headers.get("cookie")});return Response.json({ok:true})}catch{return Response.json({error:"Could not delete review."},{status:503})}}
