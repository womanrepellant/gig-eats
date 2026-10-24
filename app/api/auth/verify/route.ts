import { authFetch, deliveryReady, isTamuEmail, json, publicUser, sameOrigin, setSession, throttle, verifiedTamuUser, type ProviderSession } from "@/lib/email-auth";
export async function POST(request:Request) {
  if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
  try{
    const raw=await request.text();if(raw.length>1000)return json({error:"Request too large."},413);
    const input=JSON.parse(raw),email=typeof input.email==="string"?input.email.trim().toLowerCase():"",code=input.code;
    if(!isTamuEmail(email)||typeof code!=="string"||!/^\d{6}$/.test(code))return json({error:"Enter your TAMU email and the six-digit code."},400);
    if(!deliveryReady())return json({error:"Email delivery isn’t connected yet."},503);
    if(!await throttle(request,"verify",email,10,600))return json({error:"Too many attempts. Please try again in a few minutes."},429);
    const response=await authFetch("/verify",{method:"POST",body:{email,token:code,type:"email"}});
    if(!response.ok)return json({error:"That code is invalid or has expired. Request a new one."},400);
    const session=await response.json() as ProviderSession,user=verifiedTamuUser(session.user);
    if(!session.access_token||!session.refresh_token||!user||user.email!==email)return json({error:"A verified @tamu.edu email is required."},403);
    return setSession(json({user:publicUser(user)}),session);
  }catch{return json({error:"We couldn’t verify your code. Please try again."},503)}
}
