import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {setProAccount,applyCloudPro,isPro,hasProEntitlement,proOnlyText,proHash,markProLock,PRO_BETA_FREE}=await import('../pro-access.js');
const source=readFileSync(new URL('../pro-access.js',import.meta.url),'utf8');
const listed=[...source.matchAll(/'([0-9a-f]{64})'/g)].map(match=>match[1]);

// 공개 저장소라 실제 이메일은 소스·테스트 어디에도 두지 않는다.
test('Pro list holds only hashes, never plain email addresses',()=>{
 for(const text of [source,readFileSync(new URL(import.meta.url),'utf8')])assert.ok(!/[w.+-]+@[w-]+.[a-z]{2,}/i.test(text));
 assert.ok(listed.length>=1);
});

test('hash matches Node SHA-256 of normalized email',()=>{
 for(const email of ['someone@example.com',' Mixed.Case+tag@Example.org ','한글@예시.한국','x'.repeat(200)+'@a.io'])assert.equal(proHash(email),createHash('sha256').update('score-pro:'+email.trim().toLowerCase()).digest('hex'));
});

test('only listed accounts are Pro until payments exist',()=>{
 assert.equal(hasProEntitlement(),false);
 setProAccount({email:'someone@example.com'});assert.equal(hasProEntitlement(),false);
 setProAccount(null);assert.equal(hasProEntitlement(),false);
 assert.equal(proOnlyText(),'프로 버전에서 이용할 수 있습니다.');
});

test('server entitlement document decides Pro, cached per account, stale answers ignored',()=>{
 const store=new Map(),previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 try{
  setProAccount({uid:'uidA',email:'a@example.com'});assert.equal(hasProEntitlement(),false);
  applyCloudPro('uidA',true);assert.equal(hasProEntitlement(),true);assert.equal(store.get('score.pro.v1.uidA'),'1');
  setProAccount(null);assert.equal(hasProEntitlement(),false);
  setProAccount({uid:'uidA',email:'a@example.com'});assert.equal(hasProEntitlement(),true,'cached before network');
  setProAccount({uid:'uidB',email:'b@example.com'});applyCloudPro('uidA',true);assert.equal(hasProEntitlement(),false,'answer for another account ignored');
  setProAccount({uid:'uidA',email:'a@example.com'});applyCloudPro('uidA',false);assert.equal(hasProEntitlement(),false);assert.equal(store.has('score.pro.v1.uidA'),false);
 }finally{setProAccount(null);if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

// 베타 기간: 권한 없이도 Pro 기능을 열고, 버튼에는 열쇠 대신 'PRO' 표시. 스위치를 끄면 기존 잠금이 돌아온다.
test('beta opens Pro features to everyone and marks them instead of locking',()=>{
 assert.equal(PRO_BETA_FREE,true);
 setProAccount(null);assert.equal(hasProEntitlement(),false);assert.equal(isPro(),true);
 const classes=new Set(),attrs=new Map(),listeners=[],node={dataset:{},classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),addEventListener:(type,fn)=>listeners.push(fn)};
 const tracked=[],previous=globalThis.ScoreAnalytics;globalThis.ScoreAnalytics={track:(name,params)=>tracked.push([name,params])};
 try{
  markProLock(node,true,'period');assert.ok(classes.has('is-pro-beta'));assert.ok(!classes.has('is-pro-locked'));assert.equal(attrs.get('aria-description'),'Pro 기능 · 베타 기간 무료');
  markProLock(node,true,'period');assert.equal(listeners.length,1,'one click watcher per button');
  listeners[0]();listeners[0]();assert.deepEqual(tracked,[['pro_beta_used',{reason:'period'}]],'once per reason');
  markProLock(node,false);assert.ok(!classes.has('is-pro-beta'));assert.equal(attrs.has('aria-description'),false);listeners[0]();assert.equal(tracked.length,1);
 }finally{if(previous)globalThis.ScoreAnalytics=previous;else delete globalThis.ScoreAnalytics;}
});
