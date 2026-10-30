import {gameKey,winnerIds} from './records-core.js?v=155';
import {isPro,proOnlyText,markProLock} from './pro-access.js?v=1';
import {meIn,nameKey} from './personal-stats.js?v=117';
import {gameImageUrl} from './game-artwork.js?v=171';
import {firstPlays,milestones,playDays} from './stats-extras.js?v=4';
import {shareLanguage,localizedGameName,periodShareLabel,formatShareDate,roundRect,fillRound,loadImage,clippedText,drawBackground,metric,maskName} from './stats-share.js?v=156';

// 기간 결산 공유: 여러 장(표지 → 표지 격자 → Top 5 → 사람 → 달력 → 하이라이트) 또는 기간 특징 한 장. 이미지 안 글은 모두 한 줄(줄이고 넘치면 …).
const W=1080,H=1350,X=72,CW=936,SELF='\u0000self',FONT='system-ui, -apple-system, "Noto Sans KR", sans-serif';
const plural=(n,one,many)=>`${n.toLocaleString('en-US')} ${n===1?one:many}`;
const COPY={
 ko:{me:'나',dialog:'기간 결산 공유',formatSet:'여러 장',formatSetHint:'넘겨 보는 묶음',formatSingle:'한 장',formatSingleHint:'기간 특징 요약',scopeLabel:'공유 범위',formatLabel:'형식',showWinners:'우승자 표시',fullScores:'순위·점수 전체 표시',dayDialog:'최근 기록 공유',daySetHint:'그날 전체 + 게임별',daySingleHint:'그날 요약 한 장',scopePublic:'공개 SNS용',scopeFriends:'친구 공유용',scopePublicHint:'이름을 가리고 점수 비교는 빼요',scopeFriendsHint:'실명과 맞대결·점수까지 넣어요',creating:'결산 이미지를 만드는 중입니다.',readySet:n=>`${n}장 · 옆으로 넘겨 보세요.`,readySingle:'이미지를 저장하거나 SNS로 공유할 수 있습니다.',save:'이미지 저장',share:'SNS 공유',shareFailed:'공유하지 못했습니다. 이미지 저장을 이용해주세요.',createFailed:'결산 이미지를 만들지 못했습니다.',empty:'선택 기간에 공유할 기록이 없습니다.',previewAlt:n=>`결산 이미지 ${n}`,close:'닫기',
  title:label=>`${label} 결산`,plays:'플레이',days:'플레이한 날',games:'서로 다른 게임',swipe:'넘겨서 더 보기 →',topOf:preset=>preset==='month'?'이달의 게임':preset==='year'?'올해의 게임':'가장 많이 한 게임',
  wall:(label,g,p)=>`${label} · 게임 ${g}개 · ${p}판`,moreGames:'게임 더',topTitle:'가장 많이 한 게임',playsN:n=>`${n.toLocaleString('ko-KR')}판`,newFavorite:'새로 기록한 게임 1위',sinceFirst:n=>`기록 시작 후 ${n}판`,topShare:'상위 게임 비중',topShareDetail:(a,b)=>`${b}판 중 ${a}판`,
  peopleTitle:'함께한 사람들',peopleCount:'함께한 사람',groupPlays:'여럿이 한 판',rival:'가장 많이 맞붙은 상대',rivalDetail:n=>`${n}판 맞대결 · 최근 결과`,mostWins:'가장 많이 이긴 사람',together:'나와 가장 많이 함께한 사람',bestRate:'가장 높은 승률 · 5판 이상',variety:'가장 다양한 게임을 함께한 사람',gamesN:n=>`${n}종`,streakBest:'이 기간 최장 연승',streakN:n=>`${n}연승`,winsOf:(w,n)=>`${w}승 / ${n}판`,newFaces:'새 얼굴',avgPlayers:'평균 인원',winsN:n=>`${n}승`,
  calendarTitle:'플레이 달력',busiest:'가장 많이 한 날',streak:'최장 연속',daysN:n=>`${n}일`,dayPlays:n=>`하루에 ${n}판`,weekdayTitle:'요일별',weekdays:['일','월','화','수','목','금','토'],month:m=>`${m}월`,
  highlightsTitle:'이 기간의 순간들',bestScore:'최고 점수',points:n=>`${n.toLocaleString('ko-KR')}점`,closest:'가장 치열했던 판',blowout:'가장 큰 점수 차',blowHead:(game,n)=>`${game} ${n}점 차 압승`,crowdTitle:'가장 큰 판',crowdHead:(game,n)=>`${game} ${n}명`,wonBy:n=>`${n}점 차`,closeHead:(game,n)=>`${game} ${n}점 차 승부`,markDetail:(kind,day,game)=>kind==='plays'?`${day} · 그 판: ${game}`:kind==='games'?`${day} · 그 게임: ${game}`:day,milestone:'달성 기록',
  ms:{plays:n=>`통산 ${n}번째 플레이`,days:n=>`플레이한 날 ${n}일째`,games:n=>`서로 다른 게임 ${n}개째`,game:(n,g)=>`${g} ${n}번째 플레이`},medalTop:{plays:'통산',days:'플레이한 날',games:'서로 다른 게임'},medalBottom:{plays:'번째 플레이',days:'일째',games:'개째',game:'번째 플레이'},
  trait:{milestone:t=>`${t} 달성`,firsts:n=>`새로 기록한 게임 ${n}개`,focus:(g,n)=>`${g} ${n}판 집중`,coop:(w,n)=>`협력 게임 ${n}판 중 ${w}번 성공`,top:g=>`가장 많이 한 게임 · ${g}`},
  firstsTitle:n=>`새로 기록한 게임 ${n}개`,winnersOf:g=>`${g} 우승`,coopTitle:'협력 게임',success:'성공',failure:'실패',compare:'지난 기간보다',compareHead:d=>d?`${d>0?'+':''}${d}판`:'변화 없음',compareDetail:(a,b)=>`${a}판 → ${b}판`,firstsCard:'새로 기록한 게임',countN:n=>`${n}개`},
 en:{me:'Me',dialog:'Share recap',formatSet:'Carousel',formatSetHint:'Swipe set',formatSingle:'Single',formatSingleHint:'One highlight card',scopeLabel:'Share with',formatLabel:'Format',showWinners:'Show winners',fullScores:'Full rankings & scores',dayDialog:'Share game day',daySetHint:'Day + each game',daySingleHint:'Day summary only',scopePublic:'Public',scopeFriends:'Friends',scopePublicHint:'Names hidden, no score comparisons',scopeFriendsHint:'Real names, rivals and scores',creating:'Creating recap images…',readySet:n=>`${n} images · swipe to view.`,readySingle:'Save the image or share it.',save:'Save',share:'Share',shareFailed:"Couldn't share. Please save the images instead.",createFailed:"Couldn't create the recap images.",empty:'There are no records to share in this period.',previewAlt:n=>`Recap image ${n}`,close:'Close',
  title:label=>`${label} Recap`,plays:'Plays',days:'Play days',games:'Games',swipe:'Swipe for more →',topOf:preset=>preset==='month'?'Game of the month':preset==='year'?'Game of the year':'Top game',
  wall:(label,g,p)=>`${label} · ${plural(g,'game','games')} · ${plural(p,'play','plays')}`,moreGames:'more games',topTitle:'Most played',playsN:n=>plural(n,'play','plays'),newFavorite:'Top newly logged',sinceFirst:n=>`${plural(n,'play','plays')} since first logged`,topShare:'Top games share',topShareDetail:(a,b)=>`${a} of ${plural(b,'play','plays')}`,
  peopleTitle:'Play partners',peopleCount:'Players',groupPlays:'Group plays',rival:'Most-played opponent',rivalDetail:n=>`${plural(n,'game','games')} head to head · recent results`,mostWins:'Most wins',together:'Played most with me',bestRate:'Best win rate · 5+ games',variety:'Most games tried together',gamesN:n=>plural(n,'game','games'),streakBest:'Longest win streak',streakN:n=>`${n} in a row`,winsOf:(w,n)=>`${w} of ${n}`,newFaces:'New faces',avgPlayers:'Avg. players',winsN:n=>plural(n,'win','wins'),
  calendarTitle:'Play calendar',busiest:'Busiest day',streak:'Longest streak',daysN:n=>plural(n,'day','days'),dayPlays:n=>`${plural(n,'play','plays')} in a day`,weekdayTitle:'By weekday',weekdays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],month:m=>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1],
  highlightsTitle:'Highlights',bestScore:'Top score',points:n=>`${n.toLocaleString('en-US')} pts`,closest:'Closest finish',blowout:'Biggest win',blowHead:(game,n)=>`${game}, won by ${n}`,crowdTitle:'Biggest table',crowdHead:(game,n)=>`${game} · ${n} players`,wonBy:n=>`Won by ${n}`,closeHead:(game,n)=>`${game}, decided by ${n}`,markDetail:(kind,day,game)=>kind==='plays'?`${day} · that play: ${game}`:kind==='games'?`${day} · that game: ${game}`:day,milestone:'Milestone',
  ms:{plays:n=>`Play #${n}`,days:n=>`Play day #${n}`,games:n=>`Game #${n} tried`,game:(n,g)=>`${g} play #${n}`},medalTop:{plays:'Total plays',days:'Play days',games:'Games tried'},medalBottom:{plays:'reached',days:'reached',games:'reached',game:'plays'},
  trait:{milestone:t=>`Reached ${t}`,firsts:n=>`${n} games newly logged`,focus:(g,n)=>`${plural(n,'play','plays')} of ${g}`,coop:(w,n)=>`${w} of ${n} co-op wins`,top:g=>`Top game · ${g}`},
  firstsTitle:n=>`Newly logged · ${n}`,winnersOf:g=>`${g} winners`,coopTitle:'Co-op',success:'Won',failure:'Lost',compare:'vs. last period',compareHead:d=>d?`${d>0?'+':''}${d} ${Math.abs(d)===1?'play':'plays'}`:'No change',compareDetail:(a,b)=>`${a} → ${plural(b,'play','plays')}`,firstsCard:'Newly logged',countN:n=>`${n} new`},
};
export const recapCopy=lang=>COPY[shareLanguage(lang)];

export {maskName};

const byDate=(a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''));
const MS_RANK={plays:4,days:3,games:2,game:1};
// 공유 범위: public(기본)은 이름을 가리고 라이벌 대결·접전 점수를 뺀다, friends는 실명과 대결·점수 포함.
export function recapData(records,model,profile,{locale,scope='public'}={}){
 const mask=scope!=='friends',lang=shareLanguage(locale),words=COPY[lang],range=model.current,plays=records.filter(play=>play.date&&play.date>=range.start&&play.date<=range.end).sort(byDate);
 const firsts=model.preset==='all'?[]:firstPlays(records,range),newKeys=new Set(firsts.map(item=>item.key)),games=new Map();
 for(const play of plays){const key=gameKey(play.game),entry=games.get(key)||{key,game:play.game,name:localizedGameName(play.game,lang),count:0,imageUrl:gameImageUrl(play.game),isNew:newKeys.has(key)};entry.count++;games.set(key,entry);}
 const list=[...games.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),gameOf=play=>games.get(gameKey(play.game)),newGames=list.filter(game=>game.isNew),allNew=list.length>1&&newGames.length===list.length;
 // 모든 게임이 처음이면(기록을 막 시작한 기간) NEW 표시는 의미가 없어 뺀다.
 if(allNew)for(const game of list)game.isNew=false;
 // 나는 기록에 적힌 닉네임 그대로(가리지 않음), 다른 사람은 공개용이면 가림.
 const shown=(person,self)=>self||!mask?String(person.name).trim():maskName(person.name);
 // 사람: 경쟁 기록의 이름 있는 플레이어. 나는 별칭과 상관없이 한 줄, 나와 같이 한 판은 상대 전적으로도 센다.
 const people=new Map(),versus=new Map();let best=null,close=null,blow=null,crowd=null;
 for(const play of plays){
  if(play.rule==='cooperative')continue;const wins=new Set(winnerIds(play)),known=wins.size>0,me=meIn(play,profile);
  for(const person of play.players){
   const name=String(person.name||'').trim(),self=me?.id===person.id;if(person.anonymous===true||!name)continue;
   const key=self?SELF:nameKey(name),row=people.get(key)||{key,name:shown(person,self),isSelf:self,plays:0,wins:0,known:0};row.plays++;if(known){row.known++;if(wins.has(person.id))row.wins++;}people.set(key,row);
   if(me&&!self&&known){const vs=versus.get(key)||{key,name:row.name,shared:0,mine:0,theirs:0,results:[]},mine=wins.has(me.id),theirs=wins.has(person.id);vs.shared++;if(mine&&!theirs)vs.mine++;if(theirs&&!mine)vs.theirs++;vs.results.push(mine&&!theirs?'w':theirs&&!mine?'l':'d');versus.set(key,vs);}
  }
  const scored=play.players.filter(person=>person.anonymous!==true&&typeof person.score==='number'&&Number.isFinite(person.score));
  if(play.rule!=='lowest')for(const person of scored)if(!best||person.score>best.score)best={score:person.score,play,who:shown(person,me?.id===person.id)};
  if(scored.length>=2&&!play.players.some(person=>person.teamId)){const sorted=[...scored].sort((a,b)=>play.rule==='lowest'?a.score-b.score:b.score-a.score),gap=Math.abs(sorted[0].score-sorted[1].score),big=Math.max(Math.abs(sorted[0].score),Math.abs(sorted[1].score))>=10;if(gap>0&&big&&(!close||gap<=close.gap))close={gap,play,scores:[sorted[0].score,sorted[1].score]};if(gap>=10&&(!blow||gap>blow.gap))blow={gap,play,who:shown(sorted[0],me?.id===sorted[0].id)};}
  const table=play.players.length;if(table>=5&&(!crowd||table>crowd.count))crowd={count:table,play};
 }
 const rows=[...people.values()],others=rows.filter(row=>!row.isSelf),together=[...versus.values()];
 const mostWins=[...rows].sort((a,b)=>b.wins-a.wins||a.plays-b.plays)[0],rated=rows.filter(row=>row.known>=5).map(row=>({...row,rate:row.wins/row.known})).sort((a,b)=>b.rate-a.rate||b.known-a.known)[0];
 const partner=together.length?[...together].sort((a,b)=>b.shared-a.shared)[0]:[...others].sort((a,b)=>b.plays-a.plays)[0];
 const rival=mask?null:together.filter(vs=>vs.shared>=3).sort((a,b)=>b.shared-a.shared||Math.abs(a.mine-a.theirs)-Math.abs(b.mine-b.theirs))[0]||null;
 // 함께한 사람 지표: 가장 다양한 게임(다른 사람), 이 기간 최장 연승(3연승 이상), 새 얼굴(이 기간 전 기록에 없던 사람), 평균 인원.
 const variety=new Map(),streaks=new Map(),runs=new Map(),earlier=new Set();
 for(const play of records)if(play.date&&play.date<range.start)for(const person of play.players)if(person.anonymous!==true&&String(person.name||'').trim())earlier.add(nameKey(person.name));
 for(const play of plays){const me=meIn(play,profile),wins=new Set(winnerIds(play)),known=play.rule!=='cooperative'&&wins.size>0;for(const person of play.players){const name=String(person.name||'').trim();if(person.anonymous===true||!name)continue;const self=me?.id===person.id,key=self?SELF:nameKey(name);
  if(!self){const row=variety.get(key)||{key,name:shown(person,self),games:new Set()};row.games.add(gameKey(play.game));variety.set(key,row);}
  if(known){const run=wins.has(person.id)?(runs.get(key)||0)+1:0;runs.set(key,run);if(run>(streaks.get(key)?.run||0))streaks.set(key,{key,name:shown(person,self),run});}}}
 // 사람 줄: 항목마다 순위 목록에서 아직 안 나온 사람을 고른다(한 사람이 모든 줄을 차지하지 않게).
 const used=new Set(),pick=(list,ok)=>{const row=list.find(item=>ok(item)&&!used.has(item.key));if(row)used.add(row.key);return row;};
 const personRows=[];
 const winner=pick([...rows].sort((a,b)=>b.wins-a.wins||a.plays-b.plays),row=>row.wins>0);if(winner)personRows.push({icon:'🏆',name:winner.name,title:words.mostWins,value:words.winsOf(winner.wins,winner.plays)});
 const rate=pick(rows.filter(row=>row.known>=5).map(row=>({...row,rate:row.wins/row.known})).sort((a,b)=>b.rate-a.rate||b.known-a.known),row=>row.wins>0);if(rate)personRows.push({icon:'🎯',name:rate.name,title:words.bestRate,value:`${Math.round(rate.rate*100)}%`});
 const mate=pick(together.length?[...together].sort((a,b)=>b.shared-a.shared):[...others].sort((a,b)=>b.plays-a.plays),()=>true);if(mate)personRows.push({icon:'🤝',name:mate.name,title:words.together,value:words.playsN(mate.shared??mate.plays)});
 const diverse=pick([...variety.values()].sort((a,b)=>b.games.size-a.games.size),row=>row.games.size>=3);if(diverse)personRows.push({icon:'🎲',name:diverse.name,title:words.variety,value:words.gamesN(diverse.games.size)});
 const streak=pick([...streaks.values()].sort((a,b)=>b.run-a.run),row=>row.run>=3);if(streak)personRows.push({icon:'🔥',name:streak.name,title:words.streakBest,value:words.streakN(streak.run)});
 const marks=milestones(records,range).sort((a,b)=>MS_RANK[b.kind]-MS_RANK[a.kind]||b.count-a.count),markTitle=mark=>mark.kind==='game'?words.ms.game(mark.count,gameOf(mark.play)?.name||''):words.ms[mark.kind](mark.count);
 const coop=plays.filter(play=>play.rule==='cooperative'),coopWins=coop.filter(play=>play.cooperativeResult==='success').length,coopLosses=coop.filter(play=>play.cooperativeResult==='failure').length;
 const previous=model.previous?records.filter(play=>play.date>=model.previous.start&&play.date<=model.previous.end).length:null,calendarDays=Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
 const label=periodShareLabel(model,lang),focus=list[0]&&list[0].count>=5&&list[0].count/plays.length>=.6?list[0]:null;
 const focusWinners=focus?(()=>{const counts=new Map();for(const play of plays){if(gameKey(play.game)!==focus.key||play.rule==='cooperative')continue;const wins=new Set(winnerIds(play)),me=meIn(play,profile);for(const person of play.players){if(!wins.has(person.id)||person.anonymous===true||!String(person.name||'').trim())continue;const self=me?.id===person.id,key=self?SELF:nameKey(person.name),row=counts.get(key)||{name:shown(person,self),wins:0};row.wins++;counts.set(key,row);}}return [...counts.values()].sort((a,b)=>b.wins-a.wins).slice(0,3);})():[];
 const selfNames=new Map();for(const play of plays){const me=meIn(play,profile),name=String(me?.name||'').trim();if(me&&name)selfNames.set(name,(selfNames.get(name)||0)+1);}
 return {lang,words,model,scope,mask,selfName:[...selfNames].sort((a,b)=>b[1]-a[1])[0]?.[0]||words.me,peopleCount:others.length,newFaces:others.filter(row=>!earlier.has(row.key)).length,avgPlayers:plays.length?Math.round(plays.reduce((sum,play)=>sum+play.players.length,0)/plays.length*10)/10:0,label,title:words.title(label),range,plays,games:list,firsts:newGames,allNew,days:playDays(plays),calendarDays,personRows,rival,best,close,blow,crowd,marks,markTitle,coop:{total:coop.length,wins:coopWins,losses:coopLosses,top:list.find(game=>coop.some(play=>gameKey(play.game)===game.key))},previous,focus,focusWinners,dayCount:new Set(plays.map(play=>play.date)).size,gameOf};
}

// 여러 장 구성: 데이터가 없는 장은 뺀다. 표지 격자는 게임 9개 이상(한 장 12칸, 18개 이상이면 두 장).
export function recapPlan(data){
 const plan=['cover'];if(data.games.length>=9)plan.push('wall');if(data.games.length>=18)plan.push('wall2');
 if(data.games.length>=2)plan.push('top');if(data.personRows.length+(data.rival?1:0)>=2)plan.push('people');
 if(data.model.preset!=='all'&&data.calendarDays<=366)plan.push('calendar');if(highlightItems(data).length>=2)plan.push('highlights');
 return plan;
}
// 한 장 본문: 달성 기록 → 새로 기록한 게임(2개 이상) → 한 게임 집중 → 협력 게임(절반 이상) → 많이 한 게임.
export function recapTrait(data){
 const mark=data.marks.find(item=>item.kind!=='game'||item.count>=25);if(mark)return {kind:'milestone',mark};
 if(data.firsts.length>=2)return {kind:'firsts'};if(data.focus)return {kind:'focus'};
 if(data.coop.total>=3&&data.coop.total*2>=data.plays.length)return {kind:'coop'};return {kind:'top'};
}

const date=(data,value)=>formatShareDate(value,data.lang);
export function line(ctx,value,x,y,maxWidth,{size=28,min=18,weight=700,color='#fff',align='left'}={}){
 const text=String(value??'');let px=size;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;
 for(;px>min;px-=2){ctx.font=`${weight} ${px}px ${FONT}`;if(ctx.measureText(text).width<=maxWidth)break;}
 ctx.font=`${weight} ${px}px ${FONT}`;ctx.fillText(clippedText(ctx,text,maxWidth),x,y);return px;
}
export function pill(ctx,text,x,y,{align='right',fill='rgba(5,13,25,.82)',color='#e9f3ff',size=24}={}){
 ctx.font=`800 ${size}px ${FONT}`;const w=ctx.measureText(text).width+size*1.1,h=size*1.75,left=align==='right'?x-w:x;fillRound(ctx,left,y,w,h,h/2,fill);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,left+w/2,y+h/2+1);ctx.textBaseline='alphabetic';
}
export function cover(ctx,image,name,x,y,w,h,radius=24){
 ctx.save();roundRect(ctx,x,y,w,h,radius);ctx.clip();
 if(image){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale;ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)*.15,sw,sh,x,y,w,h);}
 else{const gradient=ctx.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#294d79');gradient.addColorStop(1,'#15253c');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);line(ctx,name,x+w/2,y+h/2+10,w-28,{size:Math.min(34,Math.round(w/6)),min:14,color:'#93bced',align:'center'});}
 ctx.restore();
}
export function shade(ctx,x,y,w,h,radius,from=.5){ctx.save();roundRect(ctx,x,y,w,h,radius);ctx.clip();const gradient=ctx.createLinearGradient(0,y+h*from,0,y+h);gradient.addColorStop(0,'rgba(4,10,20,0)');gradient.addColorStop(1,'rgba(4,10,20,.92)');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);ctx.restore();}
export function badges(ctx,game,x,y,w,size=24){if(game.count>1)pill(ctx,`×${game.count}`,x+w-14,y+14,{size});if(game.isNew)pill(ctx,'NEW',x+14,y+14,{align:'left',fill:'#ffcf5c',color:'#1a1300',size:size-2});}
function tile(ctx,images,game,x,y,w,h,caption,size=28){cover(ctx,images.get(game.key),game.name,x,y,w,h);if(caption&&images.get(game.key)){shade(ctx,x,y,w,h,24,.55);line(ctx,caption,x+22,y+h-26,w-44,{size,min:16});}badges(ctx,game,x,y,w);}
export function frame(ctx,page,total){drawBackground(ctx);line(ctx,'SCORE COUNTER',X,71,500,{size:30,color:'#82bfff'});}
function heading(ctx,title,sub){line(ctx,title,X,168,CW,{size:56,min:30,weight:800});if(sub)line(ctx,sub,X,216,CW,{size:30,min:18,weight:600,color:'#9fc8f7'});}
export function box(ctx,x,y,w,h){fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');}
export function card(ctx,{title,headline,detail},x,y,w,h){box(ctx,x,y,w,h);line(ctx,title,x+32,y+54,w-64,{size:26,min:16,weight:600,color:'#9fc8f7'});line(ctx,headline,x+32,y+h/2+34,w-64,{size:48,min:22,weight:800});if(detail)line(ctx,detail,x+32,y+h-30,w-64,{size:24,min:15,weight:600,color:'#b8cde6'});}
function metrics(ctx,data,y,h){const words=data.words,gap=24,w=(CW-gap*2)/3;[[data.plays.length,words.plays],[data.dayCount,words.days],[data.games.length,words.games]].forEach(([value,label],index)=>metric(ctx,{x:X+index*(w+gap),y,w,h},value.toLocaleString(data.lang==='ko'?'ko-KR':'en-US'),label,{center:true}));}
const rangeText=data=>`${data.range.start.replace(/-/g,'.')} ~ ${data.range.end.replace(/-/g,'.')}`;
function canvas(){const node=document.createElement('canvas');node.width=W;node.height=H;return [node,node.getContext('2d')];}
const toBlob=(node,words)=>new Promise((resolve,reject)=>node.toBlob(blob=>blob?resolve(blob):reject(Error(words.createFailed)),'image/png'));
async function loadCovers(games){const images=new Map();await Promise.all(games.slice(0,30).map(async game=>images.set(game.key,await loadImage(game.imageUrl))));return images;}

function coverSlide(ctx,data,images,total){
 const words=data.words,shown=data.games.slice(0,3),top=452,h=788,gap=24;heading(ctx,data.title,rangeText(data));metrics(ctx,data,250,172);
 const hero=`${words.topOf(data.model.preset)} · ${shown[0].name}`;
 if(shown.length===1)tile(ctx,images,shown[0],X,top,CW,h,hero,38);
 else if(shown.length===2){const w=(CW-gap)/2;tile(ctx,images,shown[0],X,top,w,h,hero,30);tile(ctx,images,shown[1],X+w+gap,top,w,h,shown[1].name,30);}
 else{const big=Math.round((CW-gap)*.57),small=CW-gap-big,half=(h-gap)/2;tile(ctx,images,shown[0],X,top,big,h,hero,34);tile(ctx,images,shown[1],X+big+gap,top,small,half,shown[1].name,26);tile(ctx,images,shown[2],X+big+gap,top+half+gap,small,half,shown[2].name,26);}
 if(total>1)line(ctx,words.swipe,X,1300,CW,{size:24,weight:600,color:'rgba(255,255,255,.55)'});
}
// 표지 격자: 3×3 정사각형 9칸(가로를 꽉 채움) + 아래 글자 띠(표지와 겹치지 않음). 첫 장 0~8, 둘째 장 9~17. 장에 다 못 넣으면 마지막 칸 '+N 게임 더'.
function wallSlide(ctx,data,images,page,total,second){
 const words=data.words,gap=6,size=(W-gap*2)/3,start=second?9:0,rest=data.games.length-start,items=data.games.slice(start,start+(rest>9&&(second||data.games.length<18)?8:9)),more=items.length<rest;
 ctx.fillStyle='#060d1a';ctx.fillRect(0,0,W,H);
 for(let index=0;index<9;index++){const x=(index%3)*(size+gap),y=Math.floor(index/3)*(size+gap),game=items[index];
  if(game){cover(ctx,images.get(game.key),game.name,x,y,size,size,0);badges(ctx,game,x,y,size,26);}
  else if(index===items.length&&more){fillRound(ctx,x,y,size,size,0,'#13233a');line(ctx,`+${data.games.length-start-items.length}`,x+size/2,y+size/2+10,size-40,{size:84,min:40,weight:800,align:'center'});line(ctx,words.moreGames,x+size/2,y+size/2+60,size-40,{size:28,weight:600,color:'#9fc8f7',align:'center'});}
  else{ctx.fillStyle='#0c1a2c';ctx.fillRect(x,y,size,size);}
 }
 const band=size*3+gap*2;line(ctx,'SCORE COUNTER',X,band+92,500,{size:28,color:'#82bfff'});line(ctx,words.wall(data.label,data.games.length,data.plays.length),X,band+170,CW,{size:56,min:28,weight:800});
}
function topSlide(ctx,data,images){
 const words=data.words,rows=data.games.slice(0,5),max=rows[0].count;heading(ctx,words.topTitle);
 rows.forEach((game,index)=>{const y=250+index*172;line(ctx,String(index+1),X+28,y+92,60,{size:46,weight:800,color:'#82bfff',align:'center'});cover(ctx,images.get(game.key),game.name,X+72,y+9,132,132,20);if(game.isNew)pill(ctx,'NEW',X+80,y+17,{align:'left',fill:'#ffcf5c',color:'#1a1300',size:18});
  const left=X+232,count=words.playsN(game.count);ctx.font=`700 30px ${FONT}`;const countW=ctx.measureText(count).width;line(ctx,game.name,left,y+60,CW-232-countW-24,{size:36,min:20});line(ctx,count,X+CW,y+60,countW+4,{size:30,color:'#9fc8f7',align:'right'});
  fillRound(ctx,left,y+88,(CW-232)*game.count/max,22,11,'#4fa3ff');});
 const favorite=data.allNew?null:[...data.firsts].sort((a,b)=>b.count-a.count)[0],y=1120;
 if(favorite){box(ctx,X,y,CW,170);line(ctx,words.newFavorite,X+32,y+52,CW-260,{size:26,weight:600,color:'#9fc8f7'});line(ctx,favorite.name,X+32,y+108,CW-260,{size:44,min:22,weight:800});line(ctx,words.sinceFirst(favorite.count),X+32,y+148,CW-260,{size:24,weight:600,color:'#b8cde6'});cover(ctx,images.get(favorite.key),favorite.name,X+CW-166,y+20,130,130,18);}
 else{const sum=rows.reduce((total,game)=>total+game.count,0);card(ctx,{title:words.topShare,headline:`${Math.round(sum/data.plays.length*100)}%`,detail:words.topShareDetail(sum,data.plays.length)},X,y-16,CW,196);}
}
function peopleSlide(ctx,data){
 const words=data.words;let y=250;heading(ctx,words.peopleTitle);
 if(data.rival){const rival=data.rival,h=400;box(ctx,X,y,CW,h);line(ctx,words.rival,X+34,y+56,CW-68,{size:26,weight:600,color:'#9fc8f7'});
  [[rival.mine,data.selfName,X+CW*.25],[rival.theirs,rival.name,X+CW*.75]].forEach(([value,name,cx])=>{line(ctx,String(value),cx,y+200,360,{size:120,min:60,weight:900,align:'center'});line(ctx,name,cx,y+252,360,{size:34,min:20,weight:700,color:'#cfe3ff',align:'center'});});
  line(ctx,'VS',X+CW/2,y+180,120,{size:40,weight:800,color:'#82bfff',align:'center'});
  const results=rival.results.slice(-20),gap=8,dot=(CW-68-gap*(results.length-1))/results.length;results.forEach((result,index)=>fillRound(ctx,X+34+index*(dot+gap),y+290,dot,18,9,result==='w'?'#4fa3ff':result==='l'?'rgba(255,255,255,.2)':'#9fc8f7'));
  line(ctx,words.rivalDetail(rival.shared),X+34,y+360,CW-68,{size:26,weight:600,color:'#b8cde6'});y+=h+24;}
 if(!data.rival){const w=(CW-48)/3;[[data.peopleCount,words.peopleCount],[data.newFaces,words.newFaces],[data.avgPlayers,words.avgPlayers]].forEach(([value,label],index)=>metric(ctx,{x:X+index*(w+24),y,w,h:172},value.toLocaleString(data.lang==='ko'?'ko-KR':'en-US'),label,{center:true}));y+=196;}
 const rows=data.personRows,rowH=Math.min(150,(1290-y-24)/Math.max(rows.length,1)),shift=(rowH-128)/2,h=rows.length*rowH+24;box(ctx,X,y,CW,h);
 rows.forEach((row,index)=>{const top=y+12+index*rowH+shift;fillRound(ctx,X+30,top+22,84,84,42,'#2c4c74');line(ctx,row.icon,X+72,top+78,80,{size:40,align:'center'});ctx.font=`800 40px ${FONT}`;const valueW=ctx.measureText(row.value).width;
  line(ctx,row.name,X+140,top+62,CW-200-valueW,{size:36,min:20,weight:800});line(ctx,row.title,X+140,top+100,CW-200-valueW,{size:24,min:16,weight:600,color:'#9fb8d6'});line(ctx,row.value,X+CW-30,top+80,valueW+4,{size:40,weight:800,align:'right'});
  if(index<rows.length-1){ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(X+30,top-shift+rowH-1,CW-60,1);}});
}
const LEVELS=['rgba(255,255,255,.07)','#1d4f7a','#2c7bbf','#4fa3ff','#9fe7ff'],DAY=86400000,utc=value=>Date.parse(value+'T00:00:00Z'),iso=time=>new Date(time).toISOString().slice(0,10);
function calendarSlide(ctx,data){
 const words=data.words,{counts,busiest,streak}=data.days,max=Math.max(1,...counts.values()),level=count=>count?Math.min(4,Math.ceil(count/max*4)):0,start=utc(data.range.start),end=utc(data.range.end);heading(ctx,words.calendarTitle);
 if(data.calendarDays<=62){
  const cell=CW/7,weeks=Math.ceil((new Date(start).getUTCDay()+data.calendarDays)/7),rowH=Math.min(100,520/weeks);words.weekdays.forEach((day,index)=>line(ctx,day,X+index*cell+cell/2,290,cell-8,{size:24,weight:600,color:'#9fb8d6',align:'center'}));
  for(let time=start,slot=new Date(start).getUTCDay();time<=end;time+=DAY,slot++){const value=iso(time),x=X+(slot%7)*cell,y=310+Math.floor(slot/7)*rowH,lv=level(counts.get(value)||0);fillRound(ctx,x+4,y+4,cell-8,rowH-8,12,LEVELS[lv]);line(ctx,String(Number(value.slice(8))),x+16,y+34,cell-24,{size:20,weight:700,color:lv>=3?'#08111e':'rgba(255,255,255,.7)'});}
 }else{
  const months=[];for(let cursor=data.range.start.slice(0,7);cursor<=data.range.end.slice(0,7);){months.push(cursor);const [year,month]=cursor.split('-').map(Number);cursor=month===12?`${year+1}-01`:`${year}-${String(month+1).padStart(2,'0')}`;}
  const labelW=92,countW=104,cell=(CW-labelW-countW)/31,rowH=Math.min(56,560/months.length),size=Math.min(cell-4,rowH-6),monthly=new Map();for(const play of data.plays)monthly.set(play.date.slice(0,7),(monthly.get(play.date.slice(0,7))||0)+1);
  months.forEach((cursor,row)=>{const [year,month]=cursor.split('-').map(Number),last=new Date(Date.UTC(year,month,0)).getUTCDate(),y=270+row*rowH+(rowH-size)/2;line(ctx,words.month(month),X,y+size-4,labelW-10,{size:22,weight:600,color:'#9fb8d6'});line(ctx,words.playsN(monthly.get(cursor)||0),X+CW,y+size-4,countW-12,{size:22,min:14,weight:700,color:(monthly.get(cursor)||0)?'#fff':'rgba(255,255,255,.4)',align:'right'});
   for(let day=1;day<=last;day++){const value=`${cursor}-${String(day).padStart(2,'0')}`;if(value<data.range.start||value>data.range.end)continue;fillRound(ctx,X+labelW+(day-1)*cell,y,size,size,5,LEVELS[level(counts.get(value)||0)]);}});
 }
 const y=860,half=(CW-24)/2;if(busiest)card(ctx,{title:words.busiest,headline:date(data,busiest.date),detail:words.dayPlays(busiest.count)},X,y,streak>1?half:CW,190);if(streak>1)card(ctx,{title:words.streak,headline:words.daysN(streak),detail:''},X+half+24,y,half,190);
 const weekday=[0,0,0,0,0,0,0];for(const play of data.plays)weekday[new Date(utc(play.date)).getUTCDay()]++;const top=Math.max(1,...weekday),by=1074;box(ctx,X,by,CW,212);line(ctx,words.weekdayTitle,X+32,by+50,CW-64,{size:26,weight:600,color:'#9fc8f7'});
 const slot=(CW-64)/7;weekday.forEach((count,index)=>{const bar=Math.max(6,count/top*100),cx=X+32+index*slot+slot/2;fillRound(ctx,cx-slot*.32,by+170-bar,slot*.64,bar,8,count===top?'#5fe0d0':'#2c7bbf');line(ctx,words.weekdays[index],cx,by+200,slot-6,{size:20,weight:600,color:'#9fb8d6',align:'center'});});
}
function highlightItems(data){
 const words=data.words,items=[],name=play=>data.gameOf(play)?.name||'';
 if(data.best)items.push({game:data.gameOf(data.best.play),title:words.bestScore,headline:words.points(data.best.score),detail:`${name(data.best.play)} · ${data.best.who} · ${date(data,data.best.play.date)}`});
 if(data.close)items.push({game:data.gameOf(data.close.play),title:words.closest,headline:words.closeHead(name(data.close.play),data.close.gap),detail:[data.mask?'':data.close.scores.join(' : '),date(data,data.close.play.date)].filter(Boolean).join(' · ')});
 if(data.blow)items.push({game:data.gameOf(data.blow.play),title:words.blowout,headline:words.blowHead(name(data.blow.play),data.blow.gap),detail:`${data.blow.who} · ${date(data,data.blow.play.date)}`});
 for(const mark of data.marks.slice(0,2))items.push({icon:'🎉',title:words.milestone,headline:data.markTitle(mark),detail:words.markDetail(mark.kind,date(data,mark.play.date),name(mark.play))});
 if(data.crowd)items.push({game:data.gameOf(data.crowd.play),title:words.crowdTitle,headline:words.crowdHead(name(data.crowd.play),data.crowd.count),detail:date(data,data.crowd.play.date)});
 if(data.days.busiest)items.push({icon:'📅',title:words.busiest,headline:date(data,data.days.busiest.date),detail:words.dayPlays(data.days.busiest.count)});
 // 최대 5개: 최고 점수 · 치열 · 압승 · 달성 2 · 최다 인원 · 가장 많이 한 날 순서에서 앞의 다섯.
 return items.slice(0,5);
}
function highlightsSlide(ctx,data,images){
 heading(ctx,data.words.highlightsTitle);
 const list=highlightItems(data),gap=18,h=Math.min(220,(1290-250-gap*(list.length-1))/list.length),thumb=h-50;
 list.forEach((item,index)=>{const y=250+index*(h+gap);box(ctx,X,y,CW,h);if(item.game)cover(ctx,images.get(item.game.key),item.game.name,X+25,y+25,thumb,thumb,20);else{fillRound(ctx,X+25,y+25,thumb,thumb,thumb/2,'#2c4c74');line(ctx,item.icon,X+25+thumb/2,y+25+thumb*.68,thumb,{size:Math.round(thumb*.4),align:'center'});}
  const left=X+thumb+56,room=CW-thumb-86;line(ctx,item.title,left,y+h*.3,room,{size:25,weight:600,color:'#9fc8f7'});line(ctx,item.headline,left,y+h*.62,room,{size:46,min:24,weight:800});line(ctx,item.detail,left,y+h*.86,room,{size:23,min:15,weight:600,color:'#b8cde6'});});
}

export async function createRecapSet(data){
 if(!data.plays.length)throw Error(data.words.empty);const images=await loadCovers(data.games),plan=recapPlan(data),blobs=[];
 for(const [index,kind]of plan.entries()){const [node,ctx]=canvas(),page=index+1,total=plan.length;
  if(kind==='wall'||kind==='wall2')wallSlide(ctx,data,images,page,total,kind==='wall2');
  else{frame(ctx,page,total);({cover:coverSlide,top:topSlide,people:peopleSlide,calendar:calendarSlide,highlights:highlightsSlide})[kind](ctx,data,images,total);}
  blobs.push(await toBlob(node,data.words));}
 return blobs;
}

// 한 장: 제목·특징 한 줄 → 지표 → 특징 본문 → 보조 카드 2장(지난 기간 비교 · 최다 우승 · 새로 기록한 게임 · 많이 한 게임 · 연속 · 가장 많이 한 날 중 본문과 겹치지 않는 것).
export async function createRecapSingle(data){
 const words=data.words;if(!data.plays.length)throw Error(words.empty);const images=await loadCovers(data.games),trait=recapTrait(data),[node,ctx]=canvas(),top=data.games[0];
 const sub=trait.kind==='milestone'?words.trait.milestone(data.markTitle(trait.mark)):trait.kind==='firsts'?words.trait.firsts(data.firsts.length):trait.kind==='focus'?words.trait.focus(data.focus.name,data.focus.count):trait.kind==='coop'?words.trait.coop(data.coop.wins,data.coop.total):words.trait.top(top.name);
 frame(ctx,1,1);heading(ctx,data.title,sub);metrics(ctx,data,250,150);const y=430,h=570;
 if(trait.kind==='milestone'){const mark=trait.mark,cx=W/2,cy=y+250,r=230,gradient=ctx.createRadialGradient(cx-70,cy-80,20,cx,cy,r);gradient.addColorStop(0,'#fff3c4');gradient.addColorStop(.45,'#ffcf5c');gradient.addColorStop(1,'#c98a12');
  ctx.fillStyle='rgba(255,207,92,.10)';ctx.beginPath();ctx.arc(cx,cy,r+40,0,Math.PI*2);ctx.fill();ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  const topLabel=mark.kind==='game'?data.gameOf(mark.play)?.name||'':words.medalTop[mark.kind];line(ctx,topLabel,cx,cy-96,r*1.5,{size:36,min:18,weight:800,color:'#3a2600',align:'center'});line(ctx,String(mark.count),cx,cy+56,r*1.6,{size:150,min:60,weight:900,color:'#3a2600',align:'center'});line(ctx,words.medalBottom[mark.kind],cx,cy+118,r*1.4,{size:34,min:18,weight:800,color:'#3a2600',align:'center'});
  line(ctx,words.markDetail(mark.kind,date(data,mark.play.date),data.gameOf(mark.play)?.name||''),cx,y+h-6,CW,{size:30,weight:600,color:'#cfe3ff',align:'center'});}
 else if(trait.kind==='firsts'){const list=data.firsts.slice(0,4),gap=20,size=(CW-gap*3)/4;line(ctx,words.firstsTitle(data.firsts.length),X,y+40,CW,{size:30,weight:700,color:'#9fc8f7'});
  list.forEach((game,index)=>{const x=X+index*(size+gap);cover(ctx,images.get(game.key),game.name,x,y+70,size,size,20);badges(ctx,game,x,y+70,size,20);line(ctx,game.name,x+size/2,y+70+size+44,size,{size:26,min:15,weight:700,align:'center'});});
  if(data.firsts.length>4)line(ctx,`+${data.firsts.length-4}`,X+CW,y+40,120,{size:30,weight:800,color:'#9fc8f7',align:'right'});}
 else if(trait.kind==='focus'){const game=data.focus,left=420;tile(ctx,images,game,X,y,left,h,game.name,30);const x=X+left+24,w=CW-left-24;box(ctx,x,y,w,h);line(ctx,words.winnersOf(game.name),x+30,y+56,w-60,{size:26,weight:600,color:'#9fc8f7'});
  const rows=data.focusWinners,most=Math.max(1,...rows.map(row=>row.wins));rows.forEach((row,index)=>{const ry=y+110+index*88;line(ctx,row.name,x+30,ry+28,110,{size:30,min:16,weight:800});fillRound(ctx,x+150,ry+8,(w-240)*row.wins/most,24,12,'#4fa3ff');line(ctx,String(row.wins),x+w-30,ry+30,60,{size:30,weight:800,align:'right'});});}
 else if(trait.kind==='coop'){const coop=data.coop,cx=X+190,cy=y+h/2,r=140,total=Math.max(1,coop.total);box(ctx,X,y,CW,h);ctx.lineWidth=52;ctx.lineCap='butt';let angle=-Math.PI/2;
  for(const [value,color]of [[coop.wins,'#3fcf9a'],[coop.losses,'#d9566a'],[coop.total-coop.wins-coop.losses,'rgba(255,255,255,.18)']]){if(!value)continue;const next=angle+value/total*Math.PI*2;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(cx,cy,r,angle,next);ctx.stroke();angle=next;}
  line(ctx,`${Math.round(coop.wins/total*100)}%`,cx,cy+20,180,{size:56,min:28,weight:900,align:'center'});const x=X+400,room=CW-430;line(ctx,coop.top?.name||words.coopTitle,x,y+170,room,{size:40,min:22,weight:800});
  [[words.success,coop.wins,'#3fcf9a'],[words.failure,coop.losses,'#d9566a']].forEach(([label,value,color],index)=>{const ly=y+250+index*74;fillRound(ctx,x,ly-26,30,30,8,color);line(ctx,`${label} ${words.playsN(value)}`,x+48,ly,room-48,{size:32,min:18,weight:700});});}
 else{const shown=data.games.slice(0,3),gap=24,w=(CW-gap*(shown.length-1))/shown.length;shown.forEach((game,index)=>tile(ctx,images,game,X+index*(w+gap),y,w,h,game.name,shown.length===1?36:28));}
 const used=new Set([trait.kind]),pool=[];
 if(data.previous!==null)pool.push({title:words.compare,headline:words.compareHead(data.plays.length-data.previous),detail:words.compareDetail(data.previous,data.plays.length)});
 const mvp=data.personRows.find(row=>row.icon==='🏆');if(mvp)pool.push({title:words.mostWins,headline:mvp.name,detail:mvp.value});
 if(!used.has('firsts')&&data.firsts.length)pool.push({title:words.firstsCard,headline:words.countN(data.firsts.length),detail:data.firsts.map(game=>game.name).join(', ')});
 if(trait.kind!=='top'&&trait.kind!=='focus')pool.push({title:words.topTitle,headline:top.name,detail:words.playsN(top.count)});
 if(data.days.streak>1)pool.push({title:words.streak,headline:words.daysN(data.days.streak),detail:''});
 if(data.days.busiest)pool.push({title:words.busiest,headline:date(data,data.days.busiest.date),detail:words.dayPlays(data.days.busiest.count)});
 const cards=pool.slice(0,2),cw=(CW-24*(cards.length-1))/Math.max(1,cards.length);cards.forEach((item,index)=>card(ctx,item,X+index*(cw+24),1030,cw,220));
 return toBlob(node,words);
}

// 공유 창(기간 결산·최근 기록 공용): 형식(여러 장·한 장)·공유 범위(공개·친구)·우승자 표시(최근 기록만)를 한 상태에서 그리고, 바뀌면 make(state)로 다시 만든다.
let session=null;
const fileName=(state,index,count)=>`${state.fileBase}${count>1?`-${index+1}`:''}.png`;
function release(state){for(const url of state.urls||[])URL.revokeObjectURL(url);state.urls=[];state.files=[];}
function paint(dialog,state){
 const words=COPY[state.lang],ready=state.phase==='ready',busy=state.phase==='creating',files=state.files,canShare=ready&&typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files}));
 for(const button of dialog.querySelectorAll('.recap-format button')){const on=button.dataset.format===state.format;button.setAttribute('aria-checked',String(on));button.classList.toggle('is-selected',on);button.disabled=busy;markProLock(button,button.dataset.format==='set'&&!isPro());}
 for(const button of dialog.querySelectorAll('.recap-scope button')){const on=button.dataset.scope===state.scope;button.setAttribute('aria-checked',String(on));button.classList.toggle('is-selected',on);button.disabled=busy;markProLock(button,button.dataset.scope==='friends'&&!isPro());}
 dialog.querySelector('.recap-scope-hint').textContent=state.scope==='friends'?words.scopeFriendsHint:words.scopePublicHint;dialog.querySelector('.recap-format-hint').textContent=state.format==='set'?state.setHint:state.singleHint;
 const winners=dialog.querySelector('.recap-winners'),toggle=winners.querySelector('input');winners.hidden=state.winners===undefined;toggle.checked=state.winners!==false;toggle.disabled=busy;markProLock(dialog.querySelector('.recap-full .recap-option-label'),!isPro());
 const full=dialog.querySelector('.recap-full'),fullToggle=full.querySelector('input');full.hidden=state.full===undefined||state.scope!=='friends'||state.winners===false;fullToggle.checked=state.full===true;fullToggle.disabled=busy;
 dialog.querySelector('.recent-share-status').textContent=state.notice&&!busy?state.notice:busy?words.creating:state.phase==='error'?state.error:files.length>1?words.readySet(files.length):words.readySingle;
 const strip=dialog.querySelector('.recap-strip');strip.classList.toggle('is-single',files.length<=1);strip.replaceChildren(...state.urls.map((url,index)=>{const image=document.createElement('img');image.src=url;image.alt=words.previewAlt(index+1);image.className='recap-preview';return image;}));
 const save=dialog.querySelector('.recent-share-save'),send=dialog.querySelector('.recent-share-send');save.disabled=!ready;send.disabled=!canShare;send.hidden=ready&&!canShare;
}
async function build(dialog,state){
 const token=++state.token;release(state);state.notice='';state.phase='creating';paint(dialog,state);
 try{const {blobs,title}=await state.make(state);
  if(token!==state.token||session!==state||!dialog.open)return;state.files=blobs.map((blob,index)=>new File([blob],fileName(state,index,blobs.length),{type:'image/png'}));state.urls=blobs.map(blob=>URL.createObjectURL(blob));state.title=title;state.phase='ready';}
 catch(error){if(token!==state.token)return;state.phase='error';state.error=error?.message||COPY[state.lang].createFailed;}
 paint(dialog,state);
}
function ensureShareDialog(){
 let dialog=document.getElementById('recapShareDialog');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='recapShareDialog';dialog.className='recent-share-dialog recap-share-dialog';
 dialog.innerHTML='<div class="record-head"><h2></h2><button class="score-close" type="button">×</button></div><div class="recap-preview-area"><div class="recap-strip"></div><p class="recent-share-status" role="status" aria-live="polite"></p></div><div class="recap-options"><div class="recap-option"><p class="recap-option-head"><strong data-label="format"></strong><small class="recap-format-hint"></small></p><div class="recap-format recap-segment" role="radiogroup"><button type="button" role="radio" data-format="set"></button><button type="button" role="radio" data-format="single"></button></div></div><div class="recap-option"><p class="recap-option-head"><strong data-label="scope"></strong><small class="recap-scope-hint"></small></p><div class="recap-scope recap-segment" role="radiogroup"><button type="button" role="radio" data-scope="public"></button><button type="button" role="radio" data-scope="friends"></button></div></div><label class="recap-switch recap-winners" hidden><span class="recap-option-label"></span><input type="checkbox" role="switch"></label><label class="recap-switch recap-full" hidden><span class="recap-option-label"></span><input type="checkbox" role="switch"></label></div><div class="actions recent-share-actions"><button class="secondary recent-share-save" type="button" disabled></button><button class="primary recent-share-send" type="button" disabled></button></div>';
 const close=()=>dialog.close();dialog.querySelector('.score-close').onclick=close;dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.addEventListener('close',()=>{if(session){session.token++;release(session);}session=null;dialog.querySelector('.recap-strip').replaceChildren();});
 // Pro 잠금: 바꾸지 않고 상태 줄에 안내만.
 const locked=()=>{session.notice=proOnlyText();paint(dialog,session);};
 for(const button of dialog.querySelectorAll('.recap-format button'))button.onclick=()=>{if(!session||session.format===button.dataset.format)return;if(button.dataset.format==='set'&&!isPro())return locked();session.format=button.dataset.format;build(dialog,session);};
 for(const button of dialog.querySelectorAll('.recap-scope button'))button.onclick=()=>{if(!session||session.scope===button.dataset.scope)return;if(button.dataset.scope==='friends'&&!isPro())return locked();session.scope=button.dataset.scope;build(dialog,session);};
 dialog.querySelector('.recap-winners input').onchange=event=>{if(!session||session.winners===undefined)return;session.winners=event.target.checked;build(dialog,session);};
 dialog.querySelector('.recap-full input').onchange=event=>{if(!session||session.full===undefined)return;if(!isPro()){event.target.checked=false;return locked();}session.full=event.target.checked;build(dialog,session);};
 dialog.querySelector('.recent-share-save').onclick=async()=>{const files=session?.files||[],urls=session?.urls||[];for(const [index,file]of files.entries()){const link=document.createElement('a');link.href=urls[index];link.download=file.name;document.body.append(link);link.click();link.remove();if(index<files.length-1)await new Promise(resolve=>setTimeout(resolve,350));}};
 dialog.querySelector('.recent-share-send').onclick=async()=>{const state=session;if(!state?.files.length)return;try{await navigator.share({files:state.files,title:state.title,text:`${state.title} · Score Counter`});}catch(error){if(error?.name!=='AbortError'&&session===state){state.phase='error';state.error=COPY[state.lang].shareFailed;paint(dialog,state);state.phase='ready';}}};
 document.body.append(dialog);return dialog;
}
// heading: 창 제목, setHint/singleHint: 형식 버튼 설명, winners·full: undefined면 그 옵션을 숨긴다(full은 친구 공유용·우승자 표시일 때만 보임).
export async function openShareDialog({heading,setHint,singleHint,fileBase,winners,full,make}){
 const dialog=ensureShareDialog(),lang=shareLanguage(),words=COPY[lang];if(session){session.token++;release(session);}
 const state={lang,fileBase,make,setHint,singleHint,format:isPro()?'set':'single',scope:'public',winners,full,token:0,files:[],urls:[],phase:'creating'};session=state;
 dialog.lang=lang;dialog.querySelector('h2').textContent=heading;dialog.querySelector('.score-close').setAttribute('aria-label',words.close);dialog.querySelector('.recap-format').setAttribute('aria-label',heading);
 const [set,single]=dialog.querySelectorAll('.recap-format button');set.textContent=words.formatSet;single.textContent=words.formatSingle;dialog.querySelector('[data-label=format]').textContent=words.formatLabel;dialog.querySelector('[data-label=scope]').textContent=words.scopeLabel;
 const [open,friends]=dialog.querySelectorAll('.recap-scope button');open.textContent=words.scopePublic;friends.textContent=words.scopeFriends;dialog.querySelector('.recap-scope').setAttribute('aria-label',words.scopeLabel);dialog.querySelector('.recap-winners .recap-option-label').textContent=words.showWinners;dialog.querySelector('.recap-full .recap-option-label').textContent=words.fullScores;dialog.querySelector('.recent-share-save').textContent=words.save;dialog.querySelector('.recent-share-send').textContent=words.share;
 if(!dialog.open)dialog.showModal();await build(dialog,state);
}
export function openRecapShare(records,model,profile){
 const words=COPY[shareLanguage()];
 return openShareDialog({heading:words.dialog,setHint:words.formatSetHint,singleHint:words.formatSingleHint,fileBase:`score-${model.current.start}-${model.current.end}`,make:async state=>{const data=recapData(records,model,profile,{locale:state.lang,scope:state.scope});return {blobs:state.format==='set'?await createRecapSet(data):[await createRecapSingle(data)],title:data.title};}});
}
