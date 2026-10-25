import {dataRequest} from "@/lib/supabase-data";
import {getTamuUser,sameOrigin} from "@/lib/email-auth";
import {restaurants} from "@/app/data";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});const user=await getTamuUser();if(!user)return Response.json({error:"Sign in to save a spot."},{status:401});
 try{const raw=await request.text();if(raw.length>1000)return Response.json({error:"Request too large."},{status:413});const {restaurantId,status}=JSON.parse(raw);if(!restaurants.some(r=>r.id===restaurantId)||![null,"want","been"].includes(status))return Response.json({error:"Choose a valid spot and list."},{status:400});const cookie=request.headers.get("cookie");
 if(status===null)await dataRequest(`aggie_spots?user_id=eq.${user.userId}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,{method:"DELETE",cookie});
 else await dataRequest("aggie_spots?on_conflict=user_id,restaurant_id",{method:"POST",cookie,prefer:"resolution=merge-duplicates,return=minimal",body:{user_id:user.userId,restaurant_id:restaurantId,status}});
 return Response.json({ok:true})}catch{return Response.json({error:"Could not save this spot."},{status:503})}
}
