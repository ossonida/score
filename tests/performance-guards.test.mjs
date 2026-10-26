import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {computeAssets,assetBytes} from '../scripts/sw-assets.mjs';

const root=new URL('../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root),'utf8');

test('service worker precaches exactly the current asset paths and stays small',()=>{
 const context={self:{location:{href:'https://example.test/score/sw.js'},addEventListener(){}},URL,Set};
 vm.runInNewContext(read('sw.js')+';globalThis.assets=ASSETS;',context);
 const listed=[...context.assets].map(url=>{const u=new URL(url);return u.pathname.replace('/score/','')+u.search;}).sort();
 assert.deepEqual(listed,computeAssets(),'run `npm run sw:assets` after changing ?v= versions or files');
 assert.ok(assetBytes(listed)<2*1024*1024,'precache over 2MB slows every update on phones');
});

test('auth state does not wait for the Firestore SDK',()=>{
 const source=read('cloud-records.js'),start=source.indexOf('connection=(async()=>{'),end=source.indexOf('})()',start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(source.slice(start,end),/firebase-firestore/);
 assert.match(source,/c\.auth\.onAuthStateChanged\(c\.session,onUser\);\s*if\(!storeConnection\)/);
});

test('per-item helpers do not re-read storage or re-normalize every alias',()=>{
 assert.match(read('score-games.js'),/aliasIndex\.get\(normalize\(name\)\)/);
 assert.match(read('game-artwork.js'),/readStoredJson\('score\.bgg\.covers\.v1'/);
 assert.match(read('bgg-metadata.js'),/readStoredJson\(KEY,/);
});

// localStorage JSON은 stored-json.js의 readStoredJson으로 읽는다. 아래는 한 번만 읽는(항목마다 반복되지 않는) 기존 자리다.
const directParseAllowed={'app-analytics.js':2,'bgg-account.js':1,'personal-stats.js':1,'records.js':4};
test('new localStorage JSON reads go through the cached helper',()=>{
 for(const file of fs.readdirSync(new URL('.',root)).filter(f=>f.endsWith('.js')&&!['sw.js','stored-json.js'].includes(f)&&!f.endsWith('.min.js'))){
  const count=(read(file).match(/JSON\.parse\(localStorage\.getItem\(/g)||[]).length;
  assert.ok(count<=(directParseAllowed[file]||0),`${file}: localStorage JSON을 직접 해석하는 곳이 늘었습니다. readStoredJson을 쓰세요.`);
 }
});

test('the perf budget seeds every large stored cache at realistic size',()=>{
 const perf=read('scripts/perf.mjs');
 for(const key of ['score.plays.v1.user.','score.bgg.metadata.v1','score.bgg.covers.v1','.collection','.plays','score.identity.v1.'])assert.ok(perf.includes(key),`scripts/perf.mjs에 ${key} 시드가 없습니다`);
});
