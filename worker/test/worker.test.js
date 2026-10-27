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
 let count=0;const res=await handler(async(url,init)=>{count++;assert.equal(url.origin,'https://boardgamegeek.com');assert.equal(url.pathname,'/xmlapi2/search');assert.equal(init.headers.Authorization,'Bearer fake-test-secret');assert.equal(init.redirect,'manual');return new Response(xml);})(request(),env);
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{games:[{id:'420087',name:'Flip 7',year:'2024'}]});assert.equal(count,1);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://ossonida.github.io');
});
test('preflight, untrusted origins and write requests',async()=>{
 const h=handler();assert.equal((await h(request('',{method:'OPTIONS'}),env)).status,204);assert.equal((await h(request('',{headers:{Origin:'https://evil.test'}}),env)).status,403);assert.equal((await h(request('',{method:'POST'}),env)).status,405);
});
test('no or invalid login rejected before BGG call',async()=>{
 let fetched=false;const h=createHandler({verify:async()=>{throw Error();},upstream:async()=>{fetched=true;}});
 assert.equal((await h(request(),env)).status,401);assert.equal((await h(request('',{headers:{}}),env)).status,401);assert.equal(fetched,false);
});
test('cover proxy is origin-bound, authentication-free and restricted to BGG images',async()=>{
 const cover='https://cf.geekdo-images.com/test/path.jpg',h=handler(async(url,options)=>{assert.equal(url.href,cover);assert.equal(options.redirect,'manual');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg','Content-Length':'3'}});});
 let r=await h(request('action=cover&url='+encodeURIComponent(cover),{headers:{Origin:'https://ossonida.github.io'}}),{});assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://ossonida.github.io');assert.equal(r.headers.get('Content-Type'),'image/jpeg');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[1,2,3]);
 r=await h(new Request('https://score.example/?action=cover&url='+encodeURIComponent(cover)),{});assert.equal(r.status,403);
 for(const url of ['https://evil.test/a.jpg','http://cf.geekdo-images.com/a.jpg','https://x@cf.geekdo-images.com/a.jpg'])assert.equal((await h(request('action=cover&url='+encodeURIComponent(url)),{})).status,400);
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
 r=await handler(async url=>{assert.equal(url.searchParams.has('brief'),false);return new Response('<items><item objectid="13"><name sortindex="1">CATAN</name><status own="1" wishlist="0"/><yearpublished>1995</yearpublished><thumbnail>https://cf.geekdo-images.com/c.jpg</thumbnail><numplays>4</numplays></item><item objectid="30549"><name>Pandemic</name><status own="0" wanttoplay="1"/></item></items>');})(request('action=collection&username=Sky'),env);assert.deepEqual((await r.json()).items,[{id:'13',gameId:'13',name:'CATAN',year:'1995',owned:true,wishlist:false,wantToPlay:false,numPlays:4,thumbnail:'https://cf.geekdo-images.com/c.jpg'},{id:'30549',gameId:'30549',name:'Pandemic',year:'',owned:false,wishlist:false,wantToPlay:true}]);
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

test('upstream authorization, denial and transport failures have safe distinct codes',async()=>{
 for(const [status,code]of [[401,'BGG_TOKEN_REJECTED'],[403,'BGG_ACCESS_DENIED'],[500,'BGG_HTTP_ERROR']]){const r=await handler(async()=>new Response('SECRET private body',{status}))(request(),env);const d=await r.json();assert.equal(r.status,502);assert.equal(d.code,code);assert.equal(d.upstreamStatus,status);assert.ok(!JSON.stringify(d).includes('SECRET'));assert.ok(!JSON.stringify(d).includes(env.BGG_API_TOKEN));}
 const r=await handler(async()=>{throw Error('network with private data');})(request(),env);assert.equal((await r.json()).code,'BGG_NETWORK_ERROR');
 const timeout=await handler(async()=>{throw new DOMException('timed out','TimeoutError');})(request(),env);assert.equal(timeout.status,504);assert.equal((await timeout.json()).code,'BGG_TIMEOUT');
});
test('canonical BGG redirects are followed once, other targets never receive the token',async()=>{
 let calls=0;const r=await handler(async(url,options)=>{calls++;if(calls===1)return new Response(null,{status:301,headers:{Location:'https://www.boardgamegeek.com/xmlapi2/search?query=flip'}});assert.equal(url.hostname,'www.boardgamegeek.com');assert.equal(options.headers.Authorization,'Bearer fake-test-secret');return new Response(xml);})(request(),env);assert.equal(r.status,200);assert.equal(calls,2);
 for(const target of ['https://evil.test/xmlapi2/search','http://boardgamegeek.com/xmlapi2/search','https://boardgamegeek.com/login','https://x@boardgamegeek.com/xmlapi2/search']){let n=0;const response=await handler(async()=>{n++;return new Response(null,{status:302,headers:{Location:target}});})(request(),env);assert.equal((await response.json()).code,'BGG_REDIRECT_REJECTED');assert.equal(n,1);}
});
test('BGG username errors and non-XML responses are explicit',async()=>{
 const r=await handler(async()=>new Response('<errors><error message="Invalid username"/></errors>'))(request('action=collection&username=nobody'),env);assert.equal(r.status,400);assert.equal((await r.json()).code,'BGG_USER_NOT_FOUND');
 const page=await handler(async()=>new Response('<html>private challenge</html>'))(request(),env);assert.equal((await page.json()).code,'BGG_NON_XML_RESPONSE');
});

test('account routes are authenticated, method-bound and scoped only to the verified Firebase UID',async()=>{
 let scope='',path='';const linked={...env,BGG_ACCOUNT_LINK_ENABLED:'true',BGG_SESSION_KEY:Buffer.alloc(32,7).toString('base64'),BGG_SESSIONS:{idFromName:uid=>{scope=uid;return uid;},get:()=>({fetch:async req=>{path=new URL(req.url).pathname;return Response.json({ready:true,connected:false});}})}};
 const r=await handler()(request('action=link-status'),linked);assert.equal(r.status,200);assert.equal(scope,'user1');assert.equal(path,'/status');
 assert.equal((await handler()(request('action=link-login'),linked)).status,405);
 const invalid=await handler()(request('action=cookie'),linked);assert.equal(invalid.status,400);assert.equal(path,'/status');
 const unready=await handler()(request('action=link-status'),env);assert.deepEqual(await unready.json(),{ready:false,connected:false,code:'BGG_LINK_NOT_READY'});
 const denied=createHandler({verify:async()=>{throw Error();},upstream:async()=>{throw Error('should not fetch');}});assert.equal((await denied(request('action=link-login',{method:'POST'}),linked)).status,401);
});
test('signed-out users may only search, from an allowed site, limited per address',async()=>{
 const keys=[];const limited={...env,BGG_LIMITS:{idFromName:n=>n,get:name=>({fetch:async()=>{keys.push(name);return new Response(null,{status:204});}})}};
 const guest=(query,headers={Origin:'https://ossonida.github.io','CF-Connecting-IP':'203.0.113.7'})=>new Request('https://score.example/?'+query,{headers});
 const h=createHandler({verify:async()=>{throw Error('no token expected');},upstream:async()=>new Response(xml)});
 const res=await h(guest('query=flip'),limited);assert.equal(res.status,200);assert.deepEqual(await res.json(),{games:[{id:'420087',name:'Flip 7',year:'2024'}]});assert.deepEqual(keys,['user:guest:203.0.113.7','global']);
 assert.equal((await h(guest('query=flip',{'CF-Connecting-IP':'203.0.113.7'}),limited)).status,401,'requests without an allowed site are rejected');
 for(const query of ['action=details&ids=13','action=collection&username=alice','action=plays&username=alice'])assert.equal((await h(guest(query),limited)).status,401,query);
});

