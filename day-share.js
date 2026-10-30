import {gameKey,winnerIds,coopKind,recordMode} from './records-core.js?v=155';
import {meIn,nameKey} from './personal-stats.js?v=117';
import {gameImageUrl} from './game-artwork.js?v=171';
import {milestones,MILESTONES} from './stats-extras.js?v=3';
import {shareLanguage,shareCopy,localizedGameName,formatShareDate,recentShareData,createRecentShareImage,missionDay,maskName,fillRound,loadImage,coopOutcome} from './stats-share.js?v=155';
import {openShareDialog,recapCopy,recapData,createRecapSingle,line,pill,cover,shade,frame,box,card} from './recap-share.js?v=15';

// 최근 기록 공유 캐러셀: 1장은 그날 전체(createRecentShareImage), 2장부터 그날 한 게임마다 한 장(표지 · 오늘/통산 판 수 · 방식별 차트 · 이야기 카드).
// 다른 사람은 칭찬 자리에만, 공개용은 이름을 가리고, 우승자 표시를 끄면 승부·점수·승리 이야기는 뺀다. 이미지 글은 모두 한 줄.
const W=1080,H=1350,X=72,CW=936,MAX_GAMES=9;
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
const COPY={
 ko:{me:'나',today:(n,total)=>`오늘 ${n}판 · 통산 ${total}판`,points:n=>`${n.toLocaleString('ko-KR')}점`,playsN:n=>`${n}판`,winsN:n=>`${n}승`,
  revenge:'설욕전',revengeHead:'지난번 패배 설욕',versus:who=>`vs ${who}`,h2h:'통산 전적',h2hHead:(a,x,y,b)=>`${a} ${x} : ${y} ${b}`,form:'최근 흐름',formHead:(w,n)=>`최근 ${n}판 중 ${w}승`,goal:'다음 목표',goalHead:(g,n,left)=>`${g} ${n}판까지 ${left}판`,totalGoal:(n,left)=>`통산 ${n}판까지 ${left}판`,steady:'꾸준함',weeksHead:n=>`${n}주 연속 게임 나이트`,weekHead:n=>`이번 주 ${n}번째 게임 나이트`,comeback:'오랜만에',comebackHead:n=>`${n}일 만에 다시`,crew:'이 멤버로',crewHead:n=>`${n}번째 판`,month:'요즘 빠진 게임',monthHead:n=>`이번 달 ${n}번째`,favorite:'많이 한 게임',favoriteHead:n=>`${n}위`,crowd:'최다 인원',crowdHead:n=>`${n}명이 붙은 판`,milestone:'달성 기록',gamePlay:(game,n)=>`${game} ${n}번째 플레이`,
  topScore:'오늘 최고점',personalBest:'개인 최고점 갱신',before:n=>`이전 ${n}`,blowout:'가장 큰 점수 차',wonBy:n=>`${n}점 차 압승`,closest:'가장 치열했던 판',gap:n=>`${n}점 차 승부`,usual:'평소보다',usualHead:d=>`우승 점수 ${d>0?'+':''}${d}`,usualDetail:(a,b)=>`평균 ${a} → ${b}`,
  streak:'연승',streakHead:(who,n)=>`${who} ${n}연승`,leader:'통산 1위 교체',winsChart:'오늘 우승',sidesChart:'진영별 승리',roleMost:side=>`${side} 역할 최다`,roleTimes:n=>`${n}번`,liar:'최고의 거짓말쟁이',liarDetail:(side,n)=>`${side} ${n}승`,
  missionChart:'미션별 도전',missionTitle:'오늘의 미션',difficultyChart:'난이도별 결과',coopToday:'오늘 협력 결과',coopRate:(w,n)=>`${n}판 중 ${w}번 성공`,sharedBest:'공동 점수 최고',newBest:'최고 기록 갱신',scenario:'시나리오',
  chipsChart:'오늘 칩 합계',results:'오늘 결과',gameN:n=>`${n}판`,sideWon:side=>`${side} 승`,morePlays:n=>`외 ${n}판`,bigHand:'한 판 최대 획득',todayTitle:'오늘의 플레이',more:n=>`외 ${n}개`},
 en:{me:'Me',today:(n,total)=>`${plural(n,'play','plays')} today · ${total} all-time`,points:n=>`${n.toLocaleString('en-US')} pts`,playsN:n=>plural(n,'play','plays'),winsN:n=>plural(n,'win','wins'),
  revenge:'Revenge',revengeHead:'Payback for last time',versus:who=>`vs ${who}`,h2h:'Head to head',h2hHead:(a,x,y,b)=>`${a} ${x} : ${y} ${b}`,form:'Recent form',formHead:(w,n)=>`${w} wins in last ${n}`,goal:'Next goal',goalHead:(g,n,left)=>`${left} more to ${n} ${g} plays`,totalGoal:(n,left)=>`${left} more to ${n} total plays`,steady:'Keeping it up',weeksHead:n=>`${n} weeks in a row`,weekHead:n=>`Game night #${n} this week`,comeback:'Back after a while',comebackHead:n=>`First time in ${n} days`,crew:'Same crew',crewHead:n=>`Game #${n} together`,month:'On a roll',monthHead:n=>`#${n} this month`,favorite:'Most played',favoriteHead:n=>`#${n} all-time`,crowd:'Biggest table',crowdHead:n=>`${n} players`,milestone:'Milestone',gamePlay:(game,n)=>`${game} play #${n}`,
  topScore:"Today's top score",personalBest:'New personal best',before:n=>`Before: ${n}`,blowout:'Biggest win',wonBy:n=>`Won by ${n}`,closest:'Closest finish',gap:n=>`Decided by ${n}`,usual:'vs. usual',usualHead:d=>`Winning score ${d>0?'+':''}${d}`,usualDetail:(a,b)=>`Avg ${a} → ${b}`,
  streak:'Win streak',streakHead:(who,n)=>`${who} · ${n} in a row`,leader:'New all-time leader',winsChart:'Wins today',sidesChart:'Wins by side',roleMost:side=>`Most often ${side}`,roleTimes:n=>plural(n,'time','times'),liar:'Best liar',liarDetail:(side,n)=>`${plural(n,'win','wins')} as ${side}`,
  missionChart:'Missions today',missionTitle:"Today's missions",difficultyChart:'By difficulty',coopToday:'Co-op today',coopRate:(w,n)=>`${w} of ${n} won`,sharedBest:'Best team score',newBest:'New best',scenario:'Scenario',
  chipsChart:'Chip totals today',results:"Today's results",gameN:n=>`Game ${n}`,sideWon:side=>`${side} won`,morePlays:n=>`+${n} more`,bigHand:'Biggest pot',todayTitle:"Today's play",more:n=>`+${n} more`},
};
const byTime=(a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''));
const HIDDEN=/마피아|스파이|악|mafia|spy|evil|werewolf|늑대/i,HOLDEM=/홀덤|hold[’']?em/i;
const average=list=>list.length?Math.round(list.reduce((sum,value)=>sum+value,0)/list.length):0;

// 한 게임의 그날 이야기. raw: 원래 기록(홀덤·마피아도 판마다). 반환: 이름·표지·판 수·차트(bars | missions)·이야기 카드 목록.
// full: 순위·점수 전체 표시(친구 공유용·우승자 표시일 때만 의미). 경쟁 게임 차트를 결과표로 바꾼다.
export function gameStory(raw,date,key,profile,{locale,mask=true,winners=true,full=false}={}){
 const lang=shareLanguage(locale),words=COPY[lang],share=shareCopy(lang),all=raw.filter(play=>play.date&&play.date<=date&&gameKey(play.game)===key).sort((a,b)=>a.date.localeCompare(b.date)||byTime(a,b)),plays=all.filter(play=>play.date===date),before=all.filter(play=>play.date<date);
 if(!plays.length)return null;
 const game=plays[0].game,name=localizedGameName(game,lang),stories=[];let chart=null;
 // 사람 표시: 나는 '나', 다른 사람은 공개용이면 가림. key는 나=self, 다른 사람=이름.
 const who=(play,person)=>{const self=meIn(play,profile)?.id===person.id||person.isSelf===true;return {key:self?'\u0000self':nameKey(person.name),name:self||!mask?String(person.name).trim():maskName(person.name)};};
 const named=person=>person.anonymous!==true&&String(person.name||'').trim();
 const winBars=list=>{const rows=new Map();for(const play of list)for(const id of winnerIds(play)){const person=play.players.find(item=>item.id===id);if(!person||!named(person))continue;const p=who(play,person),row=rows.get(p.key)||{label:p.name,value:0};row.value++;rows.set(p.key,row);}return [...rows.values()].sort((a,b)=>b.value-a.value).slice(0,3).map(row=>({...row,text:words.winsN(row.value)}));};
 // 나 기준 이야기(설욕전·통산 전적)는 맨 앞, 최근 흐름·다음 목표는 방식 이야기 뒤.
 stories.push(...personalStories(all,plays,words,who,named,profile,{mask,winners}));
 // 공통: 이 게임 달성 기록.
 const mark=milestones(raw,{start:date,end:date}).filter(item=>item.kind==='game'&&gameKey(item.play.game)===key).at(-1);if(mark)stories.push({title:words.milestone,headline:words.gamePlay(name,mark.count),detail:formatShareDate(date,lang)});
 const kind=plays[0].rule==='cooperative'?'coop':HOLDEM.test(String(game.name||''))?'holdem':plays.some(play=>play.players.some(person=>person.teamId))?(plays.some(play=>play.players.some(person=>HIDDEN.test(String(person.teamName||''))))?'role':'team'):['highest','lowest'].includes(recordMode(plays[0]))?'score':'win';
 if(kind==='coop'){
  const wins=plays.filter(play=>play.cooperativeResult==='success').length,type=coopKind(plays.at(-1));
  if(type==='mission'){const attempts=plays.flatMap(play=>play.missionAttempts||[]),prior=before.flatMap(play=>play.missionAttempts||[]),best=before.some(play=>Array.isArray(play.missionAttempts))?Math.max(0,...prior.filter(item=>item.result==='success').map(item=>item.mission)):null,day=missionDay(attempts,best),rows=new Map();
   for(const attempt of attempts){const row=rows.get(attempt.mission)||{label:lang==='ko'?`미션 ${attempt.mission}`:`Mission ${attempt.mission}`,mission:attempt.mission,marks:[]};row.marks.push(attempt.result==='success');rows.set(attempt.mission,row);}
   chart={kind:'missions',title:words.missionChart,rows:[...rows.values()]};stories.push({title:words.missionTitle,headline:share.missionHeadline(day,game),detail:share.missionFacts(day,game)});}
  else if(type==='difficulty'){const rows=new Map();for(const play of plays){const row=rows.get(play.difficulty)||{label:play.difficulty,value:0,fail:0};if(play.cooperativeResult==='success')row.value++;else if(play.cooperativeResult==='failure')row.fail++;rows.set(play.difficulty,row);}chart={kind:'bars',title:words.difficultyChart,rows:[...rows.values()].slice(0,4).map(row=>({...row,text:`✓${row.value} ✕${row.fail}`}))};stories.push({title:words.coopToday,headline:words.coopRate(wins,plays.length),detail:''});}
  else if(type==='score'){const scores=plays.map(play=>play.sharedScore).filter(Number.isFinite),prior=before.map(play=>play.sharedScore).filter(Number.isFinite);if(scores.length){const top=Math.max(...scores);stories.push({title:words.sharedBest,headline:words.points(top),detail:prior.length&&top>Math.max(...prior)?words.newBest:''});}stories.push({title:words.coopToday,headline:words.coopRate(wins,plays.length),detail:''});}
  else stories.push({title:words.scenario,headline:coopOutcome(plays.at(-1),raw,lang),detail:words.coopRate(wins,plays.length)});
 }else if(kind==='holdem'&&winners){
  const sums=new Map();let pot=null;for(const play of plays)for(const person of play.players){if(!named(person)||typeof person.score!=='number')continue;const p=who(play,person),row=sums.get(p.key)||{label:p.name,value:0};row.value+=person.score;sums.set(p.key,row);if(!pot||person.score>pot.score)pot={score:person.score,name:p.name};}
  const rows=[...sums.values()].filter(row=>row.value>0).sort((a,b)=>b.value-a.value).slice(0,3);if(rows.length)chart={kind:'bars',title:words.chipsChart,rows:rows.map(row=>({...row,text:`+${row.value.toLocaleString(lang==='ko'?'ko-KR':'en-US')}`}))};
  if(pot&&pot.score>0)stories.push({title:words.bigHand,headline:`${pot.name} +${pot.score.toLocaleString(lang==='ko'?'ko-KR':'en-US')}`,detail:''});
 }else if(kind==='role'){
  const hidden=new Map(),liars=new Map(),sides=new Map();let side='';
  for(const play of plays){const wins=new Set(winnerIds(play));for(const person of play.players){const team=String(person.teamName||'').trim();if(!team)continue;if(HIDDEN.test(team)){side=team;if(named(person)){const p=who(play,person),row=hidden.get(p.key)||{name:p.name,count:0,wins:0};row.count++;if(wins.has(person.id))row.wins++;hidden.set(p.key,row);}}}
   const won=[...new Set(play.players.filter(person=>wins.has(person.id)).map(person=>String(person.teamName||'').trim()).filter(Boolean))];for(const team of won)sides.set(team,(sides.get(team)||0)+1);}
  const most=[...hidden.values()].sort((a,b)=>b.count-a.count)[0];if(most&&plays.length>=2)stories.push({title:words.roleMost(side),headline:most.name,detail:words.roleTimes(most.count)});
  if(winners){if(sides.size)chart={kind:'bars',title:words.sidesChart,rows:[...sides].map(([label,value])=>({label,value,text:words.winsN(value)}))};const liar=[...hidden.values()].filter(row=>row.wins>0).sort((a,b)=>b.wins-a.wins)[0];if(liar)stories.push({title:words.liar,headline:liar.name,detail:words.liarDetail(side,liar.wins)});}
 }else if(kind==='score'&&winners){
  const low=plays[0].rule==='lowest',better=(a,b)=>low?a<b:a>b;let top=null,blow=null,close=null;const todayBest=new Map();
  for(const play of plays){const scored=play.players.filter(person=>named(person)&&typeof person.score==='number'&&Number.isFinite(person.score));if(!scored.length)continue;const sorted=[...scored].sort((a,b)=>low?a.score-b.score:b.score-a.score),winner=sorted[0];
   if(!top||better(winner.score,top.score))top={score:winner.score,name:who(play,winner).name};
   if(sorted[1]){const gap=Math.abs(winner.score-sorted[1].score);if(gap>0&&(!blow||gap>blow.gap))blow={gap,name:who(play,winner).name};if(gap>0&&gap<=3&&(!close||gap<close.gap))close={gap,scores:[winner.score,sorted[1].score]};}
   for(const person of scored){const p=who(play,person),row=todayBest.get(p.key);if(!row||better(person.score,row.score))todayBest.set(p.key,{...p,score:person.score});}}
  if(top)stories.push({title:words.topScore,headline:words.points(top.score),detail:top.name});
  const pb=[...todayBest.values()].map(row=>{const prior=before.flatMap(play=>play.players.filter(person=>typeof person.score==='number'&&named(person)&&who(play,person).key===row.key).map(person=>person.score));return prior.length&&better(row.score,low?Math.min(...prior):Math.max(...prior))?{...row,prior:low?Math.min(...prior):Math.max(...prior)}:null;}).filter(Boolean).sort((a,b)=>(b.key==='\u0000self')-(a.key==='\u0000self'))[0];
  if(pb)stories.push({title:words.personalBest,headline:`${pb.name} ${words.points(pb.score)}`,detail:words.before(pb.prior)});
  if(blow&&blow.gap>=10)stories.push({title:words.blowout,headline:words.wonBy(blow.gap),detail:blow.name});
  if(close)stories.push({title:words.closest,headline:words.gap(close.gap),detail:mask?'':close.scores.join(' : ')});
  const winning=list=>list.map(play=>{const scored=play.players.filter(person=>typeof person.score==='number');return scored.length?(low?Math.min:Math.max)(...scored.map(person=>person.score)):null;}).filter(value=>value!==null);
  const now=winning(plays),then=winning(before);if(then.length>=3&&now.length){const diff=average(now)-average(then);if(diff)stories.push({title:words.usual,headline:words.usualHead(diff),detail:words.usualDetail(average(then),average(now))});}
  if(plays.length>=2){const rows=winBars(plays);if(rows.length)chart={kind:'bars',title:words.winsChart,rows};}
 }else if((kind==='win'||kind==='team')&&winners){
  if(plays.length>=2){const rows=winBars(plays);if(rows.length)chart={kind:'bars',title:words.winsChart,rows};}
  // 연승: 오늘 마지막 판 우승자가 이 게임에서 이어 간 연속 우승.
  const last=plays.at(-1),lastWinners=winnerIds(last).map(id=>last.players.find(person=>person.id===id)).filter(person=>person&&named(person));
  for(const person of lastWinners.slice(0,1)){const target=who(last,person).key;let run=0;for(let index=all.length-1;index>=0;index--){const play=all[index],won=winnerIds(play).some(id=>{const p=play.players.find(item=>item.id===id);return p&&named(p)&&who(play,p).key===target;});if(!won)break;run++;}if(run>=2)stories.push({title:words.streak,headline:words.streakHead(who(last,person).name,run),detail:''});}
  const leader=list=>{const rows=new Map();for(const play of list)for(const id of winnerIds(play)){const p=play.players.find(item=>item.id===id);if(!p||!named(p))continue;const k=who(play,p),row=rows.get(k.key)||{...k,wins:0};row.wins++;rows.set(k.key,row);}const sorted=[...rows.values()].sort((a,b)=>b.wins-a.wins);return sorted[0]&&(!sorted[1]||sorted[0].wins>sorted[1].wins)?sorted[0]:null;};
  const was=leader(before),now=leader(all);if(was&&now&&was.key!==now.key)stories.push({title:words.leader,headline:now.name,detail:words.winsN(now.wins)});
 }
 stories.push(...progressStories(all,name,words,profile,winners),...contextStories(raw,all,before,plays,date,key,words,who,named,lang));
 if(full&&winners&&!mask&&kind!=='coop'){const results=resultsChart(plays,kind,words,who,named,lang);if(results)chart=results;}
 if(!stories.length)stories.push({title:words.todayTitle,headline:words.playsN(plays.length),detail:formatShareDate(date,lang)});
 return {key,game,name,imageUrl:gameImageUrl(game),isNew:!before.length,today:plays.length,total:all.length,todayLine:words.today(plays.length,all.length),chart,stories};
}

const selfIn=(play,profile)=>play.players.find(person=>person.isSelf===true)||meIn(play,profile);
// 설욕전: 오늘 이긴 판의 상대 중, 그 게임 바로 전 맞대결에서 나를 이긴 사람. 통산 전적: 오늘 마지막 판이 2인(이름 있음)일 때 이 게임 누적.
function personalStories(all,plays,words,who,named,profile,{mask,winners}){
 if(mask||!winners)return [];const out=[];
 for(const play of plays){const me=selfIn(play,profile),wins=new Set(winnerIds(play));if(!me||!wins.has(me.id))continue;
  const beaten=play.players.filter(person=>person.id!==me.id&&named(person)&&!wins.has(person.id));
  const hit=beaten.find(person=>{const target=who(play,person).key,prior=[...all.slice(0,all.indexOf(play))].reverse().find(item=>{const mine=selfIn(item,profile);return mine&&item.players.some(other=>named(other)&&who(item,other).key===target);});if(!prior)return false;const priorWins=new Set(winnerIds(prior)),mine=selfIn(prior,profile),them=prior.players.find(other=>named(other)&&who(prior,other).key===target);return them&&priorWins.has(them.id)&&!priorWins.has(mine.id);});
  if(hit){out.push({title:words.revenge,headline:words.revengeHead,detail:words.versus(who(play,hit).name)});break;}}
 const last=plays.at(-1),me=selfIn(last,profile),people=last.players.filter(named);
 if(me&&people.length===2){const other=people.find(person=>person.id!==me.id),target=who(last,other).key;let mine=0,theirs=0;
  for(const play of all){const self=selfIn(play,profile),them=play.players.find(person=>named(person)&&who(play,person).key===target);if(!self||!them)continue;const wins=new Set(winnerIds(play));if(wins.has(self.id)&&!wins.has(them.id))mine++;if(wins.has(them.id)&&!wins.has(self.id))theirs++;}
  if(mine+theirs>=2)out.push({title:words.h2h,headline:words.h2hHead(who(last,me).name,mine,theirs,who(last,other).name),detail:''});}
 return out;
}
// 최근 흐름: 이 게임에서 나의 최근 5판(5판 이상 기록, 승패가 나온 판). 다음 목표: 이 게임 다음 기준 판 수까지 3판 이내.
function progressStories(all,name,words,profile,winners){
 const out=[];
 if(winners){const results=all.map(play=>{const me=selfIn(play,profile),wins=winnerIds(play);return me&&wins.length?wins.includes(me.id):null;}).filter(value=>value!==null).slice(-5);if(results.length>=5){const won=results.filter(Boolean).length;out.push({title:words.form,headline:words.formHead(won,results.length),detail:results.map(win=>win?'●':'○').join('')});}}
 const next=MILESTONES.game.find(count=>count>all.length);if(next&&next-all.length<=3)out.push({title:words.goal,headline:words.goalHead(name,next,next-all.length),detail:''});
 return out;
}
// 하루 이야기(가벼운 날 첫 게임 장): N주 연속 게임 나이트 또는 이번 주 N번째, 통산 N판까지 M판.
export function dayStories(raw,date,{locale}={}){
 const words=COPY[shareLanguage(locale)],out=[],DAY=86400000,week=value=>{const time=Date.parse(value+'T00:00:00Z'),day=(new Date(time).getUTCDay()+6)%7;return new Date(time-day*DAY).toISOString().slice(0,10);};
 const days=[...new Set(raw.map(play=>play.date).filter(value=>value&&value<=date))],weeks=new Set(days.map(week));
 let streak=0;for(let cursor=Date.parse(week(date)+'T00:00:00Z');weeks.has(new Date(cursor).toISOString().slice(0,10));cursor-=7*DAY)streak++;
 const thisWeek=days.filter(value=>week(value)===week(date)).length;
 if(streak>=2)out.push({title:words.steady,headline:words.weeksHead(streak),detail:''});else if(thisWeek>=2)out.push({title:words.steady,headline:words.weekHead(thisWeek),detail:''});
 const total=raw.filter(play=>play.date&&play.date<=date).length,next=[...MILESTONES.plays,...Array.from({length:20},(_,i)=>1500+i*500)].find(count=>count>total);if(next&&next-total<=5)out.push({title:words.goal,headline:words.totalGoal(next,next-total),detail:''});
 return out;
}
// 승부와 무관한 이야기: 오랜만에 · 이 멤버로 N번째 · 이번 달 N번째 · 많이 한 게임 N위 · 최다 인원.
function contextStories(raw,all,before,plays,date,key,words,who,named,lang){
 const out=[],DAY=86400000,last=before.at(-1);
 if(last){const gap=Math.round((Date.parse(date)-Date.parse(last.date))/DAY);if(gap>=14)out.push({title:words.comeback,headline:words.comebackHead(gap),detail:formatShareDate(last.date,lang)});}
 const crewKey=play=>play.players.filter(named).map(person=>who(play,person).key).sort().join('\u0001'),crew=crewKey(plays.at(-1));
 if(crew&&before.some(play=>crewKey(play)===crew)){const count=all.filter(play=>crewKey(play)===crew).length;out.push({title:words.crew,headline:words.crewHead(count),detail:''});}
 const month=date.slice(0,7);if(before.some(play=>play.date.startsWith(month))){const count=all.filter(play=>play.date.startsWith(month)).length;if(count>=3)out.push({title:words.month,headline:words.monthHead(count),detail:''});}
 if(all.length>=5){const counts=new Map();for(const play of raw)if(play.date&&play.date<=date){const k=gameKey(play.game);counts.set(k,(counts.get(k)||0)+1);}const rank=[...counts.values()].filter(count=>count>all.length).length+1;if(rank<=5)out.push({title:words.favorite,headline:words.favoriteHead(rank),detail:words.playsN(all.length)});}
 const crowd=Math.max(...plays.map(play=>play.players.filter(named).length));if(crowd>=5)out.push({title:words.crowd,headline:words.crowdHead(crowd),detail:''});
 return out;
}
// 결과표: 한 판이면 순위표(순위·이름·점수), 여러 판이면 판마다 한 줄(최근 4판). 팀·역할은 이긴 진영과 멤버.
function resultsChart(plays,kind,words,who,named,lang){
 const number=value=>(kind==='holdem'&&value>0?'+':'')+value.toLocaleString(lang==='ko'?'ko-KR':'en-US');
 const ranked=play=>{const people=play.players.filter(named),mode=recordMode(play);
  if(mode==='highest'||mode==='lowest'){const sorted=people.filter(person=>typeof person.score==='number').sort((a,b)=>mode==='lowest'?a.score-b.score:b.score-a.score);return sorted.map(person=>({rank:sorted.findIndex(other=>other.score===person.score)+1,name:who(play,person).name,text:number(person.score)}));}
  if(mode==='rank')return people.filter(person=>Number.isInteger(person.rank)).sort((a,b)=>a.rank-b.rank).map(person=>({rank:person.rank,name:who(play,person).name,text:''}));
  const wins=new Set(winnerIds(play));return [...people].sort((a,b)=>wins.has(b.id)-wins.has(a.id)).map(person=>({rank:wins.has(person.id)?1:2,name:who(play,person).name,text:wins.has(person.id)?'🏆':''}));};
 const teamLine=play=>{const wins=new Set(winnerIds(play)),winners=play.players.filter(person=>wins.has(person.id)),side=String(winners[0]?.teamName||'').trim(),members=winners.filter(named).map(person=>who(play,person).name).join(', ');return side?`${words.sideWon(side)} · ${members}`:members;};
 const team=kind==='role'||kind==='team';
 if(plays.length===1&&!team){const rows=ranked(plays[0]).slice(0,6);return rows.length?{kind:'table',title:words.results,rows}:null;}
 const shown=plays.slice(-4),offset=plays.length-shown.length,rows=shown.map((play,index)=>({label:words.gameN(offset+index+1),text:team?teamLine(play):ranked(play).map(row=>row.text&&row.text!=='🏆'?`${row.name} ${row.text}`:row.text?`${row.text} ${row.name}`:row.name).join(' · ')}));
 return {kind:'plays',title:words.results,rows,more:offset?words.morePlays(offset):''};
}
// 게임 장 한 장: 표지(이름·오늘/통산) → 차트(있으면) → 이야기 카드 2장, 차트가 없으면 이야기 카드를 세로로 최대 4장.
function drawChart(ctx,chart,x,y,w,h){
 box(ctx,x,y,w,h);line(ctx,chart.title,x+32,y+50,w-64,{size:26,weight:600,color:'#9fc8f7'});
 if(chart.kind==='table'){const rowH=(h-80)/chart.rows.length;chart.rows.forEach((row,index)=>{const cy=y+80+index*rowH+rowH/2+10;line(ctx,String(row.rank),x+52,cy,60,{size:30,weight:800,color:row.rank===1?'#5fe0d0':'#82bfff',align:'center'});line(ctx,row.name,x+100,cy,w-330,{size:30,min:16,weight:800});if(row.text)line(ctx,row.text,x+w-32,cy,190,{size:30,min:16,weight:800,align:'right'});});return;}
 if(chart.kind==='plays'){const rowH=(h-80)/(chart.rows.length+(chart.more?1:0));chart.rows.forEach((row,index)=>{const cy=y+80+index*rowH+rowH/2+10;line(ctx,row.label,x+32,cy,110,{size:24,weight:700,color:'#9fc8f7'});line(ctx,row.text,x+150,cy,w-182,{size:26,min:15,weight:700});});if(chart.more)line(ctx,chart.more,x+32,y+80+chart.rows.length*rowH+rowH/2+10,w-64,{size:22,weight:600,color:'#9fc8f7'});return;}
 if(chart.kind==='missions'){const rows=chart.rows.slice(-4),rowH=(h-80)/Math.max(rows.length,1),labelW=150;rows.forEach((row,index)=>{const cy=y+80+index*rowH+rowH/2;line(ctx,row.label,x+32,cy+10,labelW-12,{size:26,min:16,weight:700});const marks=row.marks.slice(-10),size=Math.min(40,rowH-12);marks.forEach((ok,i)=>{const mx=x+32+labelW+i*(size+10);fillRound(ctx,mx,cy-size/2,size,size,10,ok?'#2fa874':'#b9475a');line(ctx,ok?'✓':'✕',mx+size/2,cy+size*.3,size,{size:Math.round(size*.7),min:12,weight:800,align:'center'});});});return;}
 const rows=chart.rows.slice(0,4),max=Math.max(1,...rows.map(row=>row.value)),rowH=(h-80)/Math.max(rows.length,1),labelW=180,textW=150;
 rows.forEach((row,index)=>{const cy=y+80+index*rowH+rowH/2;line(ctx,row.label,x+32,cy+10,labelW-16,{size:28,min:16,weight:800});const barW=(w-64-labelW-textW)*row.value/max;fillRound(ctx,x+32+labelW,cy-12,Math.max(barW,8),24,12,index===0?'#5fe0d0':'#4fa3ff');line(ctx,row.text,x+w-32,cy+10,textW-12,{size:26,min:14,weight:700,align:'right'});});
}
function storyRow(ctx,story,x,y,w,h){box(ctx,x,y,w,h);line(ctx,story.title,x+32,y+44,w-64,{size:24,min:15,weight:600,color:'#9fc8f7'});line(ctx,story.headline,x+32,y+h-30,(story.detail?w*.62:w-64),{size:40,min:20,weight:800});if(story.detail)line(ctx,story.detail,x+w-32,y+h-32,w*.32,{size:24,min:14,weight:600,color:'#b8cde6',align:'right'});}
export async function createGameSlide(story,image,page,total){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');frame(ctx,page,total);
 // 차트·카드 높이를 먼저 정하고 남는 세로 공간은 표지가 채운다.
 const top=112,bottom=1290,chartH=!story.chart?0:story.chart.kind==='table'?80+story.chart.rows.length*56:story.chart.kind==='plays'?80+(story.chart.rows.length+(story.chart.more?1:0))*56:Math.min(300,80+Math.min(4,story.chart.rows.length)*62),rows=story.chart?[]:story.stories.slice(0,4),rowH=150,content=story.chart?chartH+24+226:rows.length*rowH+14*(rows.length-1),coverH=Math.max(420,bottom-top-24-content);cover(ctx,image,story.name,X,top,CW,coverH,28);if(image)shade(ctx,X,top,CW,coverH,28,.5);
 if(story.isNew)pill(ctx,'NEW',X+20,top+20,{align:'left',fill:'#ffcf5c',color:'#1a1300',size:24});
 line(ctx,story.name,X+32,top+coverH-74,CW-64,{size:54,min:28,weight:800});line(ctx,story.todayLine,X+32,top+coverH-28,CW-64,{size:28,min:18,weight:600,color:'#cfe3ff'});
 let y=top+coverH+24;
 if(story.chart){drawChart(ctx,story.chart,X,y,CW,chartH);y+=chartH+24;const cards=story.stories.slice(0,2),h=Math.min(226,bottom-y),cw=(CW-24*(cards.length-1))/cards.length;cards.forEach((item,index)=>card(ctx,item,X+index*(cw+24),y,cw,h));}
 else rows.forEach((item,index)=>storyRow(ctx,item,X,y+index*(rowH+14),CW,rowH));
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('image')),'image/png'));
}

// records: 통계와 같은 기록(1장), raw: 원래 기록(게임 장). 둘 다 고른 날까지.
export function openDayShare(records,profile,{raw=records}={}){
 const words=recapCopy();
 return openShareDialog({heading:words.dayDialog,setHint:words.daySetHint,singleHint:words.daySingleHint,fileBase:`score-${records.map(play=>play.date).filter(Boolean).sort().at(-1)||'day'}`,winners:true,full:false,make:async state=>{
  const mask=state.scope!=='friends',data=recentShareData(records,profile,state.lang,{winners:state.winners,mask}),first=await createRecentShareImage(data);
  if(state.format!=='set')return {blobs:[first],title:data.title};
  const light=data.games.length<=2,stories=data.games.slice(0,MAX_GAMES).map(game=>gameStory(raw,data.date,game.key,profile,{locale:state.lang,mask,winners:state.winners,full:state.full&&!mask&&state.winners})).filter(Boolean),images=await Promise.all(stories.map(story=>loadImage(story.imageUrl)));
  // 가벼운 날(1~2게임): 1장 요약 없이 게임 장 + 이번 달 결산. 첫 게임 장에 하루 이야기를 앞에 둔다.
  if(light&&stories.length){stories[0]={...stories[0],stories:[...dayStories(raw,data.date,{locale:state.lang}),...stories[0].stories]};const blobs=[];for(const [index,story]of stories.entries())blobs.push(await createGameSlide(story,images[index],index+1,stories.length+1));
   const start=data.date.slice(0,8)+'01',month=recapData(records,{preset:'month',current:{start,end:data.date},previous:null},profile,{locale:state.lang,scope:state.scope});blobs.push(await createRecapSingle(month));return {blobs,title:data.title};}
  const blobs=[first];for(const [index,story]of stories.entries())blobs.push(await createGameSlide(story,images[index],index+2,stories.length+1));
  return {blobs,title:data.title};}});
}
