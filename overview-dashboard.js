import {recentHighlights,rivalStats} from './social-insights.js?v=115';
import {gameKey,recordMode,modeLabels,modeStats} from './records-core.js?v=152';
import {overviewStats,latestPlayDate,typeLabels,attendanceCount} from './stats-overview.js?v=164';
import {readIdentity,meIn} from './personal-stats.js?v=115';
import {renderGameArtwork} from './game-artwork.js?v=171';
import {metadata,gameNames} from './bgg-metadata.js?v=171';
import {formatRecentRecordTitle,openRecentShare} from './stats-share.js?v=141';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const num=n=>n===null?'—':n.toLocaleString('ko-KR');
const typeGroups=[{label:'가족/파티',types:['family','party','children','abstract','thematic']},{label:'추리',types:['deduction']},{label:'협동',types:['cooperative']},{label:'전략',types:['strategy','war']},{label:'스포츠',types:['sports','customizable']},{label:'미분류',types:['unknown']}];
// 여러 유형인 게임은 이 순서로 한 묶음에만 넣는다.
const groupPriority=['추리','협동','전략','가족/파티','스포츠','미분류'].map(label=>typeGroups.find(group=>group.label===label));
const groupOf=game=>groupPriority.find(group=>group.types.some(t=>game.types.has(t)));
function metrics(box,values){const row=el('div',undefined,'insight-metrics');row.setAttribute('data-columns',String(values.length));for(const [value,label]of values){const cell=el('div');cell.append(el('strong',num(value)),el('span',label));row.append(cell);}box.append(row);}
function note(box,text){box.append(el('p',text,'insight-footnote'));}
// 기간 분석 · 방식별 나의 성적: 방식마다 승률(협력은 성공률) 막대와 경기 인원으로 본 기대 승률(세로선)을 보여 주고, 기대보다 가장 잘한 방식을 맨 위에 짚어 준다.
const sidesOf=play=>{if(recordMode(play)==='team'){const teams=new Set(play.players.map(p=>p.teamId).filter(Boolean));if(teams.size>1)return teams.size;}return Math.max(1,play.players.length);};
const percent=value=>Math.round(value*100);
function modeScoreCard(subset,profile){
 const section=el('section',undefined,'insight-card mode-scores');section.append(el('h3','방식별 나의 성적'));
 const mine=subset.flatMap(play=>{const me=meIn(play,profile);return me?[{...play,players:play.players.map(p=>({...p,isSelf:p.id===me.id}))}]:[];});
 const rows=modeStats(mine).map(g=>{const own=mine.filter(play=>recordMode(play)===g.mode),coop=g.mode==='cooperative';return {...g,me:g.players.find(p=>p.name==='나'),coop,expected:coop||!own.length?null:own.reduce((sum,play)=>sum+1/sidesOf(play),0)/own.length};}).filter(row=>row.me).sort((a,b)=>b.count-a.count);
 if(!rows.length){note(section,'선택 기간에 내가 참여한 기록이 없습니다.');return section;}
 const best=rows.filter(row=>row.expected!==null&&row.me.rate!==null&&row.me.known>=5).sort((a,b)=>(b.me.rate-b.expected)-(a.me.rate-a.expected))[0];
 if(best&&percent(best.me.rate-best.expected)>0){const callout=el('p',undefined,'mode-score-best');callout.append('가장 강한 방식은 ',el('strong',best.label),` · 기대보다 +${percent(best.me.rate-best.expected)}%p`);section.append(callout);}
 for(const row of rows){
  const rate=row.me.rate,word=row.coop?'성공':row.mode==='rank'?'1위':'승리',item=el('div',undefined,'mode-score'),head=el('div',undefined,'mode-score-head');head.append(el('span',row.label,'mode-score-label'),el('span',`${row.count}판`,'mode-score-count'));
  const value=el('div',undefined,'mode-score-value'),track=el('div',undefined,'mode-score-track'),fill=el('span',undefined,'mode-score-fill');fill.style.width=`${rate===null?0:percent(rate)}%`;track.append(fill);
  if(row.expected!==null){const mark=el('span',undefined,'mode-score-mark');mark.style.left=`${percent(row.expected)}%`;track.append(mark);}
  track.setAttribute('role','img');track.setAttribute('aria-label',rate===null?'결과 미입력':`${word}률 ${percent(rate)}%${row.expected===null?'':`, 기대 ${percent(row.expected)}%`}`);
  value.append(el('strong',rate===null?'–':`${percent(rate)}%`,'mode-score-rate'),track);
  const foot=el('div',undefined,'mode-score-foot');foot.append(el('span',rate===null?'결과 미입력':[`${word} ${row.me.wins}회`,...(row.coop?[`실패 ${row.me.losses}회`]:row.me.draws?[`무승부 ${row.me.draws}회`]:[])].join(' · ')));
  if(rate!==null&&row.expected!==null){const diff=percent(rate-row.expected);foot.append(el('span',`기대 ${percent(row.expected)}% ${diff>0?'+':diff<0?'−':'±'}${Math.abs(diff)}%p`,'mode-score-chip'+(diff>0?' up':diff<0?' down':'')));}
  item.append(head,value,foot);section.append(item);
 }
 if(rows.some(row=>row.expected!==null))note(section,'기대 승률은 경기 인원(팀전은 팀 수)으로 나눈 평균 확률이며 막대의 노란 세로선입니다.');
 return section;
}
export function renderOverview(container,records,{scope,view,onGame,onRecord,bggCollection=[],title='지금까지의 플레이',footnote='저장된 전체 기록과 BGG 컬렉션 기준입니다.',rivals=true,summary=true}){
 container.replaceChildren();const profile=readIdentity(scope),day=latestPlayDate(records),subset=view==='recent'?records.filter(p=>p.date===day):records,s=overviewStats(subset,profile);
 const hero=el('section',undefined,'insight-hero overview-summary'),heading=el('div',undefined,'overview-summary-heading');heading.append(el('h2',view==='recent'?(day?formatRecentRecordTitle(day):'최근 게임기록'):title));hero.append(heading);
 if(!s.total&&view==='recent'){note(hero,'저장된 게임 기록이 없습니다.');const link=el('a','기록 가져오기','insight-link');link.href='#settings';hero.append(link);container.append(hero);return;}
 if(view==='recent'){hero.className+=' recent-summary';const share=el('button','공유하기','stats-share-trigger');share.type='button';share.onclick=async()=>{share.disabled=true;try{await openRecentShare(records,profile);}finally{share.disabled=false;}};heading.append(share);metrics(hero,[[s.total,'플레이한 게임 수'],[attendanceCount(subset,profile),'함께한 인원 수']]);hero.setAttribute('title','게임 수는 경기 수, 인원은 나를 포함해 같은 이름을 중복 제외합니다. 익명은 경기당 최대 인원 기준입니다.');}else{metrics(hero,[[s.gameCount,'플레이한 게임'],[bggCollection.filter(game=>game.owned).length,'보유게임'],[bggCollection.filter(game=>game.wishlist||game.wantToPlay).length,'하고 싶은 게임']]);note(hero,footnote);}if(summary)container.append(hero);if(!s.total)return;
 if(view==='all')container.append(modeScoreCard(subset,profile));
 if(view==='recent')renderHighlights(container,records,profile,onRecord);
 if(view==='all'){
  if(rivals)renderRivals(container,records,profile,onRecord);
  const card=el('section',undefined,'insight-card overview-types');card.append(el('h3','어떤 게임을 했을까'));
  for(const group of typeGroups){const list=s.games.filter(g=>groupOf(g)===group);if(!list.length)continue;const row=el('details',undefined,'type-group'),head=el('summary',undefined,'type-count-row'),track=el('span',undefined,'type-track'),bar=el('span',undefined,'type-fill type-'+group.types[0]),items=el('div',undefined,'type-group-games');bar.style.width=`${list.length/s.gameCount*100}%`;track.setAttribute('aria-hidden','true');track.append(bar);head.append(el('span',group.label),el('strong',`${num(list.length)}개`),track);for(const g of list){const button=el('button',undefined,'type-game-row');button.type='button';button.append(el('span',g.game.name),el('span',`${num(g.count)}회`));button.onclick=()=>onGame(g.key);items.append(button);}row.append(head,items);card.append(row);}container.append(card);
 }
 const games=el('section',undefined,'insight-card overview-games');games.append(el('h3',view==='recent'?'이날 플레이한 게임':'많이 플레이한 게임'));
 for(const group of s.games.slice(0,view==='recent'?s.games.length:8)){const button=el('button',undefined,'overview-game-row'),cover=el('span',undefined,'overview-game-art');button.type='button';renderGameArtwork(cover,group.game);const text=el('span',undefined,'overview-game-name');text.append(el('strong',group.game.name),el('small',[...group.types].map(t=>typeLabels[t]).join(' · ')));button.append(cover,text,el('span',`${num(group.count)}회`));button.onclick=()=>onGame(group.key);games.append(button);}container.append(games);
 const criteria=el('details',undefined,'stats-methods');criteria.append(el('summary','집계 기준'));note(criteria,'플레이 횟수는 저장된 경기 수 기준입니다. 내 우승은 내 플레이어와 승자가 확인된 경쟁 경기만 세며 공동 승리도 포함합니다. 협동 게임은 개인 우승 횟수에서 제외합니다.');if(view==='all')note(criteria,'게임 분류는 서로 다른 게임 수 기준이며, BGG 유형이 여러 개인 게임은 추리 → 협동 → 전략 → 가족/파티 → 스포츠 순으로 한 묶음에만 넣습니다. 협동은 BGG의 Cooperative Game 메커니즘 기준입니다. BGG 정보가 없는 게임은 미분류로 표시합니다.');container.append(criteria);
}
function highlightRow(card,play,title,detail,onRecord){const button=el('button',undefined,'overview-game-row');button.type='button';const text=el('span',undefined,'overview-game-name');text.append(el('strong',title),el('small',play.game.name+' · '+detail));button.append(text);button.onclick=()=>onRecord(play.id);card.append(button);}
function renderHighlights(container,records,profile,onRecord){
 const data=recentHighlights(records,profile),winners=el('section',undefined,'insight-card');winners.append(el('h3','이날의 승자'));for(const {play,players}of data.winners)highlightRow(winners,play,players.map(p=>p.anonymous?'익명의 플레이어':p.name).join(' · '),recordMode(play)==='team'?[...new Set(players.map(p=>p.teamName))].join(' · ')+' 승리':players.length>1?'공동 우승':'우승',onRecord);if(!data.winners.length)note(winners,'승자를 확인할 수 있는 경쟁 경기 기록이 없습니다.');container.append(winners);
 const close=el('section',undefined,'insight-card');close.append(el('h3','가장 접전이었던 경기'));for(const {play,gap}of data.closest)highlightRow(close,play,gap===0?'공동 1위':gap.toLocaleString('ko-KR')+'점 차이','1·2위 점수 차이',onRecord);if(!data.closest.length)note(close,'전체 점수와 승자를 확인할 수 있는 경기가 없습니다.');else note(close,'게임마다 점수 체계가 달라 단순 점수 차이로 비교합니다.');container.append(close);
 const best=el('section',undefined,'insight-card');best.append(el('h3','개인 최고점'));for(const {play,me,improved}of data.personal)highlightRow(best,play,me.score.toLocaleString('ko-KR')+'점', (play.rule==='lowest'?'이날 최저점':'이날 최고점')+(improved?' · 개인 기록 갱신':''),onRecord);if(!data.personal.length)note(best,'내 플레이어와 점수가 지정된 경쟁 기록이 필요합니다.');else note(best,'이날의 내 최고 성적을 게임별로 표시합니다. 낮은 점수 승리 게임은 최저점 기준입니다.');container.append(best);
}
// 게임별 통계: 선택한 게임 기록만으로 나의 라이벌 카드를 덧붙입니다.
// 게임별 통계 · 나의 라이벌 아래에 BGG에 등록된 이 게임의 확장판을 보여 줍니다(BGG 게임 정보를 받아 둔 경우).
// 확장별 사용 횟수는 이 게임 기록의 expansions로 셉니다. 사용한 확장을 먼저 보여 줍니다.
export function renderGameExpansions(container,game,collection=[],plays=[]){const all=(metadata(game)?.expansions||[]).filter(x=>!/promo|프로모/i.test(x.name));if(!all.length)return;const used=new Map();let withAny=0;for(const p of plays){if(!Array.isArray(p.expansions)||!p.expansions.length)continue;withAny++;for(const x of p.expansions){const u=used.get(x.id)||{count:0,last:''};u.count++;if(p.date>u.last)u.last=p.date;used.set(x.id,u);}}const list=[...all].sort((a,b)=>(used.get(b.id)?.count||0)-(used.get(a.id)?.count||0));const mine=new Map(collection.map(item=>[String(item.id),item])),card=el('section',undefined,'insight-card expansion-card'),items=el('ul',undefined,'expansion-list');if(card.style)card.style.marginTop='14px';{const head=el('div',undefined,'expansion-card-head');head.append(el('h3','확장판'));if(plays.length)head.append(el('span',`기록 ${plays.length}회 중 ${withAny}회 사용`,'expansion-card-usage'));card.append(head);}
 for(const expansion of list.slice(0,30)){const row=el('li'),link=el('a',gameNames({name:expansion.name,bggId:expansion.id}).ko,'expansion-link'),status=mine.get(expansion.id),tags=[status?.owned?'보유':'',status?.wishlist?'위시':'',status?.wantToPlay?'하고 싶은':''].filter(Boolean),use=used.get(expansion.id),text=el('div',undefined,'expansion-text'),meta=[tags.join(' · '),use?'마지막 '+use.last:''].filter(Boolean).join(' · ');link.href='https://boardgamegeek.com/boardgame/'+expansion.id;link.target='_blank';link.rel='noopener noreferrer';text.append(link);if(meta)text.append(el('span',meta,'expansion-tag'));row.append(text,el('span',use?use.count+'회':status?.owned?'미사용':'—','expansion-count'+(use?' used':'')));items.append(row);}
 card.append(items);if(list.length>30)note(card,`외 ${list.length-30}개는 BGG에서 확인할 수 있습니다.`);const lastDetails=node=>{let hit=null;for(const child of [...(node.children||[])]){if(child.tagName==='DETAILS')hit=child;hit=lastDetails(child)||hit;}return hit;};const methods=lastDetails(container);if(methods?.parentNode?.insertBefore)methods.parentNode.insertBefore(card,methods);else container.append(card);}
export function renderGameRivals(container,records,{scope,onRecord}){const box=el('div');renderRivals(box,records,readIdentity(scope),onRecord);const card=[...(box.children||[])][0]||box.firstChild;if(!card)return;if(card.style)card.style.marginTop='14px';const lastDetails=node=>{let hit=null;for(const child of [...(node.children||[])]){if(child.tagName==='DETAILS')hit=child;hit=lastDetails(child)||hit;}return hit;};const methods=lastDetails(container);if(methods?.parentNode?.insertBefore)methods.parentNode.insertBefore(card,methods);else container.append(card);}
function renderRivals(container,records,profile,onRecord){
 const rivals=rivalStats(records,profile),card=el('section',undefined,'insight-card rival-card');card.append(el('h3','나의 라이벌'));
 const select=el('select'),body=el('div'),placeholder=el('option','플레이어 선택');placeholder.value='';select.append(placeholder);select.setAttribute('aria-label','함께한 플레이어 선택');for(const r of rivals){const option=el('option',r.name+' · 함께 '+r.met+'회');option.value=r.key;select.append(option);}select.value='';select.disabled=!rivals.length;
 const draw=()=>{const r=rivals.find(x=>x.key===select.value);body.replaceChildren();if(!r){note(body,rivals.length?'함께한 플레이어를 선택하면 전적과 최근 대결을 볼 수 있습니다.':'이름이 있는 상대와의 경기를 저장하면 전적을 볼 수 있습니다.');return;}metrics(body,[[r.met,'함께한 경기'],[r.ahead,'내가 앞섬'],[r.behind,'상대가 앞섬'],[r.tied,'동점']]);if(r.unknown)note(body,'비교할 수 없는 경기 '+r.unknown+'회');body.append(el('h4','최근 대결'));for(const entry of r.recent){const names={ahead:'내가 앞섬',behind:'상대가 앞섬',tied:'동점',unknown:'비교 불가'},score=p=>p.score===null?'—':p.score.toLocaleString('ko-KR');highlightRow(body,entry.play,entry.play.date+' · '+names[entry.result],'나 '+score(entry.me)+' : '+score(entry.opponent)+' '+r.name,onRecord);}};select.onchange=draw;draw();card.append(select,body);if(rivals.length)note(card,'다인 경기도 나와 상대의 순위를 비교합니다. 기록 순위를 우선하고, 없으면 승리 조건에 따른 점수를 비교합니다. 협동 경기와 익명 상대는 제외합니다.');container.append(card);
}
