import {resolveGame,matchGameRecords} from './game-catalog.js?v=166';
import {decodeXmlText} from './bgg-validation.js?v=129';
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
export const MISSION_MAX=999,MISSION_ATTEMPTS_MAX=300;
export function validMissionAttempts(list){return Array.isArray(list)&&list.length>0&&list.length<=MISSION_ATTEMPTS_MAX&&list.every(item=>item&&typeof item==='object'&&Object.keys(item).length===2&&Number.isSafeInteger(item.mission)&&item.mission>=1&&item.mission<=MISSION_MAX&&['success','failure'].includes(item.result));}
// 미션 시도 목록 요약: 성공이 하나라도 있으면 세션 성공, 다음 도전은 마지막 성공 미션의 다음 번호입니다.
export function missionSummary(list){
 if(!Array.isArray(list)||!list.length)return null;
 const cleared=list.filter(item=>item.result==='success'),last=list.at(-1);
 return {first:list[0].mission,last:last.mission,lastCleared:cleared.at(-1)?.mission??null,cleared:cleared.length,attempts:list.length,next:last.result==='success'?Math.min(MISSION_MAX,last.mission+1):last.mission,result:cleared.length?'success':'failure'};
}
export function missionLabel(list){const s=missionSummary(list);return s?`미션 ${s.first}${s.last!==s.first?' → '+s.last:''} · 클리어 ${s.cleared} · 시도 ${s.attempts}`:'';}
// 협력 방식: 미션 시도가 있으면 미션형, 시나리오가 있으면 캠페인형, 난이도가 있으면 난이도형, 그 밖의 협력은 성공·실패·점수형으로 읽습니다.
export const COOP_KINDS=['score','mission','difficulty','campaign'];
export const coopKindLabels={score:'성공·실패·점수형',mission:'미션형',difficulty:'난이도형',campaign:'캠페인형'};
export function coopKind(play){if(play?.rule!=='cooperative')return '';if(Array.isArray(play.missionAttempts)&&play.missionAttempts.length)return 'mission';if(Number.isSafeInteger(play.scenario))return 'campaign';if(typeof play.difficulty==='string'&&play.difficulty)return 'difficulty';return 'score';}
export const DIFFICULTY_DEFAULT=['입문','보통','어려움','최고'];
const DIFFICULTY_PRESETS=[{ids:['30549'],names:['판데믹','pandemic'],levels:['입문','보통','영웅','전설']}];
// 게임별 난이도 목록이 있으면 그 목록, 없으면 공통 목록을 씁니다.
export function difficultyOptions(game){const id=String(game?.bggId||''),name=String(game?.name||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');const preset=DIFFICULTY_PRESETS.find(p=>id&&p.ids.includes(id)||p.names.some(n=>name.startsWith(n)));return preset?preset.levels:DIFFICULTY_DEFAULT;}
export const SCENARIO_MAX=999;
// 사용한 확장: BGG 확장 ID와 이름(1~30개, ID 중복 없음).
export const EXPANSIONS_MAX=30;
export function validExpansions(list){if(!Array.isArray(list)||!list.length||list.length>EXPANSIONS_MAX)return false;const ids=new Set();for(const x of list){if(!x||typeof x!=='object'||typeof x.id!=='string'||!/^[1-9][0-9]{0,9}$/.test(x.id)||ids.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.trim().length>200)return false;ids.add(x.id);}return true;}
export function validDifficulty(value){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=40;}
export function validScenario(value){return Number.isSafeInteger(value)&&value>=1&&value<=SCENARIO_MAX;}
// 캠페인형의 선택 입력: 글룸헤이븐 계열의 시나리오 레벨(0~7).
export function validScenarioLevel(value){return Number.isInteger(value)&&value>=0&&value<=7;}
// 캠페인형: 같은 게임·같은 시나리오 기록 중 이 기록이 몇 번째 도전인지(날짜·저장 순).
export function scenarioAttempt(records,play){if(!validScenario(play?.scenario))return 0;const key=gameKey(play.game),order=p=>p.date+'|'+(p.createdAt||'');return records.filter(p=>p.rule==='cooperative'&&p.scenario===play.scenario&&gameKey(p.game)===key&&p.id!==play.id&&order(p)<=order(play)).length+1;}
// 플레이는 날짜·저장 순으로 넘겨 주세요.
// 협력 난이도형: 난이도별 시도·성공과 성공한 가장 높은 난이도(게임 난이도 목록 순서 기준).
export function coopDifficultyStats(plays){const list=plays.filter(p=>coopKind(p)==='difficulty'),order=difficultyOptions(list[0]?.game),rows=new Map();for(const p of list){const r=rows.get(p.difficulty)||{level:p.difficulty,tries:0,wins:0};r.tries++;if(p.cooperativeResult==='success')r.wins++;rows.set(p.difficulty,r);}const rank=level=>{const i=order.indexOf(level);return i<0?order.length:i;};const sorted=[...rows.values()].sort((a,b)=>rank(a.level)-rank(b.level)||a.level.localeCompare(b.level));return {rows:sorted,best:[...sorted].reverse().find(r=>r.wins>0)?.level||null};}
// 협력 캠페인형: 시나리오별 시도 횟수·성공 여부와 현재 진행 위치(마지막 기록이 성공이면 다음 시나리오).
export function coopCampaignStats(plays){const list=plays.filter(p=>coopKind(p)==='campaign'),rows=new Map();for(const p of list){const r=rows.get(p.scenario)||{scenario:p.scenario,tries:0,cleared:false};r.tries++;if(p.cooperativeResult==='success')r.cleared=true;rows.set(p.scenario,r);}const levels=new Map();for(const p of list){if(!validScenarioLevel(p.scenarioLevel))continue;const l=levels.get(p.scenarioLevel)||{level:p.scenarioLevel,tries:0,successes:0};l.tries++;if(p.cooperativeResult==='success')l.successes++;levels.set(p.scenarioLevel,l);}const last=list.at(-1);return {rows:[...rows.values()].sort((a,b)=>a.scenario-b.scenario),cleared:[...rows.values()].filter(r=>r.cleared).length,attempts:list.length,current:last?last.scenario:null,currentLevel:validScenarioLevel(last?.scenarioLevel)?last.scenarioLevel:null,levels:[...levels.values()].sort((a,b)=>a.level-b.level)};}
// 마이티 판 내역: 주공·프렌드(''=노프렌드)·공약·기루다·결과·판 점수. 플레이어가 지워져도 기록이 남도록 ID는 형식만 확인한다.
export function validMightyRounds(list){const id=/^[A-Za-z0-9_.:-]{1,100}$/;return Array.isArray(list)&&list.length>0&&list.length<=500&&list.every(r=>r&&typeof r==='object'&&Object.keys(r).length===6&&typeof r.lead==='string'&&id.test(r.lead)&&typeof r.friend==='string'&&(r.friend===''||id.test(r.friend)&&r.friend!==r.lead)&&Number.isInteger(r.bid)&&r.bid>=13&&r.bid<=20&&['S','H','D','C','none'].includes(r.trump)&&['success','failure'].includes(r.result)&&r.points&&typeof r.points==='object'&&!Array.isArray(r.points)&&Object.keys(r.points).length<=100&&Object.entries(r.points).every(([key,value])=>id.test(key)&&Number.isSafeInteger(value)));}
export function createPlay({game, date, rule, players, location, cooperativeResult, sharedScore, missionAttempts, difficulty, scenario, scenarioLevel, expansions, bggPlayId, mightyRounds, sessionId}, id = crypto.randomUUID()) {
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
  if(missionAttempts!==undefined&&(rule!=='cooperative'||!validMissionAttempts(missionAttempts)||cooperativeResult!==missionSummary(missionAttempts).result||sharedScore!==undefined))throw Error('미션 기록을 확인해주세요.');
  if(difficulty!==undefined&&(rule!=='cooperative'||!validDifficulty(difficulty)||cooperativeResult===undefined||missionAttempts!==undefined))throw Error('난이도를 확인해주세요.');
  if(scenario!==undefined&&(rule!=='cooperative'||!validScenario(scenario)||cooperativeResult===undefined||missionAttempts!==undefined||difficulty!==undefined))throw Error('시나리오 번호를 확인해주세요.');
  if(scenarioLevel!==undefined&&(scenario===undefined||!validScenarioLevel(scenarioLevel)))throw Error('시나리오 레벨을 확인해주세요.');
  if(expansions!==undefined&&!validExpansions(expansions))throw Error('사용한 확장을 확인해주세요.');
  // 연속 판 묶음 ID(저장하고 다음 판). 백업 내보내기·가져오기에서도 유지한다.
  if(sessionId!==undefined&&(typeof sessionId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)))throw Error('연속 판 정보를 확인해주세요.');
  if(mightyRounds!==undefined&&(rule!=='highest'||!validMightyRounds(mightyRounds)))throw Error('마이티 판 기록을 확인해주세요.');
  location=typeof location==='string'?location.trim():'';
  // BG Stats 등에서 이미 BGG에 올라간 경기의 BGG 플레이 번호. 있으면 다시 내보내지 않는다.
  if(bggPlayId!==undefined&&!/^[1-9][0-9]{0,19}$/.test(String(bggPlayId)))throw Error('BGG 플레이 번호를 확인해주세요.');
  if(location.length>120)throw Error('장소를 120자 이내로 입력해주세요.');
  if (!Array.isArray(players) || !players.length || players.length > 100 || players.some(p => !p||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>120 || !(p.score===null||typeof p.score==='number'&&Number.isFinite(p.score)&&Math.abs(p.score)<=Number.MAX_SAFE_INTEGER) || !/^#[0-9a-f]{6}$/i.test(p.color))) throw Error('플레이어와 점수를 확인해주세요.');
  const hasTeams=players.some(p=>p.teamId!==undefined||p.teamName!==undefined);
  if(hasTeams){const teams=new Map();for(const p of players){if(typeof p.teamId!=='string'||!/^team-[1-4]$/.test(p.teamId)||typeof p.teamName!=='string'||!p.teamName.trim()||p.teamName.trim().length>40)throw Error('팀 정보를 확인해주세요.');const teamName=p.teamName.trim();if(teams.has(p.teamId)&&teams.get(p.teamId)!==teamName)throw Error('팀 정보를 확인해주세요.');teams.set(p.teamId,teamName);}if(teams.size<2||teams.size>4)throw Error('팀은 2~4개로 구성해주세요.');}
  return {id, game:{name, bggId}, date, rule,...(location?{location}:{}),...(cooperativeResult!==undefined?{cooperativeResult}:{}),...(sharedScore!==undefined?{sharedScore}:{}),...(missionAttempts!==undefined?{missionAttempts:missionAttempts.map(({mission,result})=>({mission,result}))}:{}),...(difficulty!==undefined?{difficulty:difficulty.trim()}:{}),...(scenario!==undefined?{scenario}:{}),...(scenarioLevel!==undefined?{scenarioLevel}:{}),...(expansions!==undefined?{expansions:expansions.map(({id,name})=>({id,name:name.trim()}))}:{}),...(bggPlayId!==undefined?{bggPlayId:String(bggPlayId)}:{}),...(sessionId!==undefined?{sessionId}:{}),...(mightyRounds!==undefined?{mightyRounds:mightyRounds.map(({lead,friend,bid,trump,result,points})=>({lead,friend,bid,trump,result,points:{...points}}))}:{}),createdAt:new Date().toISOString(), players:players.map(p=>({id:p.id,name:p.name.trim(),color:p.color,score:p.score,...(typeof p.anonymous==='boolean'?{anonymous:p.anonymous}:{}),...(typeof p.isSelf==='boolean'?{isSelf:p.isSelf}:{}),...(typeof p.winner==='boolean'?{winner:p.winner}:{}),...(p.draw===true?{draw:true}:{}),...(Number.isSafeInteger(p.rank)&&p.rank>0&&p.rank<=100?{rank:p.rank}:{}),...(hasTeams?{teamId:p.teamId,teamName:p.teamName.trim()}:{})}))};
}
export function recordMode(play){
 if(play.rule==='cooperative')return 'cooperative';
 if(play.players.some(p=>p.teamId))return 'team';
 if(play.players.some(p=>typeof p.score==='number'))return play.rule==='lowest'?'lowest':'highest';
 if(play.players.some(p=>Number.isInteger(p.rank)&&p.rank>0))return 'rank';
 if(play.players.some(p=>typeof p.winner==='boolean'||p.draw===true))return 'win';
 return 'unknown';
}
export function normalizePlay(play,{cooperative=false}={}){
 if(typeof play?.game?.name==='string'&&decodeXmlText(play.game.name)!==play.game.name)play={...play,game:{...play.game,name:decodeXmlText(play.game.name)}};
 if(cooperative&&play?.rule!=='cooperative'&&Array.isArray(play.players)&&play.players.length&&play.players.every(p=>typeof p.winner==='boolean'&&p.winner===play.players[0].winner)){const success=play.players[0].winner;return {...play,rule:'cooperative',cooperativeResult:success?'success':'failure',players:play.players.map(({winner,draw,rank,...person})=>person)};}
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
