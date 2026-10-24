import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(realpathSync('./node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
const modules=[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:resolve('dist/server',f)}))];
const base={modulesRoot:resolve('dist/server'),modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false};
const CODE='123456'; // Isolated mock only. The production app never accepts a universal code.
const access=new Map(),refresh=new Map(),sent=[];
let tokenNumber=0,passed=0;
function ok(name){passed++;console.log(`✓ ${name}`)}
const user1={id:'test-aggie-1',email:'aggie1@tamu.edu',email_confirmed_at:'2026-10-24T00:00:00Z'};
const user2={id:'test-aggie-2',email:'aggie2@tamu.edu',email_confirmed_at:'2026-10-24T00:00:00Z'};
function issue(user){const n=++tokenNumber,a=`test-access-${n}`,r=`test-refresh-${n}`;access.set(a,user);refresh.set(r,user);return{access_token:a,refresh_token:r,expires_in:3600,user}}
async function provider(request){
 const url=new URL(request.url);assert.equal(url.origin,'https://auth-test.supabase.co');assert.equal(request.headers.get('apikey'),'test-publishable-key');
 const token=request.headers.get('authorization')?.replace('Bearer ','');
 if(url.pathname==='/auth/v1/user')return access.has(token)?Response.json(access.get(token)):Response.json({error:'invalid token'},{status:401});
 if(url.pathname==='/auth/v1/logout'){access.delete(token);return Response.json({ok:true})}
 const body=await request.json();
 if(url.pathname==='/auth/v1/otp'){sent.push(body.email);assert.ok(body.email.endsWith('@tamu.edu'));return Response.json({})}
 if(url.pathname==='/auth/v1/verify'){
  if(body.token!==CODE)return Response.json({error:'invalid code'},{status:400});
  const u=body.email===user1.email?user1:body.email===user2.email?user2:body.email==='unconfirmed@tamu.edu'?{id:'u3',email:body.email,email_confirmed_at:null}:body.email==='wrong-domain@tamu.edu'?{id:'u4',email:'attacker@example.com',email_confirmed_at:'2026-10-24'}:{id:`test-${body.email}`,email:body.email,email_confirmed_at:'2026-10-24'};
  return Response.json(issue(u));
 }
 if(url.pathname==='/auth/v1/token'){
  if(!refresh.has(body.refresh_token))return Response.json({error:'invalid refresh'},{status:400});
  const u=refresh.get(body.refresh_token);refresh.delete(body.refresh_token);return Response.json(issue(u));
 }
 throw Error(`Unexpected mock request: ${url.pathname}`);
}
const mf=new Miniflare({...base,d1Databases:{DB:'aggie-bites-email-test'},bindings:{SUPABASE_URL:'https://auth-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-publishable-key',TAMU_EMAIL_DELIVERY_READY:'true'},outboundService:provider});
const bare=new Miniflare({...base,d1Databases:{DB:'aggie-bites-no-auth-test'},outboundService:()=>{throw Error('Unconfigured auth must not call an external provider')}});
function cookies(response){return response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}
async function call(path,{method='GET',headers={},body,cookie,instance=mf}={}){return instance.dispatchFetch(`https://aggie.test${path}`,{method,headers:{...(method==='GET'?{}:{Origin:'https://aggie.test','Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})})}
const review={restaurantId:'fuego',author:'Test Aggie',rating:5,dish:'Tacos',body:'A helpful test review of this meal.',spend:14,visitedAt:'2026-10-20'};
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync(`drizzle/${file}`,'utf8').replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 ok('All migrations apply to a clean database');
 let r=await call('/');assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('Find your next bite.'));assert.ok(!html.includes('signin-with-chatgpt'));assert.ok(!html.includes('Monthly themes'));assert.ok(!html.includes('sidebar-nav'));ok('Simplified homepage renders with no ChatGPT sign-in links or sidebar navigation');
 r=await call('/api/state');assert.equal(r.status,200);assert.deepEqual(await r.json(),{reviews:[],spots:[],stats:{}});ok('Browsing and community reads require no account');
 r=await call('/api/auth/session',{method:'POST',body:{}});assert.deepEqual(await r.json(),{user:null,configured:true});ok('Session status exposes no secrets');
 for(const email of ['guest@example.com','student@tamu.edu.evil.test','student@@tamu.edu']){r=await call('/api/auth/start',{method:'POST',body:{email}});assert.equal(r.status,400)}assert.equal(sent.length,0);ok('Only exact TAMU email addresses can request codes');
 r=await call('/api/auth/start',{method:'POST',body:{email:' Aggie1@TAMU.EDU '}});assert.equal(r.status,200);assert.equal(sent[0],user1.email);assert.deepEqual(await r.json(),{ok:true});ok('Valid email requests are normalized; no code is returned to the browser');
 for(const route of ['start','verify','session','logout']){r=await call(`/api/auth/${route}`,{method:'POST',headers:{Origin:'https://other.test'},body:{email:user1.email,code:CODE}});assert.equal(r.status,403)}ok('Cross-origin authentication requests are rejected');
 r=await call('/api/auth/verify',{method:'POST',body:{email:user1.email,code:'000000'}});assert.equal(r.status,400);assert.equal(cookies(r),'');ok('Wrong codes never establish a session');
 for(const email of ['unconfirmed@tamu.edu','wrong-domain@tamu.edu']){r=await call('/api/auth/verify',{method:'POST',body:{email,code:CODE}});assert.equal(r.status,403);assert.equal(cookies(r),'')}ok('Provider responses must prove email confirmation and TAMU domain');
 r=await call('/api/auth/verify',{method:'POST',body:{email:user1.email,code:CODE}});assert.equal(r.status,200);let cookie1=cookies(r);const loginBody=await r.json();assert.equal(loginBody.user.email,user1.email);assert.ok(!JSON.stringify(loginBody).includes('token'));const setCookies=r.headers.getSetCookie();assert.equal(setCookies.length,2);for(const c of setCookies){assert.ok(c.includes('HttpOnly'));assert.ok(c.includes('Secure'));assert.ok(c.includes('SameSite=Lax'));assert.ok(c.includes('Path=/'));assert.ok(c.startsWith('__Host-'));assert.ok(!c.includes('Domain='))}ok('Verified email creates Secure HttpOnly cookies without exposing tokens');
 r=await call('/api/auth/verify',{method:'POST',body:{email:user2.email,code:CODE}});assert.equal(r.status,200);const cookie2=cookies(r);
 r=await call('/api/reviews',{method:'POST',body:review});assert.equal(r.status,401);
 r=await call('/api/reviews',{method:'POST',headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':user1.email},body:review});assert.equal(r.status,401);
 r=await call('/api/spots',{method:'POST',cookie:'__Host-ab-access=forged',body:{restaurantId:'fuego',status:'want'}});assert.equal(r.status,401);ok('Anonymous, forged cookies, and ChatGPT headers cannot authorize writes');
 r=await call('/api/reviews',{method:'POST',cookie:cookie1,headers:{Origin:'https://other.test'},body:review});assert.equal(r.status,403);ok('Cross-origin review writes are rejected');
 for(const invalid of [{rating:6},{visitedAt:'2026-02-30'},{restaurantId:'made-up'}]){r=await call('/api/reviews',{method:'POST',cookie:cookie1,body:{...review,...invalid}});assert.equal(r.status,400)}ok('Invalid reviews, dates, and restaurant IDs are rejected');
 r=await call('/api/reviews',{method:'POST',cookie:cookie1,body:review});assert.equal(r.status,200,await r.text());ok('Email-verified TAMU session can publish a review');
 r=await call('/api/reviews',{method:'POST',cookie:cookie1,body:review});assert.equal(r.status,429);ok('Review write cooldown is enforced');
 r=await call('/api/state',{cookie:cookie2});const state=await r.json();assert.equal(state.reviews.length,1);assert.equal(state.reviews[0].own,false);assert.ok(!('userId'in state.reviews[0]));assert.ok(!JSON.stringify(state).includes('@tamu.edu'));ok('Public reviews omit email addresses and account identifiers');
 r=await call('/api/spots',{method:'POST',cookie:cookie1,body:{restaurantId:'fuego',status:'want'}});assert.equal(r.status,200);
 r=await call('/api/spots',{method:'POST',cookie:cookie1,body:{restaurantId:'fuego',status:'been'}});assert.equal(r.status,200);
 r=await call('/api/state',{cookie:cookie1});const own=await r.json();assert.deepEqual(own.spots,[{restaurantId:'fuego',status:'been'}]);assert.equal(own.reviews[0].own,true);ok('Saved spots update without duplicates');
 r=await call('/api/state',{cookie:cookie2});assert.deepEqual((await r.json()).spots,[]);ok('Saved spots are isolated between TAMU accounts');
 r=await call('/api/reviews',{method:'DELETE',cookie:cookie2,body:{restaurantId:'fuego'}});assert.equal(r.status,200);
 r=await call('/api/state');assert.equal((await r.json()).reviews.length,1);ok('Another TAMU account cannot delete your review');
 await db.prepare('UPDATE reviews SET updated_at = ?').bind('2026-01-01T00:00:00Z').run();
 r=await call('/api/reviews',{method:'POST',cookie:cookie1,body:{...review,rating:4,body:'An updated take on my own experience.'}});assert.equal(r.status,200);
 r=await call('/api/state');const edited=await r.json();assert.equal(edited.reviews.length,1);assert.equal(edited.reviews[0].rating,4);ok('Editing preserves one rating per account per spot');
 r=await call('/api/reviews',{method:'DELETE',cookie:cookie1,body:{restaurantId:'fuego'}});assert.equal(r.status,200);
 r=await call('/api/spots',{method:'POST',cookie:cookie1,body:{restaurantId:'fuego',status:null}});assert.equal(r.status,200);
 r=await call('/api/state',{cookie:cookie1});assert.deepEqual(await r.json(),{reviews:[],spots:[],stats:{}});ok('Owners can remove their reviews and saved spots');
 const seed=[];for(let i=0;i<55;i++)seed.push(db.prepare('INSERT INTO reviews (id,user_id,restaurant_id,author,rating,dish,body,spend,visited_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(`seed-${i}`,`seed-user-${i}`,'fuego',`Test Reviewer ${i}`,i%2?4:5,'Tacos','A real test fixture, only in an isolated database.',i+1,'2026-10-20',`2026-10-24T12:00:${String(i).padStart(2,'0')}Z`));await db.batch(seed);
 r=await call('/api/state');const aggregate=await r.json();assert.equal(aggregate.reviews.length,50);assert.equal(aggregate.stats.fuego.n,55);assert.equal(aggregate.stats.fuego.spend,28);assert.ok(aggregate.stats.fuego.avg>4&&aggregate.stats.fuego.avg<5);ok('Ratings and median spend aggregate all reviews beyond the initial page');
 r=await call('/api/reviews?restaurantId=fuego');const firstPage=await r.json();assert.equal(firstPage.reviews.length,20);assert.equal(firstPage.hasMore,true);
 r=await call('/api/reviews?restaurantId=fuego&offset=20');const secondPage=await r.json();assert.equal(secondPage.reviews.length,20);assert.ok(secondPage.reviews.every(v=>!firstPage.reviews.some(p=>p.id===v.id)));ok('Public restaurant reviews paginate without duplicate records');
 r=await call('/api/reviews?restaurantId=not-a-spot');assert.equal(r.status,400);ok('Unknown restaurant review pages are rejected');
 await db.prepare('DELETE FROM reviews WHERE user_id LIKE ?').bind('seed-user-%').run();
 const refreshOnly=cookie1.split('; ').find(c=>c.startsWith('__Host-ab-refresh='));
 r=await call('/api/auth/session',{method:'POST',cookie:refreshOnly,body:{}});assert.equal(r.status,200);assert.equal((await r.json()).user.email,user1.email);cookie1=cookies(r);assert.ok(cookie1.includes('__Host-ab-access='));ok('Expired access can be refreshed without emailing another code');
 r=await call('/api/auth/logout',{method:'POST',cookie:cookie1,body:{}});assert.equal(r.status,200);assert.ok(r.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));ok('Logout clears both session cookies');
 for(let i=0;i<3;i++){r=await call('/api/auth/start',{method:'POST',body:{email:'rate-send@tamu.edu'}});assert.equal(r.status,200)}r=await call('/api/auth/start',{method:'POST',body:{email:'rate-send@tamu.edu'}});assert.equal(r.status,429);ok('Code-send rate limit is enforced');
 for(let i=0;i<10;i++){r=await call('/api/auth/verify',{method:'POST',body:{email:'rate-verify@tamu.edu',code:'000000'}});assert.equal(r.status,400)}r=await call('/api/auth/verify',{method:'POST',body:{email:'rate-verify@tamu.edu',code:'000000'}});assert.equal(r.status,429);ok('Code-guessing rate limit is enforced');
 r=await call('/api/auth/start',{method:'POST',body:{email:user1.email},instance:bare});assert.equal(r.status,503);assert.ok((await r.json()).error.includes('isn’t connected'));assert.equal(cookies(r),'');
 r=await call('/api/auth/session',{method:'POST',body:{},instance:bare});assert.deepEqual(await r.json(),{user:null,configured:false});ok('Unconfigured delivery fails closed without claiming a code was sent');
 for(const image of ['burger','tacos','chicken','coffee','sandwich','seafood','curry','breakfast'])assert.ok(existsSync(`public/food/${image}.jpg`));ok('All food assets are included locally');
 console.log(`${passed} checks passed. No real verification emails were sent.`);
}finally{await Promise.all([mf.dispose(),bare.dispose()])}
