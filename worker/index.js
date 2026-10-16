import {XMLParser} from 'fast-xml-parser';
import {verifyFirebaseToken} from './auth.js';
import {bearerToken,boundedXml} from '../functions/request-security.js';
import {gameDetails} from '../functions/game-details.js';
import {collectionData,playsData} from '../functions/bgg-data.js';
export {BggLimits} from './limits.js';
const ORIGINS=new Set(['https://ossonida.github.io','https://localhost','capacitor://localhost']);
export function createHandler({verify=verifyFirebaseToken,upstream=fetch}={}){
 return async function handle(request,env){
  const origin=request.headers.get('Origin');
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(status,data,extra={})=>Response.json(data,{status,headers:{...headers,...extra}});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'Origin not allowed'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Authorization','Access-Control-Max-Age':'3600'}});
  if(request.method!=='GET')return reply(405,{error:'GET only'},{Allow:'GET, OPTIONS'});
  const token=bearerToken(request.headers.get('Authorization'));let uid;
  try{if(!token)throw Error();uid=await verify(token,env.FIREBASE_PROJECT_ID);}catch{return reply(401,{error:'Sign in required'});}
  if(!env.BGG_API_TOKEN||!env.BGG_LIMITS)return reply(503,{error:'BGG service is not configured'});
  const input=new URL(request.url),action=input.searchParams.get('action')||'search';
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
   if(action==='collection'){url.searchParams.set('own','1');url.searchParams.set('subtype','boardgame');}else url.searchParams.set('page',String(page));
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
  try{
   const response=await upstream(url,{redirect:'error',headers:{Authorization:'Bearer '+env.BGG_API_TOKEN},signal:AbortSignal.timeout(12000)});
   if(response.status===202||response.status===429)return reply(response.status,{error:'BGG temporarily busy'},{'Retry-After':'60'});
   if(!response.ok)throw Error();
   const xml=await boundedXml(response);
   const parser=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>['item','name','link','rank','play','player'].includes(name)});
   const parsed=parser.parse(xml);
   if(parsed.errors||parsed.error)throw Error();
   if(action==='details'){if(!parsed.items)throw Error();return reply(200,{games:gameDetails(parsed)});}
   if(action==='collection'){if(!parsed.items)throw Error();for(const item of parsed.items.item||[])if(Array.isArray(item.name))item.name=item.name[0];return reply(200,collectionData(parsed));}
   if(action==='plays'){
    if(!parsed.plays)throw Error();for(const play of parsed.plays.play||[])if(Array.isArray(play.item))play.item=play.item[0];
    return reply(200,playsData(parsed));
   }
   if(!parsed.items)throw Error();
   const games=(parsed.items.item||[]).slice(0,40).map(item=>{const names=item.name||[],name=names.find(n=>n?.['@_type']==='primary')||names[0];return {id:String(item['@_id']),name:String(name?.['@_value']||''),year:String(item.yearpublished?.['@_value']||'')};}).filter(g=>/^[1-9][0-9]{0,9}$/.test(g.id)&&g.name);
   return reply(200,{games});
  }catch{return reply(502,{error:'BGG data unavailable'});}
 };
}
export default {fetch:createHandler()};
