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
 assert.match(read('game-artwork.js'),/if\(raw!==savedRaw\)/);
 assert.match(read('bgg-metadata.js'),/if\(raw!==savedRaw\)/);
});
