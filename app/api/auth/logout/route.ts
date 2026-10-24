import { ACCESS_COOKIE, authFetch, clearSession, json, parseCookie, sameOrigin } from "@/lib/email-auth";
export async function POST(request:Request) {
  if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
  const token=parseCookie(request.headers.get("cookie"),ACCESS_COOKIE);
  if(token){try{await authFetch("/logout?scope=local",{method:"POST",token})}catch{/* Clearing local cookies still signs this browser out. */}}
  return clearSession(json({ok:true}));
}
