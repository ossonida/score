import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const base=new URL('../',import.meta.url),html=await fs.readFile(new URL('index.html',base),'utf8');
const bootstrap=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function startup(hash){
 const root={dataset:{}},listeners=new Map();let delayed=null;
 const context={document:{documentElement:root},location:{hash},Set,setTimeout:fn=>{delayed=fn;return 1;},clearTimeout:()=>{delayed=null;},window:{addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)}};
 vm.runInNewContext(bootstrap,context);
 return {root,context,ready:part=>context.window.ScoreStartup.ready(part),delay:()=>delayed?.()};
}
test('initial paint waits for records restoration and routing in either initialization order',()=>{
 for(const hash of ['#home','#settings','#stats','#games']){
  for(const order of [['route','games','records'],['records','games','route']]){
   const a=startup(hash);assert.equal(a.root.dataset.bootPending,'true');
   a.ready(order[0]);a.ready(order[1]);assert.equal(a.root.dataset.bootPending,'true');
   a.ready(order[2]);assert.equal(a.root.dataset.bootPending,undefined);
  }
 }
 assert.match(html,/html\[data-boot-pending\] body>main,html\[data-boot-pending\] dialog\{visibility:hidden;pointer-events:none\}/);
});
test('games waits for its own UI and slow loading offers retry without painting an incorrect board',()=>{
 const a=startup('#games');a.ready('route');a.ready('records');a.delay();
 assert.equal(a.root.dataset.bootPending,'true');assert.equal(a.root.dataset.bootSlow,'true');
 a.ready('games');assert.equal(a.root.dataset.bootPending,undefined);assert.equal(a.root.dataset.bootSlow,undefined);
 assert.match(html,/id="startupRetry"[^>]+onclick="location.reload\(\)"/);
});
test('all browser module entrypoints share exactly one records module URL and are cached',async()=>{
 const visited=new Set(),records=new Set();
 async function visit(url){
  if(visited.has(url.href))return;visited.add(url.href);
  if(url.pathname.endsWith('/records.js'))records.add(url.href);
  const file=new URL(url);file.search='';
  const source=await fs.readFile(file,'utf8');
  for(const match of source.matchAll(/import\s+(?:[^;\n]*?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g))await visit(new URL(match[1],url));
 }
 const entries=[...html.matchAll(/<script type="module" src="([^"]+)"/g)].map(m=>m[1]);
 for(const entry of entries)await visit(new URL(entry,base));
 assert.equal(records.size,1,'query versions create separate browser module instances');
 const sw=await fs.readFile(new URL('sw.js',base),'utf8');
 const recordsURL=[...records][0];assert.ok(sw.includes(new URL(recordsURL).pathname.split('/').pop()+new URL(recordsURL).search));
 for(const entry of entries.filter(p=>/settings|games-screen|bgg-link/.test(p)))assert.ok(sw.includes(entry.slice(2)));
});
