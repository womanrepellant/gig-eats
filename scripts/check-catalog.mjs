import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const catalog=JSON.parse(readFileSync('app/catalog.json','utf8'));
let checks=0;function ok(message){checks++;console.log(`✓ ${message}`)}
assert.ok(catalog.length>=180);assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);ok('Catalog covers at least 180 unique restaurant locations');
for(const r of catalog){assert.ok(r.name&&r.address&&r.type);assert.ok(r.lat>30.45&&r.lat<30.8);assert.ok(r.lng> -96.6&&r.lng< -96.15);assert.equal(new URL(r.sourceUrl).hostname,'visit.cstx.gov');assert.equal(r.checkedAt,'2026-10-24');assert.equal(r.budget,null);assert.ok(!('sampleRating'in r));for(const key of ['website','menuUrl'])if(r[key])assert.ok(['http:','https:'].includes(new URL(r[key]).protocol));if(r.menuIsPdf)assert.ok(/\.pdf(?:$|[?#])/i.test(r.menuUrl));}ok('Every published marker has regional coordinates and a recorded source');ok('Every menu/website URL uses an HTTP protocol');ok('Catalog contains no sample ratings or invented meal prices');
assert.ok(catalog.filter(r=>r.menuUrl).length>=140);ok('More than 140 locations link directly to a menu');
for(const id of ['dixie-chicken','fuego','laynes','sweet-eugenes','blue-baker','fish-daddys','taz','hullabaloo'])assert.ok(catalog.some(r=>r.id===id));ok('Original saved/review restaurant IDs remain valid');
const emitted=ts.transpileModule(readFileSync('app/map-utils.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {project,unproject,fitLocations,clusterLocations}=await import(`data:text/javascript;base64,${Buffer.from(emitted).toString('base64')}`);
for(const r of catalog){const p=project(r.lat,r.lng,14),round=unproject(p.x,p.y,14);assert.ok(Math.abs(round.lat-r.lat)<1e-8);assert.ok(Math.abs(round.lng-r.lng)<1e-8)}ok('Map projection preserves all restaurant coordinates');
for(const [w,h] of [[1000,650],[350,300]]){const fit=fitLocations(catalog,w,h),center=project(fit.center.lat,fit.center.lng,fit.zoom);for(const r of catalog){const p=project(r.lat,r.lng,fit.zoom);assert.ok(Math.abs(p.x-center.x)<w/2);assert.ok(Math.abs(p.y-center.y)<h/2)}}ok('Fit-to-spots includes all venues on desktop and mobile map sizes');
const clusters=clusterLocations(catalog,13),ids=clusters.flatMap(c=>c.spots.map(r=>r.id));assert.equal(ids.length,catalog.length);assert.equal(new Set(ids).size,catalog.length);assert.ok(clusters.length<catalog.length);ok('Clustering reduces overlapping pins without dropping any restaurant');
const same=[{id:'a',lat:30.6,lng:-96.3},{id:'b',lat:30.6,lng:-96.3}];assert.equal(clusterLocations(same,18)[0].spots.length,2);ok('Restaurants at the same coordinates remain individually selectable');
console.log(`${checks} catalog and map checks passed.`);
