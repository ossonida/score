import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../index.js';
import {verifyFirebaseToken} from '../auth.js';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {BggLimits} from '../limits.js';
const env={FIREBASE_PROJECT_ID:'score-1948e',BGG_API_TOKEN:'fake-test-secret',BGG_LIMITS:{idFromName:n=>n,get:()=>({fetch:async()=>new Response(null,{status:204})})}};
const xml='<items><item id="420087"><name type="primary" value="Flip 7"/><yearpublished value="2024"/></item></items>';
const request=(query='query=flip',options={})=>new Request('https://score.example/?'+query,{headers:{Origin:'https://ossonida.github.io',Authorization:'Bearer test'},...options});
const handler=(upstream=async()=>new Response(xml))=>createHandler({verify:async()=> 'user1',upstream});
test('search response and secret are restricted to fixed BGG upstream',async()=>{
 let count=0;const res=await handler(async(url,init)=>{count++;assert.equal(url.origin,'https://boardgamegeek.com');assert.equal(url.pathname,'/xmlapi2/search');assert.equal(init.headers.Authorization,'Bearer fake-test-secret');assert.equal(init.redirect,'error');return new Response(xml);})(request(),env);
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{games:[{id:'420087',name:'Flip 7',year:'2024'}]});assert.equal(count,1);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://ossonida.github.io');
});
test('preflight, untrusted origins and write requests',async()=>{
 const h=handler();assert.equal((await h(request('',{method:'OPTIONS'}),env)).status,204);assert.equal((await h(request('',{headers:{Origin:'https://evil.test'}}),env)).status,403);assert.equal((await h(request('',{method:'POST'}),env)).status,405);
});
test('no or invalid login rejected before BGG call',async()=>{
 let fetched=false;const h=createHandler({verify:async()=>{throw Error();},upstream:async()=>{fetched=true;}});
 assert.equal((await h(request(),env)).status,401);assert.equal((await h(request('',{headers:{}}),env)).status,401);assert.equal(fetched,false);
});
test('input validation prevents malformed queries and arbitrary targets',async()=>{
 for(const q of ['action=unknown','query=a','action=details&ids=1,0','action=details&ids='+Array(21).fill('13').join(','),'action=plays&username=a&page=11','action=collection&username='])assert.equal((await handler()(request(q),env)).status,400);
});
test('missing configuration fails closed',async()=>assert.equal((await handler()(request(),{...env,BGG_API_TOKEN:''})).status,503));
test('rate limits fail closed and return retry delay',async()=>{
 const limited={...env,BGG_LIMITS:{idFromName:n=>n,get:()=>({fetch:async()=>new Response(null,{status:429})})}};
 const r=await handler()(request(),limited);assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');
 const broken={...env,BGG_LIMITS:{idFromName:()=>{throw Error();}}};assert.equal((await handler()(request(),broken)).status,503);
});
test('upstream queue, throttle, errors and unsafe XML never expose token',async()=>{
 for(const status of [202,429,401,500]){const r=await handler(async()=>new Response('private upstream body',{status}))(request(),env);assert.equal(r.status,[202,429].includes(status)?status:502);assert.ok(!(await r.text()).includes('private'));}
 for(const body of ['<!DOCTYPE x><items/>','<!ENTITY x "a"><items/>','<html>error</html>','<items>'+ 'x'.repeat(2000001)+'</items>'])assert.equal((await handler(async()=>new Response(body))(request(),env)).status,502);
});
test('details, collection ownership and public play output match frontend contract',async()=>{
 let r=await handler(async()=>new Response('<items><item id="13"><name type="primary" value="CATAN"/><thumbnail>https://cf.geekdo-images.com/test.jpg</thumbnail></item></items>'))(request('action=details&ids=13'),env);assert.equal((await r.json()).games[0].id,'13');
 r=await handler(async url=>{assert.equal(url.searchParams.has('brief'),false);return new Response('<items><item objectid="13"><name sortindex="1">CATAN</name><status own="1"/><yearpublished>1995</yearpublished></item></items>');})(request('action=collection&username=Sky'),env);assert.deepEqual((await r.json()).items,[{id:'13',gameId:'13',name:'CATAN',year:'1995'}]);
 r=await handler(async()=>new Response('<plays total="1"><play id="9" date="2026-10-16" quantity="1"><item objectid="13" name="CATAN"/><players><player name="Sky" score="" win="0"/></players></play></plays>'))(request('action=plays&username=Sky'),env);const p=(await r.json()).items[0];assert.equal(p.gameId,'13');assert.equal(p.players[0].score,null);
});
test('Firebase JWT validates signature, project, expiration and required claims',async()=>{
 const {publicKey,privateKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='test';const keys=createLocalJWKSet({keys:[jwk]}),now=Math.floor(Date.now()/1000);
 const sign=(overrides={})=>new SignJWT({aud:'score-1948e',iss:'https://securetoken.google.com/score-1948e',sub:'user1',iat:now,exp:now+3600,auth_time:now,...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(privateKey);
 assert.equal(await verifyFirebaseToken(await sign(),'score-1948e',keys),'user1');
 for(const overrides of [{aud:'wrong'},{iss:'wrong'},{exp:now-1},{sub:''},{iat:now+3600},{auth_time:now+3600},{auth_time:undefined}])await assert.rejects(verifyFirebaseToken(await sign(overrides),'score-1948e',keys));
});
test('durable counter persists limits and cleanup alarm',async()=>{
 const data=new Map();let alarm=0;const storage={get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),setAlarm:async t=>{alarm=t;},deleteAll:async()=>data.clear()};storage.transaction=async fn=>fn(storage);
 const obj=new BggLimits({storage});for(let i=0;i<30;i++)assert.equal((await obj.fetch(new Request('https://limits/user'))).status,204);assert.equal((await obj.fetch(new Request('https://limits/user'))).status,429);assert.ok(alarm>Date.now());await obj.alarm();assert.equal(data.size,0);
});
