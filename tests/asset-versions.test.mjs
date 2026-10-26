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
