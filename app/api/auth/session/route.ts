import { authFetch, clearSession, deliveryReady, getTamuUser, json, parseCookie, publicUser, REFRESH_COOKIE, sameOrigin, setSession, verifiedTamuUser, type ProviderSession } from "@/lib/email-auth";
export async function POST(request:Request) {
  if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
  const cookie=request.headers.get("cookie"),user=await getTamuUser(cookie);
  if(user)return json({user:publicUser(user),configured:deliveryReady()});
  const refresh=parseCookie(cookie,REFRESH_COOKIE);
  if(!refresh)return json({user:null,configured:deliveryReady()});
  try{
    const response=await authFetch("/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:refresh}});
    if(!response.ok){if(response.status>=500)return json({error:"Sign-in service is temporarily unavailable."},503);return clearSession(json({user:null,configured:deliveryReady()}))}
    const session=await response.json() as ProviderSession,nextUser=verifiedTamuUser(session.user);
    if(!session.access_token||!session.refresh_token||!nextUser)return clearSession(json({user:null,configured:deliveryReady()}));
    return setSession(json({user:publicUser(nextUser),configured:deliveryReady()}),session);
  }catch{return json({error:"Sign-in service is temporarily unavailable."},503)}
}
