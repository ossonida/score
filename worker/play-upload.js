import {bggPlayForm,bggPlayFingerprint} from '../bgg-play-format.js';
const idPattern=/^[1-9][0-9]{0,9}$/;
export function checkedPlay(p){
 if(!p||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id)||!idPattern.test(String(p.game?.bggId||''))||typeof p.game?.name!=='string'||!p.game.name.trim()||p.game.name.length>120||!['highest','lowest','cooperative'].includes(p.rule)||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw Error('INVALID_PLAY');
 const date=new Date(p.date+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==p.date)throw Error('INVALID_PLAY');
 if(!Array.isArray(p.players)||!p.players.length||p.players.length>100||p.players.some(x=>!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>120||!(x.score===null||typeof x.score==='number'&&Number.isFinite(x.score)&&Math.abs(x.score)<=Number.MAX_SAFE_INTEGER)||typeof x.color!=='string'||!/^#[a-f0-9]{6}$/i.test(x.color)))throw Error('INVALID_PLAY');
 // BGG 양식에 들어가는 장소·난이도·시나리오·미션 기록은 검사만 하고 그대로 둡니다. 바꾸면 앱이 계산한 전송 지문과 달라져 같은 기록을 계속 수정본으로 봅니다.
 if(p.location!==undefined&&(typeof p.location!=='string'||p.location.length>120))throw Error('INVALID_PLAY');
 if(p.difficulty!==undefined&&(typeof p.difficulty!=='string'||!p.difficulty.trim()||p.difficulty.trim().length>40))throw Error('INVALID_PLAY');
 if(p.scenario!==undefined&&!(Number.isSafeInteger(p.scenario)&&p.scenario>=1&&p.scenario<=999))throw Error('INVALID_PLAY');
 if(p.missionAttempts!==undefined&&!(Array.isArray(p.missionAttempts)&&p.missionAttempts.length>0&&p.missionAttempts.length<=300&&p.missionAttempts.every(x=>x&&typeof x==='object'&&Number.isSafeInteger(x.mission)&&x.mission>=1&&x.mission<=999&&['success','failure'].includes(x.result))))throw Error('INVALID_PLAY');
 return {id:p.id,game:{name:p.game.name.trim(),bggId:String(p.game.bggId)},date:p.date,rule:p.rule,...(p.location!==undefined?{location:p.location}:{}),...(p.difficulty!==undefined?{difficulty:p.difficulty}:{}),...(p.scenario!==undefined?{scenario:p.scenario}:{}),...(p.missionAttempts!==undefined?{missionAttempts:p.missionAttempts.map(x=>({mission:x.mission,result:x.result}))}:{}),players:p.players.map(x=>({name:x.name.trim(),score:x.score,color:x.color,isSelf:x.isSelf===true,anonymous:x.anonymous===true,...(typeof x.winner==='boolean'?{winner:x.winner}:{})}))};
}
export function playForm(play,username,bggPlayId=''){
 return bggPlayForm(checkedPlay(play),username,bggPlayId);
}
export async function playFingerprint(play,username){return bggPlayFingerprint(checkedPlay(play),username);}
