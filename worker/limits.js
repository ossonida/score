import {rateWindow} from '../functions/request-security.js';
// SQLite-backed Durable Objects are supported on Workers Free. Store only counters.
export class BggLimits{
 constructor(state){this.state=state;}
 async fetch(request){
  const limit=new URL(request.url).pathname==='/global'?60:30;
  const allowed=await this.state.storage.transaction(async tx=>{
   const now=Date.now(),next=rateWindow(await tx.get('window'),now,limit);
   if(!next)return false;
   await tx.put('window',next);await tx.setAlarm(now+120000);return true;
  });
  return new Response(null,{status:allowed?204:429});
 }
 async alarm(){await this.state.storage.deleteAll();}
}
