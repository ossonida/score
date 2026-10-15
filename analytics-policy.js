const EXCLUDED_EMAIL_HASHES=new Set([
 'f4605ef7ee3ca9ba05d7df9241f099ef78dbaa021e6215e00d7036d94912f18c',
 '473170b5ef04948a82f911fd11d1bfa6630e2ef798b8404c457626c23e53b457'
]);
export async function isExcludedEmail(email){
 if(typeof email!=='string'||!email.trim())return false;
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.trim().toLowerCase()));
 return EXCLUDED_EMAIL_HASHES.has([...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join(''));
}
export function createAnalyticsGate({storage,search='',start,stop,isExcluded=isExcludedEmail}){
 const key='score.analytics.exclude.v1';let excluded=false,started=false,epoch=0;
 try{excluded=storage.getItem(key)==='1';}catch{excluded=true;}
 if(new URLSearchParams(search).get('analytics')==='off'){excluded=true;try{storage.setItem(key,'1');}catch{}}
 stop();
 return {async onAuthState(user){
  const current=++epoch;
  if(excluded){stop();return;}
  let blocked;try{blocked=await isExcluded(user?.email);}catch{if(current===epoch)stop();return;}
  if(current!==epoch)return;
  if(blocked){excluded=true;try{storage.setItem(key,'1');}catch{}stop();return;}
  if(!started){started=true;start();}
 }};
}
