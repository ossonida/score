import {resolveGame,matchGameRecords} from './game-catalog.js?v=76';
export function gameKey(game) {
  return game.bggId ? `bgg:${game.bggId}` : `name:${game.name.trim().normalize('NFKC').toLocaleLowerCase()}`;
}
export function winnerIds(play) {
  if (play.rule === 'cooperative') return [];
  if(play.players.some(p=>p.teamId))return play.players.filter(p=>playerOutcome(play,p)==='win').map(p=>p.id);
  if(play.players.some(p=>typeof p.winner==='boolean'))return play.players.filter(p=>p.winner===true).map(p=>p.id);
  if(play.players.every(p=>p.score===null)&&play.players.some(p=>Number.isInteger(p.rank)))return play.players.filter(p=>p.rank===1).map(p=>p.id);
  if(!play.players.every(p=>typeof p.score==='number'&&Number.isFinite(p.score)))return [];
  const scored=play.players;
  if(!scored.length)return [];
  const best = (play.rule === 'lowest' ? Math.min : Math.max)(...scored.map(p => p.score));
  return scored.filter(p => p.score === best).map(p => p.id);
}
export function createPlay({game, date, rule, players, location, cooperativeResult, sharedScore}, id = crypto.randomUUID()) {
  if(!game||typeof game.name!=='string'||typeof id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(id))throw Error('기록 형식을 확인해주세요.');
  const name = game.name.trim();
  if (!name || name.length > 120) throw Error('게임명을 120자 이내로 입력해주세요.');
  game=resolveGame(game);
  const bggId = game.bggId ? String(game.bggId) : '';
  if (bggId && !/^[1-9][0-9]{0,9}$/.test(bggId)) throw Error('BGG 게임 ID는 양의 정수여야 합니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) throw Error('날짜를 확인해주세요.');
  if (!['highest','lowest','cooperative'].includes(rule)) throw Error('승리 조건을 선택해주세요.');
  if(cooperativeResult!==undefined&&(rule!=='cooperative'||!['success','failure'].includes(cooperativeResult)))throw Error('협력 결과를 확인해주세요.');
  if(sharedScore!==undefined&&(rule!=='cooperative'||typeof sharedScore!=='number'||!Number.isFinite(sharedScore)||Math.abs(sharedScore)>Number.MAX_SAFE_INTEGER))throw Error('공동 점수를 확인해주세요.');
  location=typeof location==='string'?location.trim():'';
  if(location.length>120)throw Error('장소를 120자 이내로 입력해주세요.');
  if (!Array.isArray(players) || !players.length || players.length > 100 || players.some(p => !p||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>120 || !(p.score===null||typeof p.score==='number'&&Number.isFinite(p.score)&&Math.abs(p.score)<=Number.MAX_SAFE_INTEGER) || !/^#[0-9a-f]{6}$/i.test(p.color))) throw Error('플레이어와 점수를 확인해주세요.');
  const hasTeams=players.some(p=>p.teamId!==undefined||p.teamName!==undefined);
  if(hasTeams){const teams=new Map();for(const p of players){if(typeof p.teamId!=='string'||!/^team-[1-4]$/.test(p.teamId)||typeof p.teamName!=='string'||!p.teamName.trim()||p.teamName.trim().length>40)throw Error('팀 정보를 확인해주세요.');const teamName=p.teamName.trim();if(teams.has(p.teamId)&&teams.get(p.teamId)!==teamName)throw Error('팀 정보를 확인해주세요.');teams.set(p.teamId,teamName);}if(teams.size<2||teams.size>4)throw Error('팀은 2~4개로 구성해주세요.');}
  return {id, game:{name, bggId}, date, rule,...(location?{location}:{}),...(cooperativeResult!==undefined?{cooperativeResult}:{}),...(sharedScore!==undefined?{sharedScore}:{}),createdAt:new Date().toISOString(), players:players.map(p=>({id:p.id,name:p.name.trim(),color:p.color,score:p.score,...(typeof p.anonymous==='boolean'?{anonymous:p.anonymous}:{}),...(typeof p.isSelf==='boolean'?{isSelf:p.isSelf}:{}),...(typeof p.winner==='boolean'?{winner:p.winner}:{}),...(p.draw===true?{draw:true}:{}),...(Number.isSafeInteger(p.rank)&&p.rank>0&&p.rank<=100?{rank:p.rank}:{}),...(hasTeams?{teamId:p.teamId,teamName:p.teamName.trim()}:{})}))};
}
export function recordMode(play){
 if(play.rule==='cooperative')return 'cooperative';
 if(play.players.some(p=>p.teamId))return 'team';
 if(play.players.some(p=>typeof p.score==='number'))return play.rule==='lowest'?'lowest':'highest';
 if(play.players.some(p=>Number.isInteger(p.rank)&&p.rank>0))return 'rank';
 if(play.players.some(p=>typeof p.winner==='boolean'||p.draw===true))return 'win';
 return 'unknown';
}
export function normalizePlay(play){
 if(!play?.id?.startsWith('bgstats:')||!Array.isArray(play.players)||!play.players.length||!play.players.every(p=>p.winner===false)||play.players.some(p=>p.draw===true))return play;
 return {...play,players:play.players.map(({winner,...person})=>person)};
}
export const modeLabels={highest:'점수 · 높은 점수 승리',lowest:'점수 · 낮은 점수 승리',win:'개인 승패',team:'팀전',rank:'순위',cooperative:'협력',unknown:'결과 미입력'};
export function playerOutcome(play,person){
 const mode=recordMode(play);
 if(mode==='cooperative')return ['success','failure'].includes(play.cooperativeResult)?play.cooperativeResult:'unknown';
 if(mode==='team'){
  const members=play.players.filter(p=>p.teamId===person.teamId),outcomes=members.map(p=>p.draw===true?'draw':p.winner===true?'win':p.winner===false?'loss':'unknown');
  return outcomes.length&&outcomes.every(value=>value===outcomes[0])?outcomes[0]:'unknown';
 }
 if(person.draw===true)return 'draw';
 if(mode==='rank')return Number.isInteger(person.rank)&&person.rank>0?(person.rank===1?'win':'loss'):'unknown';
 if(typeof person.winner==='boolean')return person.winner?'win':'loss';
 const winners=winnerIds(play);return winners.length?(winners.includes(person.id)?'win':'loss'):'unknown';
}
export function resultLabel(play,person){
 const mode=recordMode(play);
 if(mode==='rank'&&person.rank)return `${play.players.filter(p=>p.rank===person.rank).length>1?'공동 ':''}${person.rank}위`;
 return {win:'승리',loss:'패배',draw:'무승부',success:'성공',failure:'실패',unknown:'결과 미입력'}[playerOutcome(play,person)];
}
export function modeStats(plays){
 const groups=new Map();
 for(const play of plays){
  const mode=recordMode(play),group=groups.get(mode)||{mode,label:modeLabels[mode],count:0,known:0,successes:0,players:new Map()};
  group.count++;if(mode==='cooperative'&&['success','failure'].includes(play.cooperativeResult)){group.known++;if(play.cooperativeResult==='success')group.successes++;}
  for(const p of play.players){
   if(p.anonymous===true&&p.isSelf!==true)continue;
   const identity=p.isSelf===true?'self:assigned':p.name.trim().normalize('NFKC').toLocaleLowerCase();
   const row=group.players.get(identity)||{name:p.isSelf===true?'나':p.name,count:0,known:0,wins:0,draws:0,losses:0,scores:[],sizes:new Map()};
   row.count++;const outcome=playerOutcome(play,p);
   if(['win','draw','loss','success','failure'].includes(outcome)){row.known++;if(['win','success'].includes(outcome))row.wins++;else if(outcome==='draw')row.draws++;else row.losses++;}
   if(['highest','lowest'].includes(mode)&&typeof p.score==='number')row.scores.push(p.score);
   if(mode==='rank'&&Number.isInteger(p.rank)&&p.rank>0){const size=play.players.length,s=row.sizes.get(size)||{size,count:0,total:0,wins:0};s.count++;s.total+=p.rank;if(p.rank===1)s.wins++;row.sizes.set(size,s);}
   group.players.set(identity,row);
  }
  groups.set(mode,group);
 }
 return [...groups.values()].map(g=>({...g,successRate:g.known?g.successes/g.known:null,players:[...g.players.values()].map(p=>({...p,rate:p.known?p.wins/p.known:null,average:p.scores.length?p.scores.reduce((a,b)=>a+b,0)/p.scores.length:null,best:p.scores.length?(g.mode==='lowest'?Math.min(...p.scores):Math.max(...p.scores)):null,sizes:[...p.sizes.values()].sort((a,b)=>a.size-b.size).map(s=>({...s,average:s.total/s.count}))}))}));
}
export function isPlay(p) {
  try { return typeof p.id==='string' && p.id.length<=100 && typeof p.createdAt==='string' && p.createdAt.length<=40 && Number.isFinite(Date.parse(p.createdAt)) && !!createPlay(p,p.id); } catch { return false; }
}
export function gameStats(plays) {
  plays=matchGameRecords(plays);
  const groups = new Map();
  for (const play of plays) {
    const key=gameKey(play.game);
    if (!groups.has(key)) groups.set(key,{key,game:play.game,count:0,competitive:0,cooperative:0,players:new Map()});
    const group=groups.get(key);group.count++;group[play.rule==='cooperative'?'cooperative':'competitive']++;
    const winners=winnerIds(play);
    for (const p of play.players) {
      if(p.anonymous===true&&p.isSelf!==true)continue;
      const identity=p.isSelf===true?'self:assigned':p.name.normalize('NFKC').toLocaleLowerCase();
      if (!group.players.has(identity)) group.players.set(identity,{name:p.isSelf===true?'나':p.name,count:0,competitive:0,known:0,wins:0,total:0,scoreCount:0,highest:null,lowest:null});
      const row=group.players.get(identity);row.count++;if(typeof p.score==='number'){row.total+=p.score;row.scoreCount++;row.highest=row.highest===null?p.score:Math.max(row.highest,p.score);row.lowest=row.lowest===null?p.score:Math.min(row.lowest,p.score);}
      if(play.rule!=='cooperative'){row.competitive++;if(winners.length||p.draw===true)row.known++;if(winners.includes(p.id))row.wins++;}
    }
  }
  return [...groups.values()].map(g=>({...g,players:[...g.players.values()].map(p=>({...p,average:p.scoreCount?p.total/p.scoreCount:null,winRate:p.known?p.wins/p.known:null})).sort((a,b)=>b.wins-a.wins||b.average-a.average)})).sort((a,b)=>b.count-a.count||a.game.name.localeCompare(b.game.name));
}
