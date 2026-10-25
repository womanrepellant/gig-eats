// SNAGGIES_LOCATION_IMPORT_V2
"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from "react";
import {Utensils,Bookmark,Search,MapPin,ChevronDown,ArrowUpRight,ArrowRight,Plus,Star,SlidersHorizontal,Map,List,X,Check,Coffee,Fish,GraduationCap,LocateFixed,ExternalLink,Trash2,CheckCircle2,Info,LogOut,Mail,ArrowLeft,BookOpen,Phone} from "lucide-react";
import SpotMap from "./spot-map";
import {restaurants,CAMPUS,miles,type Restaurant,type PublicReview,type Spot} from "./data";
import importedRatings from "./ratings-data.json";

// SNAGGIES_IMPORTED_AGGIE_RATINGS_V1: Cross-platform, imported scores are NOT the same as verified TAMU reviews.
type ImportedRating={name:string;address:string;city:string;aggie_rating:number;total_reviews:number;average_cost:number;price_rank:"cheap"|"normal"|"expensive";google_place_id:string;yelp_id:string};
const IMPORTED=importedRatings as unknown as Record<string,ImportedRating>;
const ratingInfo=(r:Restaurant)=>IMPORTED[r.id];
const priceLabel=(r:Restaurant)=>{const rank=ratingInfo(r)?.price_rank;return rank==="cheap"?"Cheap · lower third":rank==="normal"?"Normal · middle third":rank==="expensive"?"Expensive · upper third":"";};


type RatingStats=Record<string,{n:number;avg:number|null;spend:number|null}>;
type MonthlySpot={restaurantId:string;n:number;avg:number};
type User={name:string;email:string;eligible:true}|null;
type Modal={kind:"detail"|"review";id:string}|{kind:"auth"|"filters"|"about"|"location"}|null;
type Filters={minStars:number;aggieOnly:boolean;radius:number;prices:number[];cuisines:string[];dietary:string[];unknownPrice:boolean;menuOnly:boolean};
const INITIAL:Filters={minStars:0,aggieOnly:false,radius:10,prices:[],cuisines:[],dietary:[],unknownPrice:true,menuOnly:false};
const TYPES=[...new Set(restaurants.map(r=>r.type))].sort();
const DIETS=["Vegetarian options","Gluten-free options","Vegan options","Halal options","Kosher options"];
const SHORTCUTS=[{id:"all",label:"All spots"},{id:"mexican",label:"Mexican"},{id:"coffee",label:"Coffee & sweets"},{id:"pizza",label:"Pizza"}];
const FEATURED_IDS=["coco-shrimp","fish-daddys","poches-seafood-shoppe-restaurant","crawfish-hole"] as const;

function Dialog({children,onClose,label,wide=false}:{children:ReactNode;onClose:()=>void;label:string;wide?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=ref.current;el?.showModal();const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{el?.close();document.body.style.overflow=old}},[]);return <dialog ref={ref} className={`dialog ${wide?"wide":""}`} aria-label={label} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><button className="dialog-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button>{children}</dialog>}
function CuisineIcon({type,size=22}:{type:string;size?:number}){return /coffee|dessert|breakfast/i.test(type)?<Coffee size={size}/>:/seafood|sushi/i.test(type)?<Fish size={size}/>:<Utensils size={size}/>}

const SEA_FISH_PALETTES=[
 {body:"#f6b879",light:"#ffe2b6",fin:"#ed8f83",accent:"#6cc9ce"},
 {body:"#ef987b",light:"#ffe0c8",fin:"#f4c27b",accent:"#f8f1d3"},
 {body:"#65c4cb",light:"#b6ece3",fin:"#f4cf74",accent:"#f5e7ad"},
 {body:"#c39bdd",light:"#ead6f1",fin:"#78cbd0",accent:"#f1c478"},
 {body:"#f0a2b8",light:"#f9d6dc",fin:"#8dc9bc",accent:"#fff0cb"},
 {body:"#8fc5a5",light:"#d4ebc8",fin:"#f1a77f",accent:"#fff0cb"},
];

function SeaFish({variant=0,size=58}:{variant?:number;size?:number}){
 const colors=SEA_FISH_PALETTES[variant%SEA_FISH_PALETTES.length];
 const isPuffer=variant===0;
 return <svg className={`theme-fish-art ${isPuffer?"is-puffer":""}`} width={size} height={size} viewBox="0 0 16 16" fill="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
  <g className="theme-fish-float" stroke="#083b4b" strokeWidth=".5" strokeLinejoin="miter">
   {isPuffer? <>
    <path d="M3 5 1 3v3l2 1v2l-2 1v3l2-2m10-6 2-2v3l-2 1v2l2 1v3l-2-2" fill={colors.fin}/>
    <path d="M5 3V2h2V1h2v1h2v1h2v2h1v6h-1v2h-2v1H9v1H7v-1H5v-1H3v-2H2V5h1V3Z" fill={colors.body}/>
    <path d="M5 11h6v2H5z" fill={colors.light} stroke="none"/>
    <rect x="5" y="6" width="2" height="2" fill="#fff9e9" stroke="none"/>
    <rect x="9" y="6" width="2" height="2" fill="#fff9e9" stroke="none"/>
    <rect x="6" y="7" width="1" height="1" fill="#123541" stroke="none"/>
    <rect x="9" y="7" width="1" height="1" fill="#123541" stroke="none"/>
    <rect x="7" y="9" width="2" height="1" fill={colors.accent} stroke="none"/>
   </>:<>
    <path d="M3 8 1 6v4l2-1m10-1 2-2v4l-2-1" fill={colors.fin}/>
    <path d="M4 5h2V4h4v1h2v2h1v3h-1v2h-2v1H6v-1H4v-2H3V7h1z" fill={colors.body}/>
    <rect x="6" y="5" width="1" height="6" fill={colors.light} stroke="none"/>
    <rect x="9" y="5" width="1" height="6" fill={colors.accent} stroke="none"/>
    <rect x="10" y="6" width="1" height="1" fill="#fff9e9" stroke="none"/>
    <rect x="11" y="6" width="1" height="1" fill="#123541" stroke="none"/>
   </>}
  </g>
 </svg>
}

export default function Discover(){
 const[filtersOpen,setFiltersOpen]=useState(true);
 const [yelpRating,setYelpRating]=useState<{rating:number;review_count:number}|null>(null);

 const[page,setPage]=useState<"explore"|"saved"|"theme"|"top"|"reviews"|"login">("explore"),[query,setQuery]=useState(""),[filters,setFilters]=useState<Filters>(INITIAL),[quick,setQuick]=useState("all"),[showMap,setShowMap]=useState(true),[sort,setSort]=useState("distance"),[savedType,setSavedType]=useState("all"),[modal,setModal]=useState<Modal>(null),[selected,setSelected]=useState<string|null>(null),[origin,setOrigin]=useState(CAMPUS),[originName,setOriginName]=useState("Texas A&M"),[geoBusy,setGeoBusy]=useState(false);
 const[stats,setStats]=useState<RatingStats>({}),[reviewLoading,setReviewLoading]=useState(false),[reviewError,setReviewError]=useState(""),[reviewPage,setReviewPage]=useState<{id:string;next:number;more:boolean}>({id:"",next:0,more:false});
 const[monthly,setMonthly]=useState<MonthlySpot[]>([]),[month,setMonth]=useState(""),[myReviews,setMyReviews]=useState<PublicReview[]>([]),[reviewTarget,setReviewTarget]=useState(""),[user,setUser]=useState<User>(null),[authReady,setAuthReady]=useState(false),[reviews,setReviews]=useState<PublicReview[]>([]),[saved,setSaved]=useState<Spot[]>([]),[loaded,setLoaded]=useState(false),[loadError,setLoadError]=useState(""),[busy,setBusy]=useState(false),[toast,setToast]=useState(""),[listLimit,setListLimit]=useState(24);
 const afterAuth=useRef<(()=>Promise<void>)|null>(null),authReturn=useRef<Modal>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),listPanel=useRef<HTMLDivElement>(null);
 const notify=useCallback((text:string)=>{setToast(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),4500)},[]);
 
 const refreshSession=useCallback(async()=>{const r=await fetch("/api/auth/session",{method:"POST"});const d=await r.json() as{user:{name:string;email:string}|null;configured:boolean;error?:string};if(!r.ok)throw Error(d.error||"Sign-in is temporarily unavailable.");setUser(d.user?{...d.user,eligible:true}:null);setAuthReady(d.configured);return d.user},[]);
 const loadState=useCallback(async()=>{try{const r=await fetch("/api/state",{cache:"no-store"});const d=await r.json() as{error:string;reviews:PublicReview[];spots:Spot[];stats:RatingStats;monthly:MonthlySpot[];month:string;ownReviews:PublicReview[]};if(!r.ok)throw Error(d.error);setReviews(d.reviews);setSaved(d.spots);setStats(d.stats);setMonthly(d.monthly||[]);setMonth(d.month||"");setMyReviews(d.ownReviews||[]);setLoadError("");setLoaded(true)}catch(e){setLoadError(e instanceof Error?e.message:"Could not load reviews.");setLoaded(true)}},[]);
 
 useEffect(()=>{void refreshSession().catch(()=>{}).finally(()=>void loadState());const timer=setInterval(()=>void refreshSession().catch(()=>{}),10*60*1000);const monthlyTimer=setInterval(()=>void loadState(),60*60*1000);return()=>{clearInterval(timer);clearInterval(monthlyTimer);if(toastTimer.current)clearTimeout(toastTimer.current)}},[refreshSession,loadState]);
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get("spot");if(restaurants.some(r=>r.id===id)){setModal({kind:"detail",id:id!});setSelected(id)}},[]);
 
 const loadReviews=useCallback(async(id:string,offset=0,signal?:AbortSignal)=>{setReviewLoading(true);setReviewError("");try{const response=await fetch(`/api/reviews?restaurantId=${encodeURIComponent(id)}&offset=${offset}`,{signal,cache:"no-store"});const data=await response.json() as {reviews:PublicReview[];hasMore:boolean;nextOffset:number;error?:string};if(!response.ok)throw Error(data.error||"Could not load reviews.");if(signal?.aborted)return;setReviews(old=>{const existing=offset?old:old.filter(r=>r.restaurantId!==id);const merged=new globalThis.Map(existing.map(r=>[r.id,r]));for(const r of data.reviews)merged.set(r.id,r);return [...merged.values()]});setReviewPage({id,next:data.nextOffset,more:data.hasMore})}catch(e){if(!signal?.aborted)setReviewError(e instanceof Error?e.message:"Could not load reviews.")}finally{if(!signal?.aborted)setReviewLoading(false)}},[]);
 const reviewRestaurant=modal&&(modal.kind==="detail"||modal.kind==="review")?modal.id:"";
 useEffect(()=>{if(!reviewRestaurant||!loaded)return;const controller=new AbortController();void loadReviews(reviewRestaurant,0,controller.signal);return()=>controller.abort()},[reviewRestaurant,modal?.kind,user?.email,loaded,loadReviews]);
 
 useEffect(()=>{
  if(modal?.kind!=="detail"){setYelpRating(null);return}
  const rid=modal.id;
  if(!IMPORTED[rid]?.yelp_id){setYelpRating(null);return}
  let active=true;setYelpRating(null);

fetch(`/api/yelp-rating?restaurantId=${encodeURIComponent(rid)}`)
  .then(async r =>
    r.ok
      ? (await r.json()) as { rating?: number; review_count?: number }
      : null
  )
  .then(d => {
    if (active && typeof d?.rating === "number") {
      setYelpRating({
        rating: d.rating,
        review_count: d.review_count ?? 0
      });
    }
  })
  .catch(() => {});

  return()=>{active=false};
 },[modal]);
 function score(r:Restaurant){return ratingInfo(r)?.aggie_rating??stats[r.id]?.avg??null}
 function scoreText(r:Restaurant){return score(r)?.toFixed(1)??null}
 function budget(r:Restaurant){return ratingInfo(r)?.average_cost??stats[r.id]?.spend??null}
 const reportedPrices=Object.values(stats).map(s=>s.spend).filter((v):v is number=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);
 const priceBand=(r:Restaurant,v:number)=>{const band=ratingInfo(r)?.price_rank;if(band)return {cheap:1,normal:2,expensive:3}[band];return reportedPrices.length<3?2:v<=reportedPrices[Math.floor((reportedPrices.length-1)/3)]?1:v<=reportedPrices[Math.floor((reportedPrices.length-1)*2/3)]?2:3};
 function toggle<T,>(arr:T[],v:T){return arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]}
 function clear(){setQuery("");setFilters(INITIAL);setQuick("all")}
 function navigate(next:"explore"|"saved"|"theme"|"top"|"reviews"|"login"){setPage(next);clear();setSavedType("all");listPanel.current?.scrollTo({top:0})}
 function open(r:Restaurant){setModal({kind:"detail",id:r.id});setSelected(r.id)}
 function signIn(returnTo:Modal=null){authReturn.current=returnTo;setModal({kind:"auth"})}
 
 async function write(path:string,body:unknown,method="POST"){const request=()=>fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});let r=await request();if(r.status===401){const refreshed=await refreshSession();if(refreshed)r=await request()}const d=await r.json() as{error?:string};if(!r.ok)throw Error(d.error||"Could not save your changes.")}
 async function performSave(r:Restaurant,status:"want"|"been"|null){setBusy(true);try{await write("/api/spots",{restaurantId:r.id,status});setSaved(old=>[...old.filter(s=>s.restaurantId!==r.id),...(status?[{restaurantId:r.id,status}]:[])]);notify(status==="want"?"Saved to your want-to-try list":status==="been"?"Marked as been there":"Removed from Saved")}finally{setBusy(false)}}
 async function save(r:Restaurant,status:"want"|"been"|null){if(busy)return;if(!user){afterAuth.current=()=>performSave(r,status);signIn(modal?.kind==="detail"?modal:null);return}if(loadError){notify("Reload your spots before making changes.");return}try{await performSave(r,status)}catch(e){notify(e instanceof Error?e.message:"Could not save spot")}}
 async function removeReview(r:Restaurant){if(busy)return;setBusy(true);try{await write("/api/reviews",{restaurantId:r.id},"DELETE");await loadState();await loadReviews(r.id);notify("Your review was deleted")}catch(e){notify(e instanceof Error?e.message:"Could not delete review")}finally{setBusy(false)}}
 
 async function signedIn(nextUser: { name?: string; email: string }) {
   const displayName = nextUser.name || nextUser.email.split('@')[0];
   const activeUser = { name: displayName, email: nextUser.email, eligible: true as const };
   
   setUser(activeUser);
   setModal(authReturn.current);
   
   if (!authReturn.current) {
     setPage("reviews");
   }
   
   authReturn.current = null;
   const action = afterAuth.current;
   afterAuth.current = null;

   if (action) {
     try {
       await action();
     } catch (e) {
       notify(e instanceof Error ? e.message : "Could not save spot");
     }
   } else {
     notify("You’re signed in. Welcome to Gig 'eats!");
   }

   void loadState();
 }

 async function signOut(){try{await write("/api/auth/logout",{});setUser(null);setSaved([]);setMyReviews([]);setModal(null);notify("You’ve signed out")}catch(e){notify(e instanceof Error?e.message:"Could not sign out")}}
 const filtered=restaurants.filter(r=>{const status=saved.find(s=>s.restaurantId===r.id)?.status;if(page==="saved"&&(!status||(savedType!=="all"&&status!==savedType)))return false;if(query&&!`${r.name} ${r.type} ${r.address}`.toLowerCase().includes(query.toLowerCase()))return false;const rating=score(r);if(filters.aggieOnly&&rating===null)return false;if(filters.minStars>0&&(rating===null||rating<filters.minStars))return false;if(miles(origin,r)>filters.radius)return false;const price=budget(r);if(filters.prices.length&&(price===null?!filters.unknownPrice:!filters.prices.includes(priceBand(r,price))))return false;if(filters.cuisines.length&&!filters.cuisines.includes(r.type))return false;if(filters.dietary.length&&!filters.dietary.every(d=>r.dietary.includes(d)))return false;if(filters.menuOnly&&!r.menuUrl)return false;if(quick==="mexican"&&!/Mexican/.test(r.type))return false;if(quick==="coffee"&&!/Coffee|Desserts/.test(r.type))return false;if(quick==="pizza"&&r.type!=="Pizza")return false;return true}).sort((a,b)=>sort==="rating"?(score(b)??-1)-(score(a)??-1)||miles(origin,a)-miles(origin,b):sort==="price"?(budget(a)??Infinity)-(budget(b)??Infinity)||miles(origin,a)-miles(origin,b):sort==="name"?a.name.localeCompare(b.name):miles(origin,a)-miles(origin,b));
 const resultKey=filtered.map(r=>r.id).join("|");useEffect(()=>{setListLimit(24);listPanel.current?.scrollTo({top:0})},[resultKey]);
 const filterCount=Number(filters.minStars>0)+Number(filters.aggieOnly)+Number(filters.radius!==10)+filters.prices.length+filters.cuisines.length+filters.dietary.length+Number(filters.menuOnly);
 const activeRestaurant=modal&&"id"in modal?restaurants.find(r=>r.id===modal.id):null;
 async function locate(){if(!navigator.geolocation){notify("Location isn’t available in this browser.");return}setGeoBusy(true);navigator.geolocation.getCurrentPosition(p=>{setOrigin({lat:p.coords.latitude,lng:p.coords.longitude});setOriginName("your location");setGeoBusy(false);setModal(null)},()=>{setGeoBusy(false);notify("Couldn’t access your location. Distances still start at campus.")},{enableHighAccuracy:false,timeout:10000})}
 const closeModal=()=>{setModal(null);afterAuth.current=null;authReturn.current=null};
 const monthLabel=month?new Date(`${month}-01T12:00:00Z`).toLocaleString("en-US",{month:"long",year:"numeric",timeZone:"UTC"}):"This month";
 const ratedSeafood=restaurants.filter(r=>/seafood|sushi|poke|fish|shrimp|crawfish|crab/i.test(r.type+" "+r.name)&&score(r)!==null).sort((a,b)=>(score(b)??0)-(score(a)??0)||(stats[b.id]?.n??0)-(stats[a.id]?.n??0));
 const seafoodPicks=ratedSeafood.length?ratedSeafood.slice(0,6):FEATURED_IDS.map(id=>restaurants.find(r=>r.id===id)).filter((r):r is Restaurant=>!!r);

 return <div className="app-shell map-app"><header className="header"><div className="header-inner"><button className="brand" onClick={()=>navigate("explore")} aria-label="Gig 'eats home"><span className="brand-icon"><Utensils size={23}/></span><span className="gig-logo">Gig <span>'eats</span></span></button><nav aria-label="Main navigation"><button className={page==="explore"?"active":""} onClick={()=>navigate("explore")}>Map</button><button className={page==="top"?"active":""} onClick={()=>navigate("top")}>Top Recommended</button><button className={page==="theme"?"active":""} onClick={()=>navigate("theme")}>Monthly Themes</button><button className={page==="reviews"?"active":""} onClick={()=>navigate(user?"reviews":"login")}>{user?"Your Reviews":"Login"}</button></nav></div></header>
 <main className={`main map-main ${showMap?"map-mode":"list-mode"} ${!filtersOpen&&showMap?"filters-hidden":""}`}><section className="explorer-intro"><div><h1>{page==="saved"?"Your next bite, saved.":page==="theme"?"See-food is here.":page==="top"?"Top Recommended":page==="reviews"?"Your Reviews":page==="login"?"Login":"Find your next bite."}</h1><p>{86} restaurants, cafés & sweet spots around College Station.</p></div>{(page==="explore"||page==="saved")&&<button className="location-button" onClick={()=>setModal({kind:"location"})}><MapPin size={15}/> Near {originName}<ChevronDown size={13}/></button>}</section>
 {page==="theme"&&<section className="theme-page" aria-label="Monthly theme"><div className="theme-hero"><SeaFish variant={0} size={190} /><span className="theme-kicker"><Fish size={16}/> {monthLabel.toUpperCase()} · SEAFOOD</span><h2>This month’s theme is see-food.</h2><p>A little ocean air for your next meal. Explore seafood spots around College Station and check their menus.</p><button className="theme-hero-action" onClick={()=>{navigate("explore");setQuick("all");setFilters({...INITIAL,cuisines:[...new Set(ratedSeafood.map(r=>r.type))]})}}>See all seafood spots <ArrowRight size={16}/></button></div><div className="theme-heading"><h2>Featured restaurants</h2><span>{ratedSeafood.length?"Highest Aggie-rated seafood spots":"Featured seafood picks · awaiting Aggie ratings"}</span></div><div className="theme-grid">{seafoodPicks.map((r,index)=><article className="theme-card" key={r.id}><span className="theme-card-icon"><SeaFish variant={index+1} size={58}/></span><div><small>{r.type} · {miles(origin,r).toFixed(1)} mi from {originName}</small><h3>{r.name}</h3><p>{r.address}</p><div className="theme-card-actions"><button onClick={()=>open(r)}>See restaurant <ArrowRight size={15}/></button><a href={r.menuUrl||r.website||r.sourceUrl} target="_blank" rel="noreferrer">Menu <ArrowUpRight size={13}/></a></div></div></article>)}</div><p className="theme-footer">A monthly collection, not a claim about current specials or availability.</p></section>}{page==="top"&&<section className="feature-page" aria-label="Top 10 restaurants"><p className="feature-intro">The 10 highest imported Aggie scores for matched restaurant locations. Ties favor more reviews. Ratings come from the supplied aggregated dataset, not exclusively from verified TAMU reviews.</p><div className="feature-list">{restaurants.filter(r=>ratingInfo(r)?.aggie_rating!=null).sort((a,b)=>(ratingInfo(b).aggie_rating-ratingInfo(a).aggie_rating)||(ratingInfo(b).total_reviews-ratingInfo(a).total_reviews)||a.name.localeCompare(b.name)).slice(0,10).map((r,i)=><button key={r.id} className="feature-row" onClick={()=>open(r)}><span className="feature-rank">{String(i+1).padStart(2,"0")}</span><span className="feature-name"><strong>{r.name}</strong><small>{r.type} · {r.address} · {priceLabel(r)}</small></span><span className="feature-score"><Star size={17} fill="currentColor"/> {ratingInfo(r).aggie_rating.toFixed(1)} <small>({ratingInfo(r).total_reviews} reviews)</small></span><ArrowRight size={17}/></button>)}</div></section>}
 {page==="login"&&<section className="feature-page login-page" aria-label="Login"><EmailSignIn configured={authReady} onComplete={signedIn}/></section>}
 {page==="reviews"&&<section className="feature-page review-page" aria-label="Your Reviews">{user?<><p className="feature-intro">Signed in as {user.email}. Rate a restaurant from one to five stars and tell other Aggies what you tried. <button className="text-button" onClick={()=>void signOut()}>Sign out</button></p><ReviewForm key={reviewTarget||"new"} user={user} initialId={reviewTarget} existing={myReviews} busy={busy} onAccount={()=>signIn()} onSubmit={async data=>{setBusy(true);try{await write("/api/reviews",data);await loadState();setReviewTarget(data.restaurantId);notify("Your review is live. Thanks for sharing!")}finally{setBusy(false)}}}/>{myReviews.length>0&&<div className="my-review-list"><h2>Your published reviews</h2>{myReviews.map(v=><button key={v.id} onClick={()=>setReviewTarget(v.restaurantId)}>{restaurants.find(r=>r.id===v.restaurantId)?.name??v.restaurantId} · {v.rating} ★ <span>Edit</span></button>)}</div>}</>:<div className="feature-empty"><GraduationCap size={28}/><h2>Sign in to write a review.</h2><button className="primary" onClick={()=>signIn()}>Login with TAMU email</button></div>}</section>}
 {(page==="explore"||page==="saved")&&<>
 <section className="map-search" aria-label="Find restaurants"><div className="search-row"><div className="search-field"><Search size={20}/><input aria-label="Search restaurants or cuisines" placeholder="Search a restaurant, cuisine, or street" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery("")}><X size={17}/></button>}</div><button className={`filter-button ${filterCount?"applied":""}`} onClick={()=>{if(window.innerWidth<=600)setModal({kind:"filters"});else{setFiltersOpen(v=>!v);setShowMap(true)}}} aria-expanded={filtersOpen}><SlidersHorizontal size={16}/>{filtersOpen?"Hide filters":"Show filters"}{filterCount>0&&<b>{filterCount}</b>}</button><button className="view-button" aria-label={showMap?"Switch to list view":"Switch to map view"} onClick={()=>setShowMap(!showMap)}>{showMap?<List size={17}/>:<Map size={17}/>}<span>{showMap?"List view":"Map view"}</span></button></div><div className="shortcut-row">{SHORTCUTS.map(s=><button key={s.id} aria-pressed={quick===s.id} className={`${quick===s.id?"active":""} ${s.id==="seafood"?"seasonal":""}`} onClick={()=>setQuick(s.id)}>{s.id==="coffee"&&<Coffee size={13}/>} {s.id==="seafood"&&<Fish size={14}/>} {s.label}</button>)}{filterCount>0&&<button className="clear-inline" onClick={()=>setFilters(INITIAL)}>Clear filters <X size={12}/></button>}</div></section>
 <section className="map-workspace" aria-label="Restaurants and map"><div className="results-panel" ref={listPanel}>
  <div className="snaggies-filter-panel">
    <div className="snaggies-filter-title">
      <div>
        <small>MAKE IT YOURS</small>
        <h2>Find your food</h2>
      </div>
      <button
        onClick={()=>{setFiltersOpen(false);setShowMap(true)}}
        aria-label="Hide filter panel"
      >
        <X size={17}/>
      </button>
    </div>

    <label>
      Cuisine
      <select
        value={filters.cuisines.length===1?filters.cuisines[0]:""}
        onChange={e=>setFilters({
          ...filters,
          cuisines:e.target.value?[e.target.value]:[]
        })}
      >
        <option value="">All cuisines</option>
        {TYPES.map(t=>
          <option key={t} value={t}>{t}</option>
        )}
      </select>
    </label>

    <label>
      Minimum Aggie rating
      <select
        value={filters.minStars}
        onChange={e=>setFilters({
          ...filters,
          minStars:Number(e.target.value)
        })}
      >
        <option value={0}>Any rating</option>
        <option value={3}>3+ stars</option>
        <option value={4}>4+ stars</option>
        <option value={4.5}>4.5+ stars</option>
      </select>
    </label>

    <label className="snaggies-check">
      <input
        type="checkbox"
        checked={filters.menuOnly}
        onChange={e=>setFilters({
          ...filters,
          menuOnly:e.target.checked
        })}
      />
      Has a direct menu
    </label>

    <div className="snaggies-filter-actions">
      <button onClick={()=>setModal({kind:"filters"})}>
        More filters ({filterCount})
      </button>
      <button onClick={clear}>Clear all</button>
    </div>
  </div>
  <div className="panel-heading"><h2>{page==="saved"?"Saved spots":"Places to try"}<span>{filtered.length}</span></h2><div>{page==="saved"&&<select aria-label="Filter saved lists" value={savedType} onChange={e=>setSavedType(e.target.value)}><option value="all">All saved</option><option value="want">Want to try</option><option value="been">Been there</option></select>}<select aria-label="Sort restaurants" value={sort} onChange={e=>setSort(e.target.value)}><option value="distance">Nearest first</option><option value="rating">Highest rated</option><option value="price">Reported price</option><option value="name">Name A–Z</option></select></div></div>{loadError&&<div className="error-banner" role="alert"><span>{loadError}</span><button onClick={()=>void loadState()}>Retry</button></div>}<div className="restaurant-grid">{filtered.slice(0,listLimit).map(r=>{const status=saved.find(s=>s.restaurantId===r.id)?.status,n=ratingInfo(r)?.total_reviews??(stats[r.id]?.n??0),price=budget(r);return <article className={`spot-row ${selected===r.id?"is-selected":""}`} key={r.id}><button className={`spot-type-icon type-${/coffee|dessert/i.test(r.type)?"coffee":/seafood/i.test(r.type)?"seafood":"food"}`} onClick={()=>open(r)} aria-label={`Open ${r.name}`}><CuisineIcon type={r.type}/></button><div className="spot-row-main"><button className="spot-name" onClick={()=>open(r)}>{r.name}</button><p className="spot-meta">{r.type}<span>·</span>{miles(origin,r).toFixed(1)} mi</p><div className="spot-rating">{n?<><Star size={12} fill="currentColor"/><strong>{scoreText(r)} {ratingInfo(r)?"Aggie score":"Aggie avg"}</strong><span>({n} review{n===1?"":"s"})</span></>:<span>No imported rating available</span>}{price!==null&&<span>· ${price} {ratingInfo(r)?"avg":"median"}{ratingInfo(r)?` · ${priceLabel(r)}`:""}</span>}</div><div className="spot-row-links"><a href={r.menuUrl||r.website||r.sourceUrl} target="_blank" rel="noreferrer"><BookOpen size={12}/>{r.menuUrl?"Menu":r.website?"Menu on website":"Listing & contact"}<ArrowUpRight size={11}/></a><button onClick={()=>open(r)}>Details & reviews <ArrowRight size={11}/></button></div></div><button className={`row-save ${status?"saved":""}`} disabled={busy||!loaded} aria-label={status?`Remove ${r.name} from Saved`:`Save ${r.name}`} aria-pressed={!!status} onClick={()=>void save(r,status?null:"want")}><Bookmark size={18} fill={status?"currentColor":"none"}/></button></article>})}{!filtered.length&&<div className="empty-state"><span>{page==="saved"?<Bookmark size={28}/>:<Utensils size={28}/>}</span><h3>{page==="saved"&&!user?"Keep the good spots close.":"No spots found."}</h3><p>{page==="saved"&&!user?"Verify your TAMU email to save places for later.":"Try another search or loosen your filters."}</p><button className="primary" onClick={()=>page==="saved"&&!user?signIn():clear()}>{page==="saved"&&!user?"Sign in with TAMU":"Clear search & filters"}<ArrowRight size={15}/></button></div>}</div>{filtered.length>listLimit&&<button className="load-more" onClick={()=>setListLimit(listLimit+24)}>Show {Math.min(24,filtered.length-listLimit)} more places <Plus size={15}/></button>}<div className="catalog-footer"><p>Catalog: <a href="https://visit.cstx.gov/food-drink/" target="_blank" rel="noreferrer">Visit College Station</a> · Checked Oct 24, 2026</p><button onClick={()=>setModal({kind:"about"})}>About the data <Info size={12}/></button></div></div>{showMap&&<SpotMap spots={filtered} selected={selected} onSelect={setSelected} onOpen={open} score={scoreText}/>}</section></>}
 </main>{toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast("")}><X size={15}/></button></div>}
 {modal&&<Dialog key={`${modal.kind}-${"id"in modal?modal.id:""}`} label={modal.kind==="detail"?activeRestaurant?.name??"Restaurant":modal.kind==="review"?"Write a review":modal.kind==="auth"?"TAMU email sign in":modal.kind==="filters"?"Filter restaurants":modal.kind==="location"?"Choose a starting location":"About Gig 'eats"} onClose={closeModal} wide={modal.kind==="detail"}>
 {modal.kind==="filters"&&<div className="modal-padding filters-modal"><p className="eyebrow">A LITTLE MORE YOUR TASTE</p><h2>Find your bite.</h2><label className="standalone-check"><input type="checkbox" checked={filters.menuOnly} onChange={e=>setFilters({...filters,menuOnly:e.target.checked})}/><BookOpen size={15}/> Has a direct menu link</label><div className="filter-section"><h3>Price range<small>Lower third = cheap, middle third = normal, upper third = expensive in your imported data.</small></h3><div className="budget-options">{[{id:1,label:"$",note:"Lower third"},{id:2,label:"$$",note:"Middle third"},{id:3,label:"$$$",note:"Upper third"}].map(p=><button key={p.id} aria-pressed={filters.prices.includes(p.id)} className={filters.prices.includes(p.id)?"chosen":""} onClick={()=>setFilters({...filters,prices:toggle(filters.prices,p.id)})}><b>{p.label}</b><span>{p.note}</span></button>)}</div><label className="standalone-check"><input type="checkbox" checked={filters.unknownPrice} onChange={e=>setFilters({...filters,unknownPrice:e.target.checked})}/> Include places without a reported price</label></div><div className="filter-section"><div className="filter-label"><label htmlFor="distance">Within</label><strong>{filters.radius} miles</strong></div><input id="distance" type="range" min="1" max="250" step="1" value={filters.radius} onChange={e=>setFilters({...filters,radius:+e.target.value})}/><p className="form-note">Straight-line distance from {originName}. Expand the radius to see Bryan, Navasota, Caldwell, Snook, and Hearne.</p></div><div className="filter-section"><div className="filter-label"><label htmlFor="stars">Minimum rating</label><strong>{filters.minStars?`${filters.minStars.toFixed(1)}+ stars`:"Any rating"}</strong></div><input id="stars" type="range" min="0" max="5" step="0.5" value={filters.minStars} onChange={e=>setFilters({...filters,minStars:+e.target.value})}/><label className="standalone-check"><input type="checkbox" checked={filters.aggieOnly} onChange={e=>setFilters({...filters,aggieOnly:e.target.checked})}/> Has a rating (imported score or local Aggie review)</label><p className="form-note">Imported Aggie scores use the supplied aggregated dataset. Reviews written on this site are shown separately and require TAMU verification.</p></div><div className="filter-section"><h3>Cuisine or type</h3><div className="filter-chips">{TYPES.map(t=><button key={t} aria-pressed={filters.cuisines.includes(t)} className={filters.cuisines.includes(t)?"chosen":""} onClick={()=>setFilters({...filters,cuisines:toggle(filters.cuisines,t)})}>{t}</button>)}</div></div><div className="filter-section"><h3>Dietary preferences</h3><div className="filter-checkboxes">{DIETS.map(d=><label key={d}><input type="checkbox" checked={filters.dietary.includes(d)} onChange={()=>setFilters({...filters,dietary:toggle(filters.dietary,d)})}/>{d}</label>)}</div><p className="form-note">Dietary options were checked against restaurant and chain menus. An option does not guarantee allergen-free preparation or certification. Check ingredients and cross-contact with staff.</p></div><div className="filter-footer"><button className="text-button" onClick={()=>setFilters(INITIAL)}>Reset filters</button><button className="primary" onClick={()=>setModal(null)}>Show {filtered.length} spots <ArrowRight size={16}/></button></div></div>}
 {modal.kind==="auth"&&(user?<div className="modal-padding account-modal"><span className="modal-symbol"><GraduationCap size={28}/></span><h2>You’re in, Aggie.</h2><p className="account-email">{user.email}</p><p>Your bookmarks are private. Published reviews show your chosen display name.</p><button className="primary" onClick={()=>{closeModal();navigate("saved")}}>Go to Saved <Bookmark size={16}/></button><button className="signout" onClick={()=>void signOut()}><LogOut size={15}/> Sign out</button></div>:<EmailSignIn configured={authReady} onComplete={signedIn}/>)}
 {modal.kind==="detail"&&activeRestaurant&&<div className="detail-content detail-no-photo"><div className="venue-heading"><span className="venue-symbol"><CuisineIcon type={activeRestaurant.type} size={27}/></span><p>{activeRestaurant.type}</p></div><div className="detail-title"><h2>{activeRestaurant.name}</h2>{scoreText(activeRestaurant)&&<span className="rating"><Star size={16} fill="currentColor"/><strong>{scoreText(activeRestaurant)}</strong><small>{ratingInfo(activeRestaurant)?`Imported score · ${ratingInfo(activeRestaurant).total_reviews} public reviews`:`Aggie avg · ${stats[activeRestaurant.id]?.n??0} local reviews`}</small></span>}{!scoreText(activeRestaurant)&&<span className="rating rating-pending">No imported rating available</span>}</div><p className="detail-subtitle">{activeRestaurant.address}</p>{budget(activeRestaurant)!==null&&<p className="detail-subtitle">Estimated meal: ${budget(activeRestaurant)} {ratingInfo(activeRestaurant)?`average · ${priceLabel(activeRestaurant)}`:"reported median"}</p>}<div className="detail-actions"><button className="secondary" disabled={busy} onClick={()=>void save(activeRestaurant,saved.some(s=>s.restaurantId===activeRestaurant.id&&s.status==="want")?null:"want")}><Bookmark size={15}/>{saved.some(s=>s.restaurantId===activeRestaurant.id&&s.status==="want")?"Saved to try":"Want to try"}</button><button className="secondary" disabled={busy} onClick={()=>void save(activeRestaurant,saved.some(s=>s.restaurantId===activeRestaurant.id&&s.status==="been")?null:"been")}><Check size={15}/>{saved.some(s=>s.restaurantId===activeRestaurant.id&&s.status==="been")?"Been there ✓":"Been there"}</button><a className="secondary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRestaurant.address)}`} target="_blank" rel="noreferrer"><MapPin size={15}/> Directions</a><button className="icon-button share-button" aria-label="Copy link to this restaurant" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/?spot=${activeRestaurant.id}`);notify("Spot link copied")}catch{notify("Could not copy the link.")}}}><ExternalLink size={17}/></button></div>
 <section className="menu-section"><div className="menu-section-title"><BookOpen size={22}/><div><h3>Menu</h3><p>{activeRestaurant.menuUrl?"See dishes and prices at the restaurant’s menu source.":activeRestaurant.website?"Check the restaurant’s website for its latest menu.":"A public menu link hasn’t been found for this location."}</p></div></div><div className="menu-actions">{activeRestaurant.menuUrl?<a className="primary" href={activeRestaurant.menuUrl} target="_blank" rel="noreferrer">Open menu <ArrowUpRight size={15}/></a>:activeRestaurant.website?<a className="primary" href={activeRestaurant.website} target="_blank" rel="noreferrer">Find menu on website <ArrowUpRight size={15}/></a>:<a className="secondary" href={activeRestaurant.sourceUrl} target="_blank" rel="noreferrer">Listing & contact <ArrowUpRight size={15}/></a>}{activeRestaurant.phone&&<a className="text-button" href={`tel:${activeRestaurant.phone.replace(/[^+\d]/g,"")}`}><Phone size={13}/> Call</a>}</div></section>
 <div className="venue-secondary-links">{activeRestaurant.website&&<a href={activeRestaurant.website} target="_blank" rel="noreferrer">Official website <ArrowUpRight size={12}/></a>}<a href={activeRestaurant.sourceUrl} target="_blank" rel="noreferrer">Directory source <ArrowUpRight size={12}/></a><span>{miles(origin,activeRestaurant).toFixed(1)} mi straight-line</span></div>
 <div className="reviews-heading"><h3>Aggie reviews <span>{stats[activeRestaurant.id]?.n??0}</span></h3><button className="secondary" onClick={()=>setModal({kind:"review",id:activeRestaurant.id})}><Plus size={15}/> Write a review</button></div><p className="reviews-explainer">Genuine experiences shared here by people with verified TAMU emails.</p>{reviewError&&<div className="error-banner" role="alert"><span>{reviewError}</span><button onClick={()=>void loadReviews(activeRestaurant.id)}>Retry</button></div>}{reviewLoading&&!reviews.some(r=>r.restaurantId===activeRestaurant.id)&&<p className="reviews-loading">Loading reviews…</p>}{reviews.filter(v=>v.restaurantId===activeRestaurant.id).length?reviews.filter(v=>v.restaurantId===activeRestaurant.id).map(v=><div className="review-item" key={v.id}><div className="review-author"><span className="review-avatar">{v.author[0].toUpperCase()}</span><div><strong>{v.author}{v.own?" · You":""}</strong><small>Visited {v.visitedAt} · ${v.spend} per person</small></div><span className="rating"><Star size={13} fill="currentColor"/>{v.rating}</span></div><strong className="review-dish">Ordered: {v.dish}</strong><p>{v.body}</p>{v.own&&<div className="review-own-actions"><button onClick={()=>setModal({kind:"review",id:activeRestaurant.id})}>Edit review</button><button disabled={busy} onClick={()=>void removeReview(activeRestaurant)}><Trash2 size={13}/> Delete</button></div>}</div>):<div className="review-empty" hidden={reviewLoading||!!reviewError}><Utensils size={24}/><strong>No Aggie reviews yet.</strong><p>Be the first to share your experience.</p></div>}{reviewPage.id===activeRestaurant.id&&reviewPage.more&&<button className="load-more" disabled={reviewLoading} onClick={()=>void loadReviews(activeRestaurant.id,reviewPage.next)}>{reviewLoading?"Loading…":"More Aggie reviews"}<Plus size={14}/></button>}<a className="external-reviews" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeRestaurant.name+" "+activeRestaurant.address)}`} target="_blank" rel="noreferrer"><span><strong>See Google rating & reviews</strong><small>Open this restaurant on Google Maps ↗</small></span><ArrowUpRight size={18}/></a>{ratingInfo(activeRestaurant)?.yelp_id&&<a className="external-reviews yelp-ratings-panel" href={`https://www.yelp.com/biz/${encodeURIComponent(ratingInfo(activeRestaurant).yelp_id)}`} target="_blank" rel="noreferrer"><span><strong>Yelp rating & reviews {yelpRating?.rating!=null?`★ ${yelpRating.rating.toFixed(1)}`:""}</strong><small>{yelpRating?.review_count!=null?`${yelpRating.review_count} Yelp reviews · Open on Yelp ↗`:"Open this restaurant on Yelp ↗"}</small></span><ArrowUpRight size={18}/></a>}<p className="form-note detail-fineprint">Menu links and location facts checked October 24, 2026. Menus and hours can change. Confirm dietary requirements directly with the restaurant.</p></div>}
 {modal.kind==="review"&&<ReviewForm user={user} initialId={modal.id} existing={myReviews} busy={busy} onAccount={()=>signIn(modal)} onSubmit={async data=>{setBusy(true);try{await write("/api/reviews",data);await loadState();setModal({kind:"detail",id:data.restaurantId});notify("Your review is live. Thanks for sharing!")}finally{setBusy(false)}}}/>}
 {modal.kind==="location"&&<div className="modal-padding"><span className="modal-symbol"><MapPin size={27}/></span><h2>Where are you starting?</h2><p>Distances are straight-line estimates, not walking or driving times.</p><button className="location-option" onClick={()=>{setOrigin(CAMPUS);setOriginName("Texas A&M");setModal(null)}}><GraduationCap size={22}/><span><strong>Texas A&M campus</strong><small>Approximate campus center</small></span>{originName==="Texas A&M"&&<Check size={17}/>}</button><button className="location-option" disabled={geoBusy} onClick={()=>void locate()}><LocateFixed size={22}/><span><strong>{geoBusy?"Finding your location…":"Use my location"}</strong><small>Your browser will ask for permission</small></span><ArrowUpRight size={17}/></button><p className="form-note">Your location stays in this page and is not saved to your account.</p></div>}
 {modal.kind==="about"&&<div className="modal-padding about-modal"><span className="modal-symbol"><Utensils size={27}/></span><h2>Real places. Real experiences.</h2><p>Gig 'eats is an independent food-discovery project around Texas A&M.</p><h3>The catalog</h3><p>{restaurants.length} unique locations from Visit College Station’s dining and coffee directories. Business names, addresses, website links, menu links, and coordinates were checked on October 24, 2026. Duplicate listings and an invalid map location were excluded. Coverage is broad, but it is not a guarantee that every restaurant is listed or currently open.</p><h3>Menus</h3><p>Direct menu links open the restaurant’s menu or ordering provider. Where a direct link isn’t available, use the official website or listing/contact link. Menu availability and prices may change.</p><h3>Reviews & prices</h3><p>Student ratings use only genuine reviews submitted here with a verified TAMU email. No sample scores or fake reviews are shown. Meal-cost estimates use median spend reported in those reviews. Google Maps reviews open in Google Maps and stay separate from Aggie scores.</p><h3>Your information</h3><p>Browsing is public. Bookmarks belong to your signed-in account. Reviews show your chosen display name, visit date, order, spend, and review. Your email stays private. You can edit or delete your reviews and remove saved spots.</p><p><a href="/privacy">Privacy</a> · <a href="/terms">Terms of use</a></p><h3>Source</h3><p><a href="https://visit.cstx.gov/food-drink/" target="_blank" rel="noreferrer">Visit College Station: Eat & Drink ↗</a></p></div>}
 </Dialog>}
 </div>
}

function EmailSignIn({
  configured,
  onComplete,
}: {
  configured: boolean;
  onComplete: (u: { name: string; email: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    const normalized = email.trim().toLowerCase();

    if (!normalized.endsWith("@tamu.edu")) {
      setError("Please use a valid @tamu.edu email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setBusy(true);

    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          password,
          action: mode === "signup" ? "register" : "login",
        }),
      });

      const d = (await r.json()) as {
        error?: string;
        message?: string;
        user?: { email: string };
      };

      if (!r.ok) throw Error(d.error || "Authentication failed");

      if (d.user) {
        await onComplete({ name: d.user.email.split("@")[0], email: d.user.email });
      } else if (d.message) {
        setNotice(d.message);
        setMode("login");
        setPassword("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-padding email-sign-in">
      <span className="modal-symbol">
        <Mail size={28} />
      </span>
      <p className="eyebrow">TEXAS A&amp;M COMMUNITY</p>
      <h2>{mode === "login" ? "Howdy, Aggie." : "Create your account."}</h2>
      <p>Use a verified @tamu.edu email to share reviews and save spots.</p>

      <div className="auth-switch">
        <button
          type="button"
          className={mode === "login" ? "chosen" : ""}
          onClick={() => {
            setMode("login");
            setError("");
            setNotice("");
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === "signup" ? "chosen" : ""}
          onClick={() => {
            setMode("signup");
            setError("");
            setNotice("");
          }}
        >
          Create account
        </button>
      </div>

      <form onSubmit={(e) => void submit(e)}>
        <label>
          TAMU email
          <input
            autoFocus
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@tamu.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            placeholder="At least 6 characters"
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="setup-notice" role="status">
            {notice}
          </p>
        )}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}

type ReviewData={restaurantId:string;author:string;rating:number;dish:string;body:string;spend:number;visitedAt:string};
function ReviewForm({user,initialId,existing,busy,onAccount,onSubmit}:{user:User;initialId:string;existing:PublicReview[];busy:boolean;onAccount:()=>void;onSubmit:(d:ReviewData)=>Promise<void>}) {
  const [id,setId]=useState(initialId);
  const [rating,setRating]=useState(0);
  const [author,setAuthor]=useState(user?.name==="Fellow foodie"?"":user?.name??"");
  const [dish,setDish]=useState("");
  const [body,setBody]=useState("");
  const [spend,setSpend]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [error,setError]=useState("");

  const own=existing.find(r=>r.restaurantId===id&&r.own);
  
  useEffect(()=>{
    setRating(own?.rating??0);
    setDish(own?.dish??"");
    setBody(own?.body??"");
    setSpend(own?String(own.spend):"");
    setDate(own?.visitedAt??new Date().toISOString().slice(0,10));
    if(own) setAuthor(own.author);
  },[id,own]);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!user){
      onAccount();
      return;
    }
    if(!rating){
      setError("Choose a star rating before posting.");
      return;
    }
    setError("");
    try{
      await onSubmit({restaurantId:id,author,rating,dish,body,spend:+spend,visitedAt:date});
    }catch(e){
      setError(e instanceof Error?e.message:"Could not save your review.");
    }
  }

  if(!user) return (
    <div className="modal-padding auth-prompt">
      <GraduationCap size={32}/>
      <h2>Share your take.</h2>
      <p>Verify your @tamu.edu email before writing a review.</p>
      <button className="primary" onClick={onAccount}>Sign in with TAMU <ArrowRight size={16}/></button>
    </div>
  );

  return (
    <div className="modal-padding review-form-wrap">
      <span className="eyebrow">YOUR TASTE. YOUR TAKE.</span>
      <h2>{own?"A fresh take on your bite.":"How was your last bite?"}</h2>
      <p>Help another Aggie find something good.</p>
      <form onSubmit={submit}>
        <label>
          The spot
          <select required value={id} onChange={e=>setId(e.target.value)}>
            <option value="" disabled>Choose a restaurant</option>
            {restaurants.map(r=><option key={r.id} value={r.id}>{r.name} — {r.address}</option>)}
          </select>
        </label>
        <fieldset className="star-field">
          <legend>Your overall rating</legend>
          <div>
            {[1,2,3,4,5].map(n=>(
              <button key={n} type="button" aria-label={`Rate ${n} star${n>1?"s":""}`} aria-pressed={rating===n} onClick={()=>setRating(n)}>
                <Star size={32} fill={n<=rating?"currentColor":"none"}/>
              </button>
            ))}
            <span>{["Pick your stars","Not my bite","Could be better","Pretty good","Loved it","A new favorite"][rating]}</span>
          </div>
        </fieldset>
        <label>
          Public display name
          <input required minLength={2} maxLength={40} value={author} onChange={e=>setAuthor(e.target.value)} placeholder="How should we credit you?"/>
        </label>
        <label>
          What did you order?
          <input required maxLength={100} value={dish} onChange={e=>setDish(e.target.value)} placeholder="The dish you came for (or came back for)"/>
        </label>
        <div className="form-row">
          <label>
            Spend per person ($)
            <input type="number" required min="1" max="500" step="1" value={spend} onChange={e=>setSpend(e.target.value)} placeholder="15"/>
          </label>
          <label>
            Visit date
            <input type="date" required max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/>
          </label>
        </div>
        <label>
          Your take
          <textarea required minLength={10} maxLength={1500} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="What was great? Anything you’d tell a friend before they go?"/>
          <span className="character-count">{body.length}/1500</span>
        </label>
        {error&&<p role="alert" className="form-error">{error}</p>}
        <button className="primary submit-review" type="submit" disabled={busy}>
          {busy?"Saving your review…":own?"Update my review":"Post my review"}
          <ArrowRight size={16}/>
        </button>
        <p className="filter-note">One editable rating per account per spot. Keep it honest, helpful, and about your own experience.</p>
      </form>
    </div>
  );
}

import ratingsData from "./ratings-data.json";
