import { authFetch, deliveryReady, isTamuEmail, json, sameOrigin, throttle } from "@/lib/email-auth";
export async function POST(request:Request) {
  if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
  try{
    const raw=await request.text();if(raw.length>1000)return json({error:"Request too large."},413);
    const input=JSON.parse(raw),email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
    if(!isTamuEmail(email))return json({error:"Use your @tamu.edu email address."},400);
    if(!deliveryReady())return json({error:"Email delivery isn’t connected yet. You can still explore restaurants."},503);
    if(!await throttle(request,"send",email,3,600))return json({error:"Too many code requests. Please try again in a few minutes."},429);
    const response=await authFetch("/otp",{method:"POST",body:{email,create_user:true}});
    if(!response.ok)return json({error:response.status===429?"Please wait a minute before requesting another code.":"We couldn’t send your code. Please try again later."},response.status===429?429:503);
    return json({ok:true});
  }catch{return json({error:"We couldn’t send your code. Please try again."},503)}
}
