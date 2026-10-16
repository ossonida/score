import {gameKey,winnerIds} from './records-core.js?v=63';
import {meIn,nameKey,personalRecordIds} from './personal-stats.js?v=63';
import {latestPlayDate} from './stats-overview.js?v=63';
const scored=p=>typeof p.score==='number'&&Number.isFinite(p.score);
export function recentHighlights(records,profile){
 const day=latestPlayDate(records),recent=records.filter(p=>p.date===day),bests=personalRecordIds(records,profile);
 const winners=recent.filter(p=>p.rule!=='cooperative').map(play=>({play,players:play.players.filter(p=>winnerIds(play).includes(p.id))})).filter(x=>x.players.length);
 const close=recent.filter(p=>p.rule!=='cooperative'&&p.players.length>1&&p.players.every(scored)).flatMap(play=>{
  const sorted=[...play.players].sort((a,b)=>play.rule==='lowest'?a.score-b.score:b.score-a.score),wins=winnerIds(play);
  if(!wins.length||!wins.includes(sorted[0].id)||wins.some(id=>play.players.find(p=>p.id===id).score!==sorted[0].score))return [];
  return [{play,gap:Math.abs(sorted[0].score-sorted[1].score)}];
 }).sort((a,b)=>a.gap-b.gap);
 const personal=new Map();for(const play of recent){const me=meIn(play,profile);if(!me||!scored(me)||play.rule==='cooperative')continue;const k=gameKey(play.game)+':'+play.rule,old=personal.get(k);if(!old||(play.rule==='lowest'?me.score<old.me.score:me.score>old.me.score))personal.set(k,{play,me,improved:bests.has(play.id)});}
 return {day,winners,closest:close.filter(x=>x.gap===close[0]?.gap),personal:[...personal.values()]};
}
export function rivalStats(records,profile){
 const rivals=new Map();for(const play of records){if(play.rule==='cooperative')continue;const me=meIn(play,profile);if(!me)continue;const seen=new Set();for(const opponent of play.players){const key=nameKey(opponent.name);if(opponent.id===me.id||opponent.anonymous||/^(?:익명(?:의)?플레이어|익명|anonymous(?:player)?|unknownplayer)(?:[0-9]+|\([0-9]+\))?$/.test(key.replace(/\s+/g,''))||!key||key===nameKey(me.name)||[profile?.primary,...(profile?.aliases||[])].includes(key)||play.players.filter(p=>nameKey(p.name)===key).length!==1||seen.has(key))continue;seen.add(key);
  let rival=rivals.get(key);if(!rival){rival={key,name:opponent.name,met:0,ahead:0,behind:0,tied:0,unknown:0,recent:[]};rivals.set(key,rival);}rival.met++;
  const ranked=Number.isFinite(me.rank)&&me.rank>0&&Number.isFinite(opponent.rank)&&opponent.rank>0;
  const delta=ranked?opponent.rank-me.rank:scored(me)&&scored(opponent)?(play.rule==='lowest'?opponent.score-me.score:me.score-opponent.score):null;
  const result=delta===null?'unknown':delta>0?'ahead':delta<0?'behind':'tied';rival[result]++;rival.recent.push({play,me,opponent,result});
 }}return [...rivals.values()].map(r=>({...r,recent:r.recent.sort((a,b)=>b.play.date.localeCompare(a.play.date)||String(b.play.createdAt||'').localeCompare(String(a.play.createdAt||''))).slice(0,3)})).sort((a,b)=>b.met-a.met||a.name.localeCompare(b.name));
}
