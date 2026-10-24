import catalog from "./catalog.json";
export type Restaurant = {id:string;name:string;type:string;image:string;address:string;website:string|null;phone:string|null;lat:number;lng:number;budget:number|null;tags:string[];dietary:string[];description:string;menuUrl:string|null;menuIsPdf:boolean;menuSource:string;sourceUrl:string;checkedAt:string};
export const restaurants:Restaurant[]=catalog;
export const CATALOG_CHECKED_AT="2026-10-24";
export type PublicReview = {id:string;restaurantId:string;author:string;rating:number;dish:string;body:string;spend:number;visitedAt:string;updatedAt:string;own:boolean};
export type Spot = {restaurantId:string;status:"want"|"been"};
export const CAMPUS = {lat:30.6129,lng:-96.3411};
export function miles(a:{lat:number;lng:number},b:{lat:number;lng:number}) {
  const rad=Math.PI/180, dlat=(b.lat-a.lat)*rad, dlng=(b.lng-a.lng)*rad;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
