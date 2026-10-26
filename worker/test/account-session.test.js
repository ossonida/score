import test from 'node:test';import assert from 'node:assert/strict';
import {BggSessions,sessionReady} from '../account-session.js';
import {playForm,playFingerprint} from '../play-upload.js';
const key=Buffer.alloc(32,7).toString('base64');
function setup(fetcher,owner='owner-one'){
 const data=new Map();let chain=Promise.resolve();const state={id:{toString:()=>owner},storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v);},delete:async k=>data.delete(k),setAlarm:async()=>{},list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix)).sort())},blockConcurrencyWhile:fn=>{const task=chain.then(fn);chain=task.catch(()=>{});return task;}};
 const env={BGG_ACCOUNT_LINK_ENABLED:'true',BGG_SESSION_KEY:key,TEST_FETCH:fetcher};return {session:new BggSessions(state,env),data,state,env};
}
const req=(path,body)=>new Request('https://internal'+path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(path==='/post'?{expectedUsername:'alice',...body}:body)})});
const credentials={username:'alice',password:'actual-password-never-store'};
const play={id:'score-one',game:{name:'CATAN',bggId:'13'},date:'2026-10-16',rule:'highest',players:[{name:'Me',score:10,color:'#52c7ef',isSelf:true},{name:'Other',score:5,color:'#ffcc00'}]};
const loginResponse=()=>new Response('{}',{headers:{'Set-Cookie':'bggpassword=opaque-auth-cookie; Path=/; Secure; HttpOnly; Max-Age=86400'}});
async function login(s){const r=await s.fetch(req('/login',credentials));assert.equal(r.status,200);return r.json();}
test('session readiness requires a separate 256-bit encryption key',()=>{assert.equal(sessionReady({BGG_ACCOUNT_LINK_ENABLED:'true',BGG_SESSION_KEY:key}),true);assert.equal(sessionReady({BGG_ACCOUNT_LINK_ENABLED:'true',BGG_SESSION_KEY:'bad'}),false);});
test('login stores encrypted cookie only and binds it to the durable owner',async()=>{
 const a=setup(async(url,init)=>{assert.equal(url,'https://boardgamegeek.com/login/api/v1');assert.deepEqual(JSON.parse(init.body),{credentials});return loginResponse();});const result=await login(a.session);
 assert.equal(result.connected,true);const disk=JSON.stringify([...a.data]);assert.ok(!disk.includes(credentials.password));assert.ok(!disk.includes('opaque-auth-cookie'));assert.ok(!JSON.stringify(result).includes('cookie'));
 const status=await(await a.session.fetch(req('/status'))).json();assert.equal(status.username,'alice');assert.equal(status.connected,true);assert.ok(!JSON.stringify(status).includes('cipher'));
 const stolen=setup(async()=>loginResponse(),'other-owner');stolen.data.set('session',a.data.get('session'));assert.equal((await(await stolen.session.fetch(req('/status'))).json()).connected,false);
});
test('blocked, failed and unconfirmed logins never claim a connection',async()=>{
 for(const [response,code]of [[new Response('',{status:403}),'BGG_LOGIN_BLOCKED'],[new Response('',{status:401}),'BGG_INVALID_CREDENTIALS'],[new Response('{}'),'BGG_LOGIN_UNCONFIRMED']]){const s=setup(async()=>response);const r=await s.session.fetch(req('/login',credentials));assert.equal((await r.json()).code,code);assert.equal(s.data.has('session'),false);}
});
test('missing sessions cannot post and expired/disconnected sessions are removed',async()=>{
 const s=setup(async()=>loginResponse());assert.equal((await s.session.fetch(req('/post',{play}))).status,401);await login(s.session);await s.session.fetch(req('/logout',{}));assert.equal((await(await s.session.fetch(req('/status'))).json()).connected,false);
 await login(s.session);s.data.get('session').expiresAt=Date.now()-1;assert.equal((await(await s.session.fetch(req('/status'))).json()).connected,false);
});
test('play encoding preserves null scores and only links the selected self player',()=>{
 const form=playForm(play,'alice');assert.equal(form.get('players[0][username]'),'alice');assert.equal(form.get('players[1][username]'),'');assert.equal(form.get('players[0][win]'),'1');
 const unknown=playForm({...play,players:play.players.map(p=>({...p,score:null}))},'alice');assert.equal(unknown.get('players[0][score]'),'');assert.equal(unknown.get('nowinstats'),'1');assert.equal(unknown.get('players[0][win]'),'0');
 assert.equal(playForm({...play,rule:'lowest'},'alice').get('players[1][win]'),'1');assert.equal(playForm({...play,rule:'cooperative'},'alice').get('nowinstats'),'1');
 assert.throws(()=>playForm({...play,game:{name:'bad',bggId:'https://evil'}},'alice'));assert.throws(()=>playForm({...play,date:'2026-02-31'},'alice'));
});
test('successful posts are idempotent across concurrent requests and explicit updates reuse the remote ID',async()=>{
 let posted=0;const s=setup(async(url,init)=>{if(url.includes('/login/'))return loginResponse();posted++;assert.equal(url,'https://boardgamegeek.com/geekplay.php');assert.equal(init.headers.Cookie,'bggusername=alice; bggpassword=opaque-auth-cookie');const form=new URLSearchParams(init.body);if(posted===2)assert.equal(form.get('playid'),'999');return Response.json({success:true,playid:999});});await login(s.session);
 const results=await Promise.all([s.session.fetch(req('/post',{play})),s.session.fetch(req('/post',{play}))]);assert.ok(results.every(r=>r.status===200));assert.equal(posted,1);
 const changed={...play,players:[{...play.players[0],score:20},play.players[1]]};assert.equal((await(await s.session.fetch(req('/post',{play:changed}))).json()).code,'BGG_UPDATE_REQUIRED');assert.equal(posted,1);
 assert.equal((await s.session.fetch(req('/post',{play:changed,update:true}))).status,200);assert.equal(posted,2);assert.notEqual(await playFingerprint(play,'alice'),await playFingerprint(changed,'alice'));
});
test('uncertain submissions are retained and cannot silently duplicate on retry',async()=>{
 let posts=0;const s=setup(async url=>{if(url.includes('/login/'))return loginResponse();posts++;throw Error('timeout after send');});await login(s.session);
 for(let i=0;i<2;i++){const r=await s.session.fetch(req('/post',{play}));assert.equal(r.status,409);assert.equal((await r.json()).code,'BGG_POST_UNCERTAIN');}assert.equal(posts,1);
 await s.session.fetch(req('/logout',{}));await login(s.session);assert.equal((await(await s.session.fetch(req('/status'))).json()).uploads[play.id].status,'unknown');
});
test('an uncertain new submission is recovered from BGG before any retry can duplicate it',async()=>{
 let posts=0,lookups=0;const s=setup(async url=>{url=String(url);if(url.includes('/login/'))return loginResponse();if(url.includes('/geekplay.php')){posts++;throw Error('timeout after send');}if(url.includes('xmlapi2/collection'))return new Response('<items></items>');lookups++;if(lookups===1)return new Response('',{status:202});return new Response(`<plays><play id="321"><item objecttype="thing" objectid="13"/><comments>Recorded with Score Counter [ScoreCounter:${play.id}]</comments></play></plays>`,{headers:{'Content-Type':'application/xml'}});});s.env.BGG_API_TOKEN='application-token';await login(s.session);
 const first=await s.session.fetch(req('/post',{play}));assert.equal(first.status,409);assert.equal((await first.json()).code,'BGG_POST_UNCERTAIN');
 const second=await s.session.fetch(req('/post',{play})),data=await second.json();assert.equal(second.status,200);assert.equal(data.recovered,true);assert.equal(data.bggPlayId,'321');assert.equal(posts,1);assert.equal(lookups,2);
});
test('a valid play ID is accepted as success even when BGG omits its success flag',async()=>{
 const s=setup(async url=>String(url).includes('/login/')?loginResponse():Response.json({playid:654}));await login(s.session);const response=await s.session.fetch(req('/post',{play})),data=await response.json();assert.equal(response.status,200);assert.equal(data.bggPlayId,'654');
});
test('upstream auth errors clear session, explicit rejects allow retry, response bodies never leak',async()=>{
 const s=setup(async url=>url.includes('/login/')?loginResponse():Response.json({success:false,error:'You must login to save plays. PRIVATE'}));await login(s.session);const r=await s.session.fetch(req('/post',{play}));const text=await r.text();assert.ok(text.includes('BGG_LOGIN_REQUIRED'));assert.ok(!text.includes('PRIVATE'));assert.equal(s.data.has('session'),false);
});
test('invalid and oversized credential bodies are rejected before upstream login',async()=>{
 let called=false;const s=setup(async()=>{called=true;return loginResponse();});const r=await s.session.fetch(req('/login',{username:'x',password:'x'.repeat(5000)}));assert.equal(r.status,400);assert.equal(called,false);
});

test('tampered session account metadata is rejected and scalar JSON cannot reach BGG login',async()=>{const s=setup(async()=>loginResponse());await login(s.session);s.data.get('session').username='other';assert.equal((await(await s.session.fetch(req('/status'))).json()).connected,false);assert.equal((await s.session.fetch(req('/login',null))).status,400);});

test('a stale expiration alarm cannot delete a newer valid session',async()=>{const s=setup(async()=>loginResponse());await login(s.session);await s.session.alarm();assert.equal((await(await s.session.fetch(req('/status'))).json()).connected,true);s.data.get('session').expiresAt=Date.now()-1;await s.session.alarm();assert.equal(s.data.has('session'),false);});

test('a stale device cannot post to a different linked BGG account',async()=>{
 let posts=0;const s=setup(async url=>{if(url.includes('/login/'))return loginResponse();posts++;return Response.json({success:true,playid:999});});await login(s.session);
 const response=await s.session.fetch(req('/post',{play,expectedUsername:'old-account'}));assert.equal(response.status,409);assert.equal((await response.json()).code,'BGG_ACCOUNT_CHANGED');assert.equal(posts,0);assert.equal([...s.data.keys()].some(k=>k.startsWith('post:')),false);
 const missing=await s.session.fetch(req('/post',{play,expectedUsername:null}));assert.equal((await missing.json()).code,'BGG_ACCOUNT_CHANGED');assert.equal(posts,0);
 assert.equal((await s.session.fetch(req('/post',{play,expectedUsername:'ALICE'}))).status,200);assert.equal(posts,1);
});
test('clear-want waits for the BGG collection and clears only want to play, keeping other statuses',async()=>{
 const calls=[];let lookups=0;const s=setup(async(url,init)=>{const u=String(url);calls.push([u,init]);if(u.includes('/login/'))return loginResponse();if(u.includes('xmlapi2/collection')){lookups++;assert.equal(new URL(u).searchParams.get('wanttoplay'),'1');if(lookups===1)return new Response('',{status:202});return new Response('<items><item objecttype="thing" objectid="13" collid="777"><name>CATAN</name><status own="1" wishlist="1" wishlistpriority="2" wanttoplay="1"/></item><item objectid="822" collid="778"><status wanttoplay="1"/></item></items>');}if(u.includes('geekcollection.php'))return new Response('ok');return new Response('',{status:404});});
 s.env.BGG_API_TOKEN='token';s.env.BGG_RETRY_DELAY_MS=0;await login(s.session);
 const result=await(await s.session.fetch(req('/clear-want',{expectedUsername:'alice',bggIds:['13','30549']}))).json();
 assert.deepEqual(result,{cleared:['13'],notMarked:['30549'],failed:[],unavailable:false});assert.equal(lookups,2);
 const saves=calls.filter(([u])=>u.includes('geekcollection.php'));assert.equal(saves.length,1);const form=new URLSearchParams(saves[0][1].body);assert.equal(form.get('collid'),'777');assert.equal(form.get('fieldname'),'status');assert.equal(form.get('own'),'1');assert.equal(form.get('wishlist'),'1');assert.equal(form.get('wishlistpriority'),'2');assert.equal(form.has('wanttoplay'),false);assert.equal(saves[0][1].headers.Cookie,'bggusername=alice; bggpassword=opaque-auth-cookie');
 assert.equal((await s.session.fetch(req('/clear-want',{expectedUsername:'bob',bggIds:['13']}))).status,409);assert.equal((await s.session.fetch(req('/clear-want',{expectedUsername:'alice',bggIds:Array(21).fill('13').map((x,i)=>String(i+1))}))).status,400);
 const busy=setup(async url=>{const u=String(url);if(u.includes('/login/'))return loginResponse();return new Response('',{status:202});});busy.env.BGG_API_TOKEN='token';busy.env.BGG_RETRY_DELAY_MS=0;await login(busy.session);
 assert.deepEqual(await(await busy.session.fetch(req('/clear-want',{expectedUsername:'alice',bggIds:['13']}))).json(),{cleared:[],notMarked:[],failed:[],unavailable:true});
});
test('worker and app compute the same export fingerprint for location, difficulty, scenario and missions',async()=>{
 const {bggPlayFingerprint}=await import('../../bgg-play-format.js');
 for(const extra of [{location:'집'},{rule:'cooperative',cooperativeResult:'success',difficulty:'영웅'},{rule:'cooperative',cooperativeResult:'failure',scenario:3},{rule:'cooperative',cooperativeResult:'success',missionAttempts:[{mission:1,result:'failure'},{mission:1,result:'success'}]}]){const p={...play,...extra};assert.equal(await playFingerprint(p,'alice'),await bggPlayFingerprint(p,'alice'));}
 for(const bad of [{location:'x'.repeat(121)},{difficulty:''},{scenario:0},{missionAttempts:[{mission:0,result:'success'}]}])await assert.rejects(async()=>playFingerprint({...play,...bad},'alice'));
});
