import {gameKey,winnerIds} from './records-core.js?v=155';
import {meIn,nameKey} from './personal-stats.js?v=117';
import {gameTypeList} from './stats-overview.js?v=166';

const order=(a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''));
const chronological=records=>records.filter(play=>play.date).sort(order);

// 처음 해본 게임: 전체 기록에서 그 게임의 첫 판이 기간 안에 있는 게임(첫 판 날짜순).
export function firstPlays(records,{start,end}){
 const seen=new Set(),out=[];
 for(const play of chronological(records)){const key=gameKey(play.game);if(seen.has(key))continue;seen.add(key);if(play.date>=start&&play.date<=end)out.push({key,play});}
 return out;
}

// 장소별 판 수(많은 순). 장소를 적지 않은 판은 뺀다.
export function placeCounts(records){
 const counts=new Map();for(const play of records){const place=typeof play.location==='string'?play.location.trim():'';if(place)counts.set(place,(counts.get(place)||0)+1);}
 return [...counts].map(([place,count])=>({place,count})).sort((a,b)=>b.count-a.count||a.place.localeCompare(b.place));
}

// 달성 기록: 기록 순서대로 세어 기간 안에서 기준 수에 닿은 판. kind = plays(통산 판) · days(플레이한 날) · games(서로 다른 게임) · game(한 게임 판).
export const MILESTONES={plays:[10,25,50,100,200,300,500,750,1000],days:[10,30,50,100,200,300,365,500],games:[10,25,50,100,150,200,300],game:[10,25,50,100,200]};
export function milestones(records,{start,end}){
 const out=[],days=new Set(),games=new Set(),perGame=new Map();let total=0;
 for(const play of chronological(records)){
  if(play.date>end)break;
  const key=gameKey(play.game),count=(perGame.get(key)||0)+1,newDay=!days.has(play.date),newGame=!games.has(key);total++;perGame.set(key,count);days.add(play.date);games.add(key);
  if(play.date<start)continue;
  if(MILESTONES.plays.includes(total)||total>1000&&total%500===0)out.push({kind:'plays',count:total,play});
  if(newDay&&MILESTONES.days.includes(days.size))out.push({kind:'days',count:days.size,play});
  if(newGame&&MILESTONES.games.includes(games.size))out.push({kind:'games',count:games.size,play});
  if(MILESTONES.game.includes(count))out.push({kind:'game',count,play});
 }
 return out;
}

export function milestoneTitle({kind,count}){return kind==='plays'?`통산 ${count}번째 플레이`:kind==='days'?`플레이한 날 ${count}일째`:kind==='games'?`서로 다른 게임 ${count}개째`:`이 게임 ${count}번째 플레이`;}

// 게임 순위: 경쟁 기록의 이름 있는 플레이어별 판 수·승리·승률(결과 있는 판 기준). 나는 별칭과 상관없이 한 줄. 승리 많은 순 → 승률 → 판 수.
export function gameLeaderboard(records,profile){
 const rows=new Map();
 for(const play of records){
  if(play.rule==='cooperative')continue;
  const wins=new Set(winnerIds(play)),known=wins.size>0,me=meIn(play,profile);
  for(const person of play.players){
   const name=String(person.name||'').trim(),self=me?.id===person.id;if(person.anonymous===true||!name)continue;
   const key=self?'\u0000self':nameKey(name),row=rows.get(key)||{key,name:self&&profile?.primary||name,isSelf:self,plays:0,wins:0,known:0};
   row.plays++;if(known){row.known++;if(wins.has(person.id))row.wins++;}rows.set(key,row);
  }
 }
 return [...rows.values()].map(row=>({...row,rate:row.known?row.wins/row.known:null})).sort((a,b)=>b.wins-a.wins||(b.rate??-1)-(a.rate??-1)||b.plays-a.plays||a.name.localeCompare(b.name));
}

// 달력용: 날짜별 판 수, 가장 많이 한 날, 가장 길게 이어 간 연속 플레이 날.
const nextDay=date=>{const [y,m,d]=date.split('-').map(Number),value=new Date(Date.UTC(y,m-1,d+1));return value.toISOString().slice(0,10);};
export function playDays(records){
 const counts=new Map();for(const play of records)if(play.date)counts.set(play.date,(counts.get(play.date)||0)+1);
 const dates=[...counts.keys()].sort();let busiest=null,streak=0,run=0,prev='';
 for(const date of dates){const count=counts.get(date);if(!busiest||count>busiest.count)busiest={date,count};run=prev&&nextDay(prev)===date?run+1:1;streak=Math.max(streak,run);prev=date;}
 return {counts,busiest,streak};
}

// 하루에 여러 판을 이어서 하는 게임(홀덤·마피아)은 통계에서 날짜마다 한 판으로 센다(기록 자체는 그대로).
// 합친 판: 판마다 모든 점수가 있으면 사람별 점수 합계, 아니면 그날 가장 많이 이긴 사람이 우승. sessionIds에 원래 기록 id.
const SESSION_GAME=/홀덤|hold[’']?em|마피아|mafia/i;
export const isSessionGame=game=>SESSION_GAME.test(String(game?.name||''));
// 기간 분석에서만 하루 한 판으로 세는 가벼운 게임: BGG 유형이 가족·파티·어린이이고 전략이 아닌 경쟁 게임.
export const isPartyPlay=play=>{if(play.rule==='cooperative')return false;const types=gameTypeList(play);return !types.includes('strategy')&&types.some(type=>['family','party','children'].includes(type));};
export function countSessions(records,same=play=>isSessionGame(play.game)){
 const groups=new Map(),out=[];
 for(const play of records){if(!play.date||!same(play)){out.push(play);continue;}const key=play.date+'\u0000'+gameKey(play.game);let group=groups.get(key);if(!group){group=[];groups.set(key,group);out.push(group);}group.push(play);}
 return out.map(item=>Array.isArray(item)?mergeSession(item):item);
}
function mergeSession(list){
 if(list.length===1)return list[0];
 const rounds=[...list].sort(order),first=rounds[0],rule=rounds.every(round=>round.rule===first.rule)?first.rule:'highest',people=new Map();
 const scored=rule!=='cooperative'&&rounds.every(round=>round.players.length&&!round.players.some(person=>person.teamId)&&round.players.every(person=>typeof person.score==='number'&&Number.isFinite(person.score)));
 for(const round of rounds){const wins=new Set(winnerIds(round));for(const person of round.players){
  const key=person.anonymous===true||!String(person.name||'').trim()?`\u0000${round.id}\u0000${person.id}`:nameKey(person.name),row=people.get(key)||{...person,id:`s${people.size}`,score:scored?0:null,wins:0,isSelf:false};
  if(scored)row.score+=person.score;if(wins.has(person.id))row.wins++;if(person.isSelf===true)row.isSelf=true;people.set(key,row);}}
 const most=Math.max(0,...[...people.values()].map(row=>row.wins));
 const players=[...people.values()].map(({winner,teamId,rank,draw,wins,isSelf,...person})=>({...person,...(isSelf?{isSelf:true}:{}),...(!scored&&rule!=='cooperative'&&most>0?{winner:wins===most}:{})}));
 const ids=rounds.flatMap(round=>round.sessionIds||[round.id]);
 return {...first,createdAt:rounds.at(-1).createdAt,rule,players,...(rule==='cooperative'?{cooperativeResult:rounds.at(-1).cooperativeResult}:{}),sessionIds:ids,sessionRounds:ids.length};
}
