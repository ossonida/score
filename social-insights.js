import {gameKey,winnerIds,recordMode,playerOutcome} from './records-core.js?v=153';
import {meIn,nameKey,personalRecordIds} from './personal-stats.js?v=115';
import {latestPlayDate} from './stats-overview.js?v=164';
const scored=p=>typeof p.score==='number'&&Number.isFinite(p.score);
export function recentHighlights(records,profile){
 const day=latestPlayDate(records),recent=records.filter(p=>p.date===day),bests=personalRecordIds(records,profile);
 const winners=recent.filter(p=>p.rule!=='cooperative').map(play=>({play,players:play.players.filter(p=>winnerIds(play).includes(p.id))})).filter(x=>x.players.length);
 const close=recent.filter(p=>['highest','lowest'].includes(recordMode(p))&&p.players.length>1&&p.players.every(scored)).flatMap(play=>{
  const sorted=[...play.players].sort((a,b)=>play.rule==='lowest'?a.score-b.score:b.score-a.score),wins=winnerIds(play);
  if(!wins.length||!wins.includes(sorted[0].id)||wins.some(id=>play.players.find(p=>p.id===id).score!==sorted[0].score))return [];
  return [{play,gap:Math.abs(sorted[0].score-sorted[1].score)}];
 }).sort((a,b)=>a.gap-b.gap);
 const personal=new Map();for(const play of recent){const me=meIn(play,profile);if(!me||!scored(me)||!['highest','lowest'].includes(recordMode(play)))continue;const k=gameKey(play.game)+':'+play.rule,old=personal.get(k);if(!old||(play.rule==='lowest'?me.score<old.me.score:me.score>old.me.score))personal.set(k,{play,me,improved:bests.has(play.id)});}
 return {day,winners,closest:close.filter(x=>x.gap===close[0]?.gap),personal:[...personal.values()]};
}
const anonymousKey=key=>/^(?:익명(?:의)?플레이어|익명|anonymous(?:player)?|unknownplayer)(?:[0-9]+|\([0-9]+\))?$/.test(key.replace(/\s+/g,''));
const newestFirst=(a,b)=>b.play.date.localeCompare(a.play.date)||String(b.play.createdAt||'').localeCompare(String(a.play.createdAt||''));
// 한 기록에서 나와 비교할 이름 있는 상대(같은 팀·익명·나·이름이 겹치는 사람 제외)를 [이름 키, 플레이어]로 돌려준다.
function namedOpponents(play,me,profile,sameTeam=false){const seen=new Set(),own=[profile?.primary,...(profile?.aliases||[])],out=[];for(const opponent of play.players){const key=nameKey(opponent.name);if(!sameTeam&&me.teamId&&me.teamId===opponent.teamId||opponent.id===me.id||opponent.anonymous||!key||anonymousKey(key)||key===nameKey(me.name)||own.includes(key)||play.players.filter(p=>nameKey(p.name)===key).length!==1||seen.has(key))continue;seen.add(key);out.push([key,opponent]);}return out;}
function compare(play,me,opponent){
 const ranked=Number.isFinite(me.rank)&&me.rank>0&&Number.isFinite(opponent.rank)&&opponent.rank>0,ownResult=playerOutcome(play,me),otherResult=playerOutcome(play,opponent);
 const delta=recordMode(play)==='team'||recordMode(play)==='win'?ownResult==='draw'&&otherResult==='draw'?0:ownResult==='win'&&otherResult==='loss'?1:ownResult==='loss'&&otherResult==='win'?-1:null:ranked?opponent.rank-me.rank:scored(me)&&scored(opponent)?(play.rule==='lowest'?opponent.score-me.score:me.score-opponent.score):null;
 return delta===null?'unknown':delta>0?'ahead':delta<0?'behind':'tied';
}
// 경쟁 경기에서 나와 상대 한 명씩의 대결을 모두 모은다.
function duels(records,profile){const out=[];for(const play of records){if(play.rule==='cooperative')continue;const me=meIn(play,profile);if(!me)continue;for(const [key,opponent] of namedOpponents(play,me,profile))out.push({key,play,me,opponent,result:compare(play,me,opponent)});}return out;}
const tally=list=>{const t={met:list.length,ahead:0,behind:0,tied:0,unknown:0};for(const d of list)t[d.result]++;const decided=t.ahead+t.behind+t.tied;return {...t,decided,rate:decided?t.ahead/decided:null};};
export function rivalStats(records,profile){
 const groups=new Map();for(const d of duels(records,profile)){if(!groups.has(d.key))groups.set(d.key,[]);groups.get(d.key).push(d);}
 return [...groups].map(([key,list])=>{list.sort(newestFirst);const latest=list[0];return {key,name:latest.opponent.name,color:latest.opponent.color||'',last:latest.play.date,...tally(list),recent:list.slice(0,3)};}).sort((a,b)=>b.met-a.met||a.name.localeCompare(b.name));
}
// 상대 전적 카드 위 강조: 3판 이상 비교한 상대 중 가장 많이 이긴·진 상대.
export function opponentHighlights(rivals){const known=rivals.filter(r=>r.decided>=3),pick=(field,other)=>known.filter(r=>r[field]>0).sort((a,b)=>b[field]-a[field]||a[other]-b[other]||b.met-a.met)[0]||null;return {beaten:pick('ahead','behind'),beatenBy:pick('behind','ahead')};}
// ○○와의 전적: 전체 기록에서 한 사람과의 대결(게임 범위 선택 가능)·게임별 전적·함께한 협동 경기를 모은다.
export function personStats(records,profile,key,scope=''){
 const all=duels(records,profile).filter(d=>d.key===key).sort(newestFirst),list=scope?all.filter(d=>gameKey(d.play.game)===scope):all;if(!all.length)return null;
 const byGame=new Map();for(const d of all){const k=gameKey(d.play.game);if(!byGame.has(k))byGame.set(k,{key:k,game:d.play.game,list:[]});byGame.get(k).list.push(d);}
 const games=[...byGame.values()].map(g=>({key:g.key,game:g.game,...tally(g.list)})).sort((a,b)=>b.met-a.met||a.game.name.localeCompare(b.game.name));
 const flow=list.filter(d=>d.result!=='unknown').slice(0,5).reverse().map(d=>d.result),last=flow.at(-1);let streak=0;for(let i=flow.length-1;i>=0&&flow[i]===last;i--)streak++;
 const coop=[];if(!scope)for(const play of records){if(play.rule!=='cooperative')continue;const me=meIn(play,profile);if(me&&namedOpponents(play,me,profile,true).some(([k])=>k===key))coop.push(play);}
 const coopGames=new Map();for(const play of coop){const k=gameKey(play.game);coopGames.set(k,{game:play.game,count:(coopGames.get(k)?.count||0)+1});}
 const success=coop.filter(p=>p.cooperativeResult==='success').length,coopKnown=coop.filter(p=>['success','failure'].includes(p.cooperativeResult)).length;
 return {key,name:all[0].opponent.name,color:all[0].opponent.color||'',first:all.at(-1).play.date,total:all.length,...tally(list),games,flow,streak:last?{result:last,count:streak}:null,recent:list.slice(0,3),plays:list.map(d=>d.play),coop:{count:coop.length,success,rate:coopKnown?success/coopKnown:null,games:[...coopGames.values()].sort((a,b)=>b.count-a.count)}};
}
