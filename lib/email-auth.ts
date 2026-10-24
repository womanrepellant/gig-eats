import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { authLimits } from "@/db/schema";
import { sql } from "drizzle-orm";

export const ACCESS_COOKIE="__Host-ab-access";
export const REFRESH_COOKIE="__Host-ab-refresh";
export type TamuUser={userId:string;email:string;name:string};
type ProviderUser={id?:string;email?:string;email_confirmed_at?:string|null};
export type ProviderSession={access_token?:string;refresh_token?:string;expires_in?:number;user?:ProviderUser};

export function config() {
  const url=env.SUPABASE_URL?.replace(/\/$/,"");
  const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;
  if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))return null;
  return {url,key};
}
export function deliveryReady(){return !!config()&&env.TAMU_EMAIL_DELIVERY_READY==="true"}
export function isTamuEmail(value:unknown):value is string {
  return typeof value==="string"&&value.length<=254&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@tamu\.edu$/i.test(value);
}
export function verifiedTamuUser(user:ProviderUser|undefined):TamuUser|null {
  if(!user?.id||!user.email_confirmed_at||!isTamuEmail(user.email))return null;
  return {userId:`tamu:${user.id}`,email:user.email.toLowerCase(),name:user.email.split("@")[0]};
}
export function parseCookie(header:string|null,name:string){
  const part=header?.split(";").map(p=>p.trim()).find(p=>p.startsWith(`${name}=`));
  if(!part)return null;
  try{return decodeURIComponent(part.slice(name.length+1))}catch{return null}
}
export async function authFetch(path:string,options:{method?:string;body?:unknown;token?:string}={}) {
  const c=config();if(!c)throw new Error("Email sign-in is not connected yet.");
  return fetch(`${c.url}/auth/v1${path}`,{method:options.method||"GET",headers:{apikey:c.key,"Content-Type":"application/json",...(options.token?{Authorization:`Bearer ${options.token}`}:{})},...(options.body?{body:JSON.stringify(options.body)}:{}),signal:AbortSignal.timeout(10000)});
}
export async function getTamuUser(cookieHeader?:string|null):Promise<TamuUser|null> {
  const header=cookieHeader===undefined?(await headers()).get("cookie"):cookieHeader;
  const token=parseCookie(header,ACCESS_COOKIE);
  if(!config()||!token)return null;
  try{const response=await authFetch("/user",{token});if(!response.ok)return null;return verifiedTamuUser(await response.json() as ProviderUser)}catch{return null}
}
export function publicUser(user:TamuUser|null){return user?{name:user.name,email:user.email}:null}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}})}
export function sameOrigin(request:Request){return request.headers.get("origin")===new URL(request.url).origin}
export function setSession(response:Response,session:ProviderSession) {
  const age=Math.min(3600,Math.max(60,Number(session.expires_in)||3600));
  response.headers.append("Set-Cookie",`${ACCESS_COOKIE}=${encodeURIComponent(session.access_token!)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);
  response.headers.append("Set-Cookie",`${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token!)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
  return response;
}
export function clearSession(response:Response) {
  for(const name of [ACCESS_COOKIE,REFRESH_COOKIE])response.headers.append("Set-Cookie",`${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
export async function throttle(request:Request,action:string,email:string,limit:number,seconds:number) {
  const db=getDb();
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/seconds),expiresAt=(bucket+2)*seconds;
  const ip=request.headers.get("cf-connecting-ip")||"unknown";
  const keys=await Promise.all([`${action}:email:${email}`,`${action}:ip:${ip}`].map(async value=>{
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
    return `${[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("")}:${bucket}`;
  }));
  const rows=await Promise.all(keys.map(key=>db.insert(authLimits).values({key,count:1,expiresAt}).onConflictDoUpdate({target:authLimits.key,set:{count:sql`${authLimits.count} + 1`}}).returning({count:authLimits.count})));
  // IP limits are deliberately wider so students behind campus NAT can sign in.
  if(rows[0][0].count>limit||rows[1][0].count>limit*10)return false;
  await db.delete(authLimits).where(sql`${authLimits.expiresAt} < ${now}`);
  return true;
}
