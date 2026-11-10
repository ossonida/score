import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {setProAccount,applyCloudPro,isPro,proOnlyText,proHash}=await import('../pro-access.js');
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
 assert.equal(isPro(),false);
 setProAccount({email:'someone@example.com'});assert.equal(isPro(),false);
 setProAccount(null);assert.equal(isPro(),false);
 assert.equal(proOnlyText(),'프로 버전에서 이용할 수 있습니다.');
});

test('server entitlement document decides Pro, cached per account, stale answers ignored',()=>{
 const store=new Map(),previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 try{
  setProAccount({uid:'uidA',email:'a@example.com'});assert.equal(isPro(),false);
  applyCloudPro('uidA',true);assert.equal(isPro(),true);assert.equal(store.get('score.pro.v1.uidA'),'1');
  setProAccount(null);assert.equal(isPro(),false);
  setProAccount({uid:'uidA',email:'a@example.com'});assert.equal(isPro(),true,'cached before network');
  setProAccount({uid:'uidB',email:'b@example.com'});applyCloudPro('uidA',true);assert.equal(isPro(),false,'answer for another account ignored');
  setProAccount({uid:'uidA',email:'a@example.com'});applyCloudPro('uidA',false);assert.equal(isPro(),false);assert.equal(store.has('score.pro.v1.uidA'),false);
 }finally{setProAccount(null);if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
