import {checkedPlay,playForm,playFingerprint} from './play-upload.js';
import {rateWindow} from '../functions/request-security.js';
const utf8=new TextEncoder(),day=86400000;
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
  if(path!=='/post')return fail('INVALID_ACTION');
  const session=await this.session();if(!session)return fail('BGG_LOGIN_REQUIRED',401);
  let play;try{play=checkedPlay(body.play);}catch{return fail('BGG_INVALID_PLAY');}
  const key='post:'+encodeURIComponent(session.username.toLowerCase())+':'+play.id,previous=await this.state.storage.get(key),fingerprint=await playFingerprint(play,session.username);
  if(previous?.status==='pending'||previous?.status==='unknown')return fail('BGG_POST_UNCERTAIN',409);
  if(previous?.status==='sent'&&previous.fingerprint===fingerprint)return json(200,{posted:true,unchanged:true,status:'sent',bggPlayId:previous.bggPlayId,fingerprint});
  if(previous?.bggPlayId&&body.update!==true)return fail('BGG_UPDATE_REQUIRED',409);
  const bggPlayId=previous?.bggPlayId||'';await this.state.storage.put(key,{status:'pending',fingerprint,bggPlayId});
  try{
   const response=await fetcher('https://boardgamegeek.com/geekplay.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json',Cookie:session.cookie},body:playForm(play,session.username,bggPlayId).toString(),signal:AbortSignal.timeout(12000)});
   if(response.status===401||response.status===403){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});await this.state.storage.delete('session');return fail('BGG_LOGIN_REQUIRED',401);}
   if(!response.ok)throw Error('UNCERTAIN');
   // Never return raw upstream HTML, cookies or error messages to the browser.
   const data=await readSmallJson(new Request('https://internal/response',{method:'POST',headers:{'Content-Type':'application/json'},body:response.body,duplex:'half'}));
   if(data.success!==true){if(typeof data.error==='string'&&data.error){await this.state.storage.put(key,{status:'failed',fingerprint,bggPlayId});if(/login|not permitted|cannot edit|can't.*play/i.test(data.error)){await this.state.storage.delete('session');return fail('BGG_LOGIN_REQUIRED',401);}return fail('BGG_POST_REJECTED',422);}throw Error('UNCERTAIN');}
   const id=String(data.playid||'');if(!/^[1-9][0-9]{0,9}$/.test(id)||(bggPlayId&&id!==String(bggPlayId)))throw Error('UNCERTAIN');
   await this.state.storage.put(key,{status:'sent',fingerprint,bggPlayId:id});return json(200,{posted:true,status:'sent',bggPlayId:id,fingerprint});
  }catch{await this.state.storage.put(key,{status:'unknown',fingerprint,bggPlayId});return fail('BGG_POST_UNCERTAIN',409);}
 }
}
