import {checkedPlay,playForm,playFingerprint} from './play-upload.js';
import {rateWindow,boundedXml} from '../functions/request-security.js';
import {XMLParser} from 'fast-xml-parser';
const utf8=new TextEncoder(),day=86400000;
const idPattern=/^[1-9][0-9]{0,9}$/;
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(code,status=400)=>json(status,{code,error:'BGG account operation failed'});
const aad=(owner,username,expiresAt)=>utf8.encode('score-bgg-session-v1|'+owner+'|'+username+'|'+expiresAt);
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const unb64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
export async function readSmallJson(request,max=65536){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('JSON_REQUIRED');
 if(Number(request.headers.get('content-length'))>max)throw Error('BODY_TOO_LARGE');
 const reader=request.body?.getReader();if(!reader)throw Error('INVALID_BODY');const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('BODY_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function sessionReady(env){try{return env.BGG_ACCOUNT_LINK_ENABLED==='true'&&unb64(env.BGG_SESSION_KEY).length===32;}catch{return false;}}
async function readSmallText(response,max=65536){
 if(Number(response.headers.get('content-length'))>max||!response.body)throw Error('INVALID_RESPONSE');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('INVALID_RESPONSE');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function findScorePlay(fetcher,env,session,play){
 if(!env.BGG_API_TOKEN)return {checked:false,id:''};
 try{
  const url=new URL('https://boardgamegeek.com/xmlapi2/plays');url.searchParams.set('username',session.username);url.searchParams.set('mindate',play.date);url.searchParams.set('maxdate',play.date);url.searchParams.set('page','1');
  const response=await fetcher(url,{redirect:'manual',headers:{Authorization:'Bearer '+env.BGG_API_TOKEN.trim(),Accept:'application/xml',Cookie:session.cookie,'User-Agent':'ScoreCounter/1.0 (https://ossonida.github.io/score/)'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)return {checked:false,id:''};const xml=await boundedXml(response);if(/^\s*(?:<!doctype\s+html|<html)\b/i.test(xml))return {checked:false,id:''};
  const parser=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>['play','item'].includes(name)}),parsed=parser.parse(xml),rows=Array.isArray(parsed?.plays?.play)?parsed.plays.play:[];
  const marker='[ScoreCounter:'+play.id+']';for(const row of rows){const item=Array.isArray(row.item)?row.item[0]:row.item,id=String(row?.['@_id']||'');if(String(item?.['@_objectid']||'')===play.game.bggId&&String(row.comments||'').includes(marker)&&idPattern.test(id))return {checked:true,id};}
  return {checked:true,id:''};
 }catch{return {checked:false,id:''};}
}
// BGG에서 하고 싶은 게임(want to play)인 항목을 한 번에 읽습니다. 컬렉션 조회는 처음에 202(준비 중)를 자주 주므로 잠시 기다렸다 다시 묻습니다.
const agent='ScoreCounter/1.0 (https://ossonida.github.io/score/)',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// 컬렉션 항목(collid가 있는 행)을 읽습니다. 확인하지 못하면 null입니다.
async function collectionRows(fetcher,env,session,params){
 if(!env.BGG_API_TOKEN)return null;
 const url=new URL('https://boardgamegeek.com/xmlapi2/collection');url.searchParams.set('username',session.username);for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);url.searchParams.set('showprivate','1');
 const delay=Number(env.BGG_RETRY_DELAY_MS??1500);
 for(let attempt=0;attempt<4;attempt++){
  if(attempt)await pause(delay*attempt);
  try{
   const response=await fetcher(url,{redirect:'manual',headers:{Cookie:session.cookie,'User-Agent':agent,Authorization:'Bearer '+env.BGG_API_TOKEN.trim(),Accept:'application/xml'},signal:AbortSignal.timeout(12000)});
   if(response.status===202)continue;if(response.status!==200)return null;
   const xml=await boundedXml(response);if(/^\s*(?:<!doctype\s+html|<html)\b/i.test(xml))return null;
   const rows=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>name==='item'}).parse(xml)?.items?.item||[];
   return rows.filter(row=>idPattern.test(String(row?.['@_collid']||'')));
  }catch{return null;}
 }
 return null;
}
async function wantToPlayItems(fetcher,env,session){const rows=await collectionRows(fetcher,env,session,{wanttoplay:'1'});return rows&&new Map(rows.filter(row=>String(row?.status?.['@_wanttoplay']||'')==='1').map(row=>[String(row['@_objectid']),row]));}
const collectionPost=(fetcher,session,bggId,form)=>fetcher('https://boardgamegeek.com/geekcollection.php',{method:'POST',redirect:'manual',headers:{Cookie:session.cookie,'User-Agent':agent,'Content-Type':'application/x-www-form-urlencoded',Accept:'text/html, */*',Origin:'https://boardgamegeek.com',Referer:'https://boardgamegeek.com/boardgame/'+bggId},body:form.toString(),signal:AbortSignal.timeout(12000)});
// 요청한 게임의 하고 싶은 표시만 끕니다. BGG 저장 양식은 체크된 상태만 보내므로 나머지 상태는 그대로 다시 보냅니다.
const keptFlags=['own','prevowned','fortrade','want','wanttobuy','wishlist','preordered'];
async function clearWantToPlay(fetcher,env,session,ids){
 const result={cleared:[],notMarked:[],failed:[],unavailable:false},items=await wantToPlayItems(fetcher,env,session);
 if(!items){result.unavailable=true;return result;}
 for(const bggId of ids){
  const item=items.get(bggId);if(!item){result.notMarked.push(bggId);continue;}
  const form=new URLSearchParams({ajax:'1',action:'savedata',collid:String(item['@_collid']),fieldname:'status',objecttype:'thing',objectid:bggId});
  for(const flag of keptFlags)if(String(item.status['@_'+flag]||'')==='1')form.set(flag,'1');
  const priority=String(item.status['@_wishlistpriority']||'');if(form.has('wishlist')&&/^[1-5]$/.test(priority))form.set('wishlistpriority',priority);
  try{const saved=await collectionPost(fetcher,session,bggId,form);(saved.status===200?result.cleared:result.failed).push(bggId);}
  catch{result.failed.push(bggId);}
 }
 return result;
}
// 한 게임의 보유·하고 싶은·위시리스트·펀딩을 사용자가 고른 값으로 맞춥니다(BGG의 Add to Collection).
// 컬렉션에 없으면 먼저 추가하고, 다른 BGG 상태(이전 보유·교환 등)와 위시리스트 우선순위는 그대로 다시 보냅니다.
const editableFlags={owned:'own',wantToPlay:'wanttoplay',wishlist:'wishlist',preordered:'preordered'},otherFlags=['prevowned','fortrade','want','wanttobuy'];
async function setCollectionStatus(fetcher,env,storage,session,bggId,status){
 const find=async()=>{const rows=await collectionRows(fetcher,env,session,{id:bggId});return rows&&(rows.find(row=>String(row['@_objectid'])===bggId)||false);};
 const wanted=Object.keys(editableFlags).filter(name=>status[name]===true),delay=Number(env.BGG_RETRY_DELAY_MS??1500);
 let item=await find();if(item===null)return {code:'BGG_COLLECTION_BUSY'};
 if(!item){
  if(!wanted.length)return {saved:true};
  // 추가 직후 BGG 조회에 늦게 보일 수 있으므로 10분 안에는 다시 추가하지 않아 중복 항목을 막습니다.
  const mark='added:'+encodeURIComponent(session.username.toLowerCase())+':'+bggId,recent=await storage.get(mark);
  if(!(recent>Date.now()-600000)){let added;try{added=await collectionPost(fetcher,session,bggId,new URLSearchParams({ajax:'1',action:'additem',objecttype:'thing',objectid:bggId,quickadd:'1',force:'true'}));}catch{return {code:'BGG_COLLECTION_FAILED'};}if(added.status===401||added.status===403)return {code:'BGG_LOGIN_REQUIRED'};if(added.status!==200)return {code:'BGG_COLLECTION_FAILED'};await storage.put(mark,Date.now());}
  for(let attempt=0;attempt<2&&!item;attempt++){if(attempt)await pause(delay*attempt);item=await find();}
  if(!item)return {code:'BGG_COLLECTION_PENDING'};
 }
 const form=new URLSearchParams({ajax:'1',action:'savedata',collid:String(item['@_collid']),fieldname:'status',objecttype:'thing',objectid:bggId});
 for(const flag of otherFlags)if(String(item.status?.['@_'+flag]||'')==='1')form.set(flag,'1');
 for(const name of wanted)form.set(editableFlags[name],'1');
 const priority=String(item.status?.['@_wishlistpriority']||'');if(form.has('wishlist'))form.set('wishlistpriority',/^[1-5]$/.test(priority)?priority:'3');
 let saved;try{saved=await collectionPost(fetcher,session,bggId,form);}catch{return {code:'BGG_COLLECTION_FAILED'};}
 if(saved.status===401||saved.status===403)return {code:'BGG_LOGIN_REQUIRED'};if(saved.status!==200)return {code:'BGG_COLLECTION_FAILED'};
 return {saved:true};
}
function authCookie(response,username,now){
 const headers=response.headers,all=typeof headers.getSetCookie==='function'?headers.getSetCookie():typeof headers.getAll==='function'?headers.getAll('Set-Cookie'):[headers.get('Set-Cookie')||''];
 let auth='',expiry=now+day;
 for(const raw of all){const match=raw.match(/(?:^|,\s*)bggpassword=([^;\s,]+)(.*)$/i);if(!match)continue;const token=match[1];if(!token||token.length>4096||token.toLowerCase()==='deleted'||!/^[\x21-\x7e]+$/.test(token)||/[;,\\"]/.test(token))continue;
  const max=raw.match(/(?:^|;)\s*max-age=(-?\d+)/i),expires=raw.match(/(?:^|;)\s*expires=([^;]+)/i);let end=now+day;if(max)end=now+Number(max[1])*1000;else if(expires&&Number.isFinite(Date.parse(expires[1])))end=Date.parse(expires[1]);if(end<=now)continue;auth=token;expiry=Math.min(end,now+7*day);
 }
 return auth?{cookie:'bggusername='+encodeURIComponent(username)+'; bggpassword='+auth,expiresAt:expiry}:null;
}
export class BggSessions{
 constructor(state,env){this.state=state;this.env=env;}
 fetch(request){return this.state.blockConcurrencyWhile(()=>this.handle(request));}
 async aesKey(){return crypto.subtle.importKey('raw',unb64(this.env.BGG_SESSION_KEY),'AES-GCM',false,['encrypt','decrypt']);}
 async seal(username,cookie,expiresAt){const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(this.state.id.toString(),username,expiresAt)},await this.aesKey(),utf8.encode(cookie));return {username,expiresAt,iv:b64(iv),cipher:b64(new Uint8Array(data))};}
 async session(){const stored=await this.state.storage.get('session');if(!stored||stored.expiresAt<=Date.now()){if(stored)await this.state.storage.delete('session');return null;}try{const cookie=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(stored.iv),additionalData:aad(this.state.id.toString(),stored.username,stored.expiresAt)},await this.aesKey(),unb64(stored.cipher)));return {...stored,cookie};}catch{await this.state.storage.delete('session');return null;}}
 async alarm(){return this.state.blockConcurrencyWhile(async()=>{const stored=await this.state.storage.get('session');if(stored&&stored.expiresAt<=Date.now())await this.state.storage.delete('session');else if(stored)await this.state.storage.setAlarm(stored.expiresAt);});}
 async handle(request){
  if(!sessionReady(this.env))return fail('BGG_LINK_NOT_READY',503);
  const url=new URL(request.url),path=url.pathname;
  if(path==='/status'&&request.method==='GET'){
   const session=await this.session();if(!session)return json(200,{ready:true,connected:false});
   const prefix='post:'+encodeURIComponent(session.username.toLowerCase())+':',entries=await this.state.storage.list({prefix,limit:1000}),uploads={};for(const [key,value]of entries)uploads[key.slice(prefix.length)]={status:value.status,bggPlayId:value.bggPlayId||'',fingerprint:value.fingerprint||''};
   return json(200,{ready:true,connected:true,username:session.username,expiresAt:session.expiresAt,uploads});
  }
  // Internal-only route; the outer Worker never forwards this endpoint to clients.
  if(path==='/cookie'&&request.method==='GET'){const session=await this.session();return json(200,{cookie:session&&session.username.toLowerCase()===(url.searchParams.get('username')||'').toLowerCase()?session.cookie:''});}
  if(request.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  if(path==='/logout'){await this.state.storage.delete('session');return json(200,{connected:false,ready:true});}
  // 계정 삭제: 세션과 업로드 연결 정보를 모두 지운다.
  if(path==='/delete'){await this.state.storage.deleteAll();return json(200,{deleted:true});}
  let body;try{body=await readSmallJson(request,path==='/login'?4096:65536);}catch{return fail('INVALID_BODY');}if(!body||typeof body!=='object'||Array.isArray(body))return fail('INVALID_BODY');
  const fetcher=this.env.TEST_FETCH||fetch;
  if(path==='/login'){
   const window=rateWindow(await this.state.storage.get('loginWindow'),Date.now(),5);if(!window)return fail('BGG_LOGIN_RATE_LIMIT',429);await this.state.storage.put('loginWindow',window);
   const username=typeof body.username==='string'?body.username.trim():'';let password=body.password;
   if(!username||username.length>64||/[\u0000-\u001f\u007f]/.test(username)||typeof password!=='string'||!password||password.length>1024)return fail('BGG_INVALID_CREDENTIALS');
   try{const payload=JSON.stringify({credentials:{username,password}});password='';body.password='';const response=await fetcher('https://boardgamegeek.com/login/api/v1',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',Accept:'application/json'},body:payload,signal:AbortSignal.timeout(12000)});
    if(response.status===403)return fail('BGG_LOGIN_BLOCKED',502);if(response.status===429)return fail('BGG_LOGIN_RATE_LIMIT',429);if(!response.ok)return fail(response.status===400||response.status===401?'BGG_INVALID_CREDENTIALS':'BGG_LOGIN_UNAVAILABLE',response.status===400||response.status===401?401:502);
    const session=authCookie(response,username,Date.now());if(!session)return fail('BGG_LOGIN_UNCONFIRMED',401);
    await this.state.storage.put('session',await this.seal(username,session.cookie,session.expiresAt));await this.state.storage.setAlarm(session.expiresAt);
    return json(200,{ready:true,connected:true,username,expiresAt:session.expiresAt,uploads:{}});
   }catch{return fail('BGG_LOGIN_UNAVAILABLE',502);}finally{password='';body.password='';}
  }
  if(path==='/clear-want'){
   const session=await this.session();if(!session)return fail('BGG_LOGIN_REQUIRED',401);
   if(typeof body.expectedUsername!=='string'||body.expectedUsername.toLowerCase()!==session.username.toLowerCase())return fail('BGG_ACCOUNT_CHANGED',409);
   const ids=Array.isArray(body.bggIds)?[...new Set(body.bggIds.map(String))]:[];if(!ids.length||ids.length>20||ids.some(id=>!idPattern.test(id)))return fail('INVALID_BODY');
   return json(200,await clearWantToPlay(fetcher,this.env,session,ids));
  }
  if(path==='/collection'){
   const session=await this.session();if(!session)return fail('BGG_LOGIN_REQUIRED',401);
   if(typeof body.expectedUsername!=='string'||body.expectedUsername.toLowerCase()!==session.username.toLowerCase())return fail('BGG_ACCOUNT_CHANGED',409);
   const bggId=String(body.bggId??''),status=body.status;if(!idPattern.test(bggId)||!status||typeof status!=='object'||Array.isArray(status)||Object.keys(status).some(name=>!Object.hasOwn(editableFlags,name)||typeof status[name]!=='boolean'))return fail('INVALID_BODY');
   const result=await setCollectionStatus(fetcher,this.env,this.state.storage,session,bggId,status);
   if(result.code==='BGG_LOGIN_REQUIRED')await this.state.storage.delete('session');
   return result.saved?json(200,{saved:true,bggId,status}):fail(result.code,{BGG_LOGIN_REQUIRED:401,BGG_COLLECTION_BUSY:503,BGG_COLLECTION_PENDING:409}[result.code]||502);
  }
  if(path!=='/post')return fail('INVALID_ACTION');
  const session=await this.session();if(!session)return fail('BGG_LOGIN_REQUIRED',401);
  // Bind the user's explicit action to the account shown on their device.
  if(typeof body.expectedUsername!=='string'||body.expectedUsername.toLowerCase()!==session.username.toLowerCase())return fail('BGG_ACCOUNT_CHANGED',409);
  let play;try{play=checkedPlay(body.play);}catch{return fail('BGG_INVALID_PLAY');}
  const key='post:'+encodeURIComponent(session.username.toLowerCase())+':'+play.id;let previous=await this.state.storage.get(key);const fingerprint=await playFingerprint(play,session.username);
  if((previous?.status==='pending'||previous?.status==='unknown')&&!previous?.bggPlayId){const recovered=await findScorePlay(fetcher,this.env,session,play);if(!recovered.checked)return fail('BGG_POST_UNCERTAIN',409);if(recovered.id){await this.state.storage.put(key,{status:'sent',fingerprint,bggPlayId:recovered.id});return json(200,{posted:true,recovered:true,status:'sent',bggPlayId:recovered.id,fingerprint});}previous={status:'failed',fingerprint:'',bggPlayId:''};}
  if(previous?.status==='sent'&&previous.fingerprint===fingerprint)return json(200,{posted:true,unchanged:true,status:'sent',bggPlayId:previous.bggPlayId,fingerprint});
  if(previous?.bggPlayId&&body.update!==true)return fail('BGG_UPDATE_REQUIRED',409);
  const bggPlayId=previous?.bggPlayId||'';await this.state.storage.put(key,{status:'pending',fingerprint,bggPlayId});
  try{
   const response=await fetcher('https://boardgamegeek.com/geekplay.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json, text/plain, */*',Cookie:session.cookie,Origin:'https://boardgamegeek.com',Referer:'https://boardgamegeek.com/boardgame/'+play.game.bggId,'User-Agent':'ScoreCounter/1.0 (https://ossonida.github.io/score/)'},body:playForm(play,session.username,bggPlayId).toString(),signal:AbortSignal.timeout(12000)});
   if(response.status===401||response.status===403){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});await this.state.storage.delete('session');return fail('BGG_LOGIN_REQUIRED',401);}
   if(response.status===429){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});return fail('BGG_LOGIN_RATE_LIMIT',429);}
   if(!response.ok)throw Error('UNCERTAIN');
   // Never return raw upstream HTML, cookies or error messages to the browser.
   const raw=await readSmallText(response);let data;try{data=JSON.parse(raw);}catch{if(/must\s+login|not\s+permitted|cannot\s+edit|can't.*play/i.test(raw)){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});await this.state.storage.delete('session');return fail('BGG_LOGIN_REQUIRED',401);}if(/messagebox\s+error/i.test(raw)){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});return fail('BGG_POST_REJECTED',422);}throw Error('UNCERTAIN');}
   if(typeof data.error==='string'&&data.error){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});if(/login|not permitted|cannot edit|can't.*play/i.test(data.error)){await this.state.storage.delete('session');return fail('BGG_LOGIN_REQUIRED',401);}return fail('BGG_POST_REJECTED',422);}
   const id=String(data.playid||'');if(!/^[1-9][0-9]{0,9}$/.test(id)||(bggPlayId&&id!==String(bggPlayId)))throw Error('UNCERTAIN');
   await this.state.storage.put(key,{status:'sent',fingerprint,bggPlayId:id});return json(200,{posted:true,status:'sent',bggPlayId:id,fingerprint});
  }catch{if(!bggPlayId){const recovered=await findScorePlay(fetcher,this.env,session,play);if(recovered.id){await this.state.storage.put(key,{status:'sent',fingerprint,bggPlayId:recovered.id});return json(200,{posted:true,recovered:true,status:'sent',bggPlayId:recovered.id,fingerprint});}}await this.state.storage.put(key,{status:'unknown',fingerprint,bggPlayId});return fail('BGG_POST_UNCERTAIN',409);}
 }
}
