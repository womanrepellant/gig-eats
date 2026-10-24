import {env} from "cloudflare:workers";
import {restaurants,miles} from "../../data";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
type Place={id:string;displayName?:{text:string};location?:{latitude:number;longitude:number}};
type Review={text?:{text:string};rating?:number;publishTime?:string;googleMapsUri?:string;authorAttribution?:{displayName?:string;uri?:string}};
const mapsLink=(name:string,address:string)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+" "+address)}`;
function safeGoogleUrl(value:unknown){if(typeof value!=="string")return null;try{const u=new URL(value);return u.protocol==="https:"&&/(^|\.)google\.com$|(^|\.)google\.com\.[a-z.]+$/.test(u.hostname)?u.href:null}catch{return null}}
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("restaurantId");
 const restaurant=restaurants.find(r=>r.id===id);
 if(!restaurant)return Response.json({error:"Unknown restaurant"},{status:404,headers});
 const fallback=mapsLink(restaurant.name,restaurant.address);
 const key=(env as unknown as {GOOGLE_PLACES_API_KEY?:string}).GOOGLE_PLACES_API_KEY;
 if(!key)return Response.json({configured:false,googleMapsUri:fallback,reviews:[]},{headers});
 try{
  const search=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.location"},body:JSON.stringify({textQuery:`${restaurant.name} ${restaurant.address}`,pageSize:3,locationBias:{circle:{center:{latitude:restaurant.lat,longitude:restaurant.lng},radius:2000}}})});
  if(!search.ok)throw Error(`Google search returned ${search.status}`);
  const candidates=(await search.json() as {places?:Place[]}).places??[];
  const normalized=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,"");
  const matching=candidates.find(p=>p.id&&p.displayName?.text&&p.location&&miles(restaurant,{lat:p.location.latitude,lng:p.location.longitude})<0.3&&(normalized(p.displayName?.text??"").includes(normalized(restaurant.name))||normalized(restaurant.name).includes(normalized(p.displayName?.text??""))));
  if(!matching)return Response.json({configured:true,googleMapsUri:fallback,reviews:[],unmatched:true},{headers});
  const response=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(matching.id)}`,{headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":"rating,userRatingCount,reviews,googleMapsUri,attributions"}});
  if(!response.ok)throw Error(`Google details returned ${response.status}`);
  const data=await response.json() as {rating?:number;userRatingCount?:number;reviews?:Review[];googleMapsUri?:string;attributions?:{provider?:string;providerUri?:string}[]};
  return Response.json({configured:true,rating:data.rating??null,count:data.userRatingCount??null,googleMapsUri:safeGoogleUrl(data.googleMapsUri)??fallback,reviews:(data.reviews??[]).slice(0,5).map(r=>({text:r.text?.text??"",rating:r.rating??null,published:r.publishTime??null,author:r.authorAttribution?.displayName??"Google Maps user",authorUrl:safeGoogleUrl(r.authorAttribution?.uri),url:safeGoogleUrl(r.googleMapsUri)})),attributions:(data.attributions??[]).map(a=>({provider:a.provider??"",url:safeGoogleUrl(a.providerUri)}))},{headers});
 }catch{return Response.json({configured:true,googleMapsUri:fallback,reviews:[],unavailable:true},{headers});}
}
