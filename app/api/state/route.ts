import { allReviews,ownSpots,publicReview } from "@/lib/supabase-data";
import { getTamuUser } from "@/lib/email-auth";
import { headers } from "next/headers";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getTamuUser();
 try{
  const rows=await allReviews(),month=new Date().toISOString().slice(0,7);
  const grouped=new Map<string,typeof rows>();
  for(const r of rows)grouped.set(r.restaurant_id,[...(grouped.get(r.restaurant_id)??[]),r]);
  const stats=Object.fromEntries([...grouped].map(([id,values])=>{const prices=values.map(v=>v.spend).sort((a,b)=>a-b);return [id,{n:values.length,avg:values.reduce((sum,v)=>sum+v.rating,0)/values.length,spend:(prices[Math.floor((prices.length-1)/2)]+prices[Math.floor(prices.length/2)])/2}]}));
  const monthly=[...grouped].map(([restaurantId,values])=>{const recent=values.filter(v=>v.updated_at.startsWith(month));return {restaurantId,n:recent.length,avg:recent.length?recent.reduce((sum,v)=>sum+v.rating,0)/recent.length:0}}).filter(x=>x.n).sort((a,b)=>b.avg-a.avg||b.n-a.n).slice(0,10);
  const saved=user?await ownSpots((await headers()).get("cookie"),user.userId):[];
  return Response.json({reviews:rows.slice(0,50).map(r=>publicReview(r,user?.userId)),ownReviews:user?rows.filter(r=>r.user_id===user.userId).map(r=>publicReview(r,user.userId)):[],monthly,month,spots:saved,stats},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"Community reviews could not be loaded. Check the Supabase setup."},{status:503})}
}
