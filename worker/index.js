import {sessionReady} from './account-session.js';
export {BggSessions} from './account-session.js';
import {XMLParser} from 'fast-xml-parser';
import {verifyFirebaseToken} from './auth.js';
import {bearerToken,boundedXml} from '../functions/request-security.js';
import {gameDetails} from '../functions/game-details.js';
import {collectionData,playsData} from '../functions/bgg-data.js';
export {BggLimits} from './limits.js';
const ORIGINS=new Set(['https://ossonida.github.io','https://localhost','capacitor://localhost']);
const MAX_COVER_BYTES=5*1024*1024;
function safeCoverUrl(value){try{if(typeof value!=='string'||value.length>2048)return null;const url=new URL(value);return url.protocol==='https:'&&url.hostname==='cf.geekdo-images.com'&&!url.port&&!url.username&&!url.password?url:null;}catch{return null;}}
async function boundedImage(response){
 const declared=Number(response.headers.get('Content-Length')||0);if(declared>MAX_COVER_BYTES)throw Error('Cover too large');
 const reader=response.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_COVER_BYTES){await reader.cancel();throw Error('Cover too large');}chunks.push(value);}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
export function createHandler({verify=verifyFirebaseToken,upstream=fetch}={}){
 return async function handle(request,env){
  const origin=request.headers.get('Origin');
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','X-Score-BGG-Version':'5'};
  if(origin&&ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(status,data,extra={})=>Response.json(data,{status,headers:{...headers,...extra}});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'Origin not allowed'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'3600'}});
  if(!['GET','POST'].includes(request.method))return reply(405,{error:'GET or POST only'},{Allow:'GET, POST, OPTIONS'});
  const input=new URL(request.url),action=input.searchParams.get('action')||'search';
  if(action==='cover'){
   if(request.method!=='GET')return reply(405,{error:'GET only'},{Allow:'GET, OPTIONS'});
   if(!origin)return reply(403,{error:'Origin required'});
   const url=safeCoverUrl(input.searchParams.get('url'));
   if(!url)return reply(400,{error:'Invalid cover URL'});
   try{
    const response=await upstream(url,{redirect:'manual',headers:{Accept:'image/avif,image/webp,image/png,image/jpeg','User-Agent':'ScoreCounter/1.0 (https://ossonida.github.io/score/)'},signal:AbortSignal.timeout(12000)});
    const type=(response.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
    if(!response.ok||!['image/jpeg','image/png','image/webp','image/avif'].includes(type))return reply(502,{error:'Cover request failed'});
    const bytes=await boundedImage(response);
    return new Response(bytes,{status:200,headers:{...headers,'Content-Type':type,'Content-Length':String(bytes.byteLength),'Cache-Control':'public, max-age=2592000, immutable','Cross-Origin-Resource-Policy':'cross-origin'}});
   }catch{return reply(502,{error:'Cover request failed'});}
  }
  const token=bearerToken(request.headers.get('Authorization'));let uid;
  try{if(!token)throw Error();uid=await verify(token,env.FIREBASE_PROJECT_ID);}catch{return reply(401,{error:'Sign in required'});}
  if(!env.BGG_API_TOKEN||!env.BGG_LIMITS)return reply(503,{error:'BGG service is not configured'});
  const accountRoutes={'link-status':['GET','/status'],'link-login':['POST','/login'],'link-logout':['POST','/logout'],'link-post':['POST','/post']};
  if(Object.hasOwn(accountRoutes,action)){
   const [method,path]=accountRoutes[action];if(request.method!==method)return reply(405,{error:'Invalid method'});
   if(!sessionReady(env)||!env.BGG_SESSIONS)return reply(action==='link-status'?200:503,{ready:false,connected:false,code:'BGG_LINK_NOT_READY'});
   if(['link-login','link-post'].includes(action)){
    try{for(const [name,path]of [['user:'+uid,'/user'],['global','/global']]){const limiter=env.BGG_LIMITS.get(env.BGG_LIMITS.idFromName(name)),limited=await limiter.fetch('https://limits.internal'+path);if(limited.status===429)return reply(429,{code:'BGG_LOGIN_RATE_LIMIT'});if(!limited.ok)throw Error();}}catch{return reply(503,{code:'BGG_LINK_UNAVAILABLE'});}
   }
   const stub=env.BGG_SESSIONS.get(env.BGG_SESSIONS.idFromName(uid));
   const forwarded=new Request('https://session.internal'+path,{method,headers:{'Content-Type':request.headers.get('Content-Type')||''},...(method==='POST'?{body:request.body,duplex:'half'}:{})});
   try{const result=await stub.fetch(forwarded);return new Response(result.body,{status:result.status,headers:{...headers,'Content-Type':'application/json'}});}catch{return reply(503,{code:'BGG_LINK_UNAVAILABLE',error:'Account service unavailable'});}
  }
  if(request.method!=='GET')return reply(405,{error:'GET only'},{Allow:'GET, OPTIONS'});
  if(!['search','details','collection','plays'].includes(action))return reply(400,{error:'Invalid action'});
  const url=new URL('https://boardgamegeek.com/xmlapi2/'+(action==='details'?'thing':action));
  if(action==='search'){
   const q=(input.searchParams.get('query')||'').trim();if(q.length<2||q.length>120)return reply(400,{error:'Query must be 2–120 characters'});
   url.searchParams.set('query',q);url.searchParams.set('type','boardgame');
  }else if(action==='details'){
   const ids=(input.searchParams.get('ids')||'').split(',');if(ids.length>20||ids.some(id=>!/^[1-9][0-9]{0,9}$/.test(id)))return reply(400,{error:'Invalid game IDs'});
   url.searchParams.set('id',[...new Set(ids)].join(','));url.searchParams.set('stats','1');
  }else{
   const username=(input.searchParams.get('username')||'').trim(),page=Number(input.searchParams.get('page')||1);
   if(!username||username.length>64||/[\u0000-\u001f\u007f]/.test(username)||!Number.isInteger(page)||page<1||page>10)return reply(400,{error:'Invalid username or page'});
   url.searchParams.set('username',username);
   if(action==='collection'){url.searchParams.set('subtype','boardgame');}else url.searchParams.set('page',String(page));
   // Do not use brief=1: it omits status, needed to validate ownership.
  }
  try{
   for(const [name,path]of [['user:'+uid,'/user'],['global','/global']]){
    const stub=env.BGG_LIMITS.get(env.BGG_LIMITS.idFromName(name));
    const result=await stub.fetch('https://limits.internal'+path);
    if(result.status===429)return reply(429,{error:'Too many requests'},{'Retry-After':'60'});
    if(!result.ok)throw Error();
   }
  }catch{return reply(503,{error:'Request limit service unavailable'});}
  let phase='network',upstreamStatus;
  const failure=(code,status=502)=>reply(status,{error:'BGG request failed',code,...(upstreamStatus?{upstreamStatus}:{})});
  try{
   const options={redirect:'manual',headers:{Authorization:'Bearer '+env.BGG_API_TOKEN.trim(),Accept:'application/xml','User-Agent':'ScoreCounter/1.0 (https://ossonida.github.io/score/)'},signal:AbortSignal.timeout(12000)};
   if(['collection','plays'].includes(action)&&sessionReady(env)&&env.BGG_SESSIONS){
    const stub=env.BGG_SESSIONS.get(env.BGG_SESSIONS.idFromName(uid)),cookieUrl=new URL('https://session.internal/cookie');cookieUrl.searchParams.set('username',input.searchParams.get('username')||'');
    const cookieResponse=await stub.fetch(cookieUrl),saved=await cookieResponse.json();if(saved.cookie)options.headers.Cookie=saved.cookie;
   }
   let response=await upstream(url,options);
   // Forward credentials only across a single redirect within official XML API hosts.
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('Location');if(!location)return failure('BGG_REDIRECT_REJECTED');
    const next=new URL(location,url);
    if(next.protocol!=='https:'||!['boardgamegeek.com','www.boardgamegeek.com'].includes(next.hostname)||next.port||next.username||next.password||!next.pathname.startsWith('/xmlapi2/'))return failure('BGG_REDIRECT_REJECTED');
    response=await upstream(next,options);
   }
   upstreamStatus=response.status;
   if(response.status===401)return failure('BGG_TOKEN_REJECTED');
   if(response.status===403)return failure('BGG_ACCESS_DENIED');
   if(response.status===202||response.status===429)return reply(response.status,{error:'BGG temporarily busy'},{'Retry-After':'60'});
   if(!response.ok)return failure('BGG_HTTP_ERROR');
   phase='body';const xml=await boundedXml(response);
   if(/^\s*(?:<!doctype\s+html|<html)\b/i.test(xml))return failure('BGG_NON_XML_RESPONSE');
   phase='parse';
   const parser=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>['item','name','link','rank','play','player'].includes(name)});
   const parsed=parser.parse(xml);
   if(parsed.errors||parsed.error){const internal=JSON.stringify(parsed.errors||parsed.error);if(/invalid username|user(?:name)? not found|invalid user|unknown user/i.test(internal))return failure('BGG_USER_NOT_FOUND',400);return failure('BGG_API_ERROR');}
   if(action==='details'){if(!parsed.items)throw Error();return reply(200,{games:gameDetails(parsed)});}
   if(action==='collection'){if(!parsed.items)throw Error();for(const item of parsed.items.item||[])if(Array.isArray(item.name))item.name=item.name[0];return reply(200,collectionData(parsed));}
   if(action==='plays'){
    if(!parsed.plays)throw Error();for(const play of parsed.plays.play||[])if(Array.isArray(play.item))play.item=play.item[0];
    return reply(200,playsData(parsed));
   }
   if(!parsed.items)throw Error();
   const games=(parsed.items.item||[]).slice(0,40).map(item=>{const names=item.name||[],name=names.find(n=>n?.['@_type']==='primary')||names[0];return {id:String(item['@_id']),name:String(name?.['@_value']||''),year:String(item.yearpublished?.['@_value']||'')};}).filter(g=>/^[1-9][0-9]{0,9}$/.test(g.id)&&g.name);
   return reply(200,{games});
  }catch(error){if(error?.name==='TimeoutError'||error?.name==='AbortError')return failure('BGG_TIMEOUT',504);if(error?.message==='Response too large')return failure('BGG_RESPONSE_TOO_LARGE');return failure(phase==='network'?'BGG_NETWORK_ERROR':phase==='body'?'BGG_BODY_REJECTED':'BGG_INVALID_XML');}
 };
}
export default {fetch:createHandler()};
