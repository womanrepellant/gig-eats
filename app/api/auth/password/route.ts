import { authFetch, config, deliveryReady, isTamuEmail, json, publicUser, sameOrigin, setSession, throttle, verifiedTamuUser, type ProviderSession } from "@/lib/email-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({error:"Invalid request origin."},403);
  try {
    const raw=await request.text();
    if(raw.length>2000)return json({error:"Request too large."},413);
    const input=JSON.parse(raw),email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
    const password=input.password,mode=input.mode;
    if(!isTamuEmail(email))return json({error:"Use your @tamu.edu email address."},400);
    if(typeof password!=="string"||password.length<8||password.length>72)return json({error:"Use a password between 8 and 72 characters."},400);
    if(mode!=="signup"&&mode!=="login")return json({error:"Invalid sign-in choice."},400);
    if(!config()||(mode==="signup"&&!deliveryReady()))return json({error:"TAMU email verification is not connected yet. Browsing is still available."},503);
    if(!await throttle(request,mode,email,mode==="signup"?3:10,600))return json({error:"Too many attempts. Try again later."},429);
    if(mode==="signup"){
      const response=await authFetch("/signup",{method:"POST",body:{email,password}});
      if(!response.ok)return json({error:response.status===429?"Too many requests. Try again later.":"We could not create this account. Try again later."},response.status===429?429:400);
      return json({message:"Check your TAMU inbox to verify the account, then log in."});
    }
    const response=await authFetch("/token?grant_type=password",{method:"POST",body:{email,password}});
    if(!response.ok)return json({error:"Email or password is incorrect, or the account is not verified."},401);
    const session=await response.json() as ProviderSession,user=verifiedTamuUser(session.user);
    if(!session.access_token||!session.refresh_token||!user||user.email!==email)return json({error:"Verify your @tamu.edu email before signing in."},403);
    return setSession(json({user:publicUser(user)}),session);
  } catch {return json({error:"Sign-in is temporarily unavailable. Please try again."},503)}
}
