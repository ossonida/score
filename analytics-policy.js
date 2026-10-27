// 공개 저장소라 개발자 이메일(해시 포함)은 두지 않습니다. 내 방문은 한 번 ?analytics=off로 열면 그 기기에서 계속 제외됩니다.
const EXCLUDED_EMAIL_HASHES=new Set();
export async function isExcludedEmail(email){
 if(typeof email!=='string'||!email.trim())return false;
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.trim().toLowerCase()));
 return EXCLUDED_EMAIL_HASHES.has([...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join(''));
}
// 사용자가 끈 이용 분석(optout)은 개발자 제외(exclude)와 따로 저장하며, 다시 켜면 resume으로 전송을 재개한다.
export function createAnalyticsGate({storage,search='',start,stop,resume=()=>{},isExcluded=isExcludedEmail}){
 const key='score.analytics.exclude.v1',optKey='score.analytics.optout.v1';let excluded=false,optedOut=false,ready=false,started=false,epoch=0;
 try{excluded=storage.getItem(key)==='1';}catch{excluded=true;}
 try{optedOut=storage.getItem(optKey)==='1';}catch{optedOut=true;}
 if(new URLSearchParams(search).get('analytics')==='off'){excluded=true;try{storage.setItem(key,'1');}catch{}}
 stop();
 return {async onAuthState(user){
  const current=++epoch;
  if(excluded){stop();return;}
  let blocked;try{blocked=await isExcluded(user?.email);}catch{if(current===epoch)stop();return;}
  if(current!==epoch)return;
  if(blocked){excluded=true;try{storage.setItem(key,'1');}catch{}stop();return;}
  ready=true;apply();
 },
 enabled:()=>!excluded&&!optedOut,
 setEnabled(on){optedOut=!on;try{storage.setItem(optKey,on?'0':'1');}catch{}apply();}};
 function apply(){if(excluded||optedOut||!ready){stop();return;}if(!started){started=true;start();}else resume();}
}
