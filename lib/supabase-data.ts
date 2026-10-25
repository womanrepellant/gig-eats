import {config,parseCookie,ACCESS_COOKIE} from "./email-auth";
import type {PublicReview,Spot} from "@/app/data";

type Row={id:string;user_id:string;restaurant_id:string;author:string;rating:number;dish:string;body:string;spend:number;visited_at:string;updated_at:string};
export function publicReview(row:Row,userId?:string):PublicReview{return {id:row.id,restaurantId:row.restaurant_id,author:row.author,rating:row.rating,dish:row.dish,body:row.body,spend:row.spend,visitedAt:row.visited_at,updatedAt:row.updated_at,own:row.user_id===userId}}
export async function dataRequest(path:string,options:{method?:string;body?:unknown;cookie?:string|null;prefer?:string}={}){
 const c=config();if(!c)throw Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
 const token=options.cookie?parseCookie(options.cookie,ACCESS_COOKIE):null;
 const response=await fetch(`${c.url}/rest/v1/${path}`,{method:options.method??"GET",headers:{apikey:c.key,...(token?{Authorization:`Bearer ${token}`}:{}),"Content-Type":"application/json",...(options.prefer?{Prefer:options.prefer}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{}),cache:"no-store",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(`Database request failed (${response.status}): ${(await response.text()).slice(0,200)}`);
 return response.status===204?null:response.json();
}
export async function allReviews(){
 const result:Row[]=[];
 for(let offset=0;offset<10000;offset+=1000){const rows=await dataRequest(`aggie_reviews?select=*&order=updated_at.desc&limit=1000&offset=${offset}`) as Row[];result.push(...rows);if(rows.length<1000)return result}
 throw Error("Too many reviews for the current data endpoint.");
}
export async function ownSpots(cookie:string|null,userId:string):Promise<Spot[]>{const rows=await dataRequest(`aggie_spots?select=restaurant_id,status&user_id=eq.${encodeURIComponent(userId)}`,{cookie}) as {restaurant_id:string;status:"want"|"been"}[];return rows.map(r=>({restaurantId:r.restaurant_id,status:r.status}))}
export type {Row};
