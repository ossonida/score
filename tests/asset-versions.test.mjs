import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Browsers treat ./x.js?v=1 and ./x.js?v=2 as two module instances, so one file must be referenced with one version.
// Pre-existing mismatches below are known debt; remove an entry once its imports are aligned. Never add new ones.
const KNOWN_MIXED={'game-artwork.js':['64','95'],'game-catalog.js':['64','76','95'],'stats-overview.js':['64','76']};
function versionRefs(){
 const refs=new Map(),add=(file,version,where)=>{if(!refs.has(file))refs.set(file,new Map());const versions=refs.get(file);versions.set(version,[...(versions.get(version)||[]),where]);};
 const html=fs.readFileSync(resolve(root,'index.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="\.\/([\w.-]+\.js)\?v=(\d+)"/g))add(m[1],m[2],'index.html');
 for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.js')&&name!=='sw.js')){const source=fs.readFileSync(resolve(root,file),'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]\.\/([\w.-]+\.js)\?v=(\d+)['"]/g))add(m[1],m[2],file);}
 return refs;
}
test('every module is loaded with a single version so it never runs twice',()=>{
 const mixed=Object.fromEntries([...versionRefs()].filter(([,versions])=>versions.size>1).map(([file,versions])=>[file,Object.fromEntries(versions)]));
 for(const [file,versions] of Object.entries(mixed))if(KNOWN_MIXED[file])assert.deepEqual(Object.keys(versions).sort(),KNOWN_MIXED[file],`${file} gained a new version mix`);
 assert.deepEqual(Object.keys(mixed).filter(file=>!KNOWN_MIXED[file]),[],'new mixed module versions: '+JSON.stringify(mixed));
});
test('versioned entry scripts in index.html are precached by the service worker',()=>{
 const html=fs.readFileSync(resolve(root,'index.html'),'utf8'),sw=fs.readFileSync(resolve(root,'sw.js'),'utf8');
 const missing=[...html.matchAll(/<script[^>]*src="\.\/([\w.-]+\.js\?v=\d+)"/g)].map(m=>m[1]).filter(path=>!sw.includes(`'${path}'`));
 assert.deepEqual(missing,[]);
});

test('service worker parses and serves cached shell files, index and Firebase SDK without waiting for the network',async()=>{
  const vm=await import('node:vm');
  const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const base='https://example.com/score/',stores=new Map(),listeners={},fetched=[];
  const open=name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {match:async r=>map.get(r.url||r),put:async(r,v)=>{map.set(r.url||r,v);},addAll:async()=>{}};};
  const caches={open:async name=>open(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async r=>{for(const map of stores.values()){const hit=map.get(r.url||r);if(hit)return hit;}}};
  const response=body=>({ok:true,body,clone(){return response(body);}});
  const context={self:{location:{href:base+'sw.js'},addEventListener:(type,fn)=>{listeners[type]=fn;},skipWaiting(){},clients:{claim(){}}},caches,URL,Request:class{constructor(url){this.url=url;}},Response:class{},fetch:async(request)=>{fetched.push(request.url||request);return response('network');},Promise,Set};
  vm.runInNewContext(source,context);
  const cacheName=source.match(/const CACHE='([^']+)'/)[1],index=base+'index.html',asset=base+source.match(/'(records\.js\?v=\d+)'/)[1];
  await (await caches.open(cacheName)).put(index,response('cached index'));
  await (await caches.open(cacheName)).put(asset,response('cached asset'));
  const run=async request=>{let result,waits=[];listeners.fetch({request,respondWith:p=>{result=p;},waitUntil:p=>waits.push(p)});const value=await result;await Promise.all(waits);return value;};
  assert.equal((await run({method:'GET',url:asset,mode:'cors'})).body,'cached asset');
  assert.equal(fetched.includes(asset),false);
  assert.equal((await run({method:'GET',url:base+'#stats',mode:'navigate'})).body,'cached index');
  const sdk='https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
  assert.equal((await run({method:'GET',url:sdk,mode:'cors'})).body,'network');
  fetched.length=0;assert.equal((await run({method:'GET',url:sdk,mode:'cors'})).body,'network');assert.deepEqual(fetched,[]);
});
