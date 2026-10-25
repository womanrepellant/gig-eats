import ratings from "../../ratings-data.json";
export const dynamic = "force-dynamic";
const table=ratings as Record<string,{yelp_id:string}>;
export async function GET(request:Request){
  const rid=new URL(request.url).searchParams.get("restaurantId")||"";
  const record=Object.prototype.hasOwnProperty.call(table,rid)?table[rid]:null;
  if(!record?.yelp_id)return Response.json({error:"No verified Yelp business alias for this location"},{status:404});
  const key=process.env.YELP_API_KEY;
  if(!key)return Response.json({available:false},{headers:{"Cache-Control":"public, max-age=3600"}});
  try{
    const response=await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(record.yelp_id)}`,{headers:{Authorization:`Bearer ${key}`},next:{revalidate:3600}});
    if(!response.ok)return Response.json({available:false},{status:200});
    const data=await response.json() as{rating?:number;review_count?:number};
    if(typeof data.rating!=="number")return Response.json({available:false});
    return Response.json({rating:data.rating,review_count:data.review_count??0},{headers:{"Cache-Control":"public, max-age=3600"}});
  }catch{return Response.json({available:false});}
}
