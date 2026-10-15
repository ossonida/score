import {bggId} from './bgg-metadata.js?v=29';
import {recentHighlights,rivalStats} from './social-insights.js?v=29';
import {gameKey} from './records-core.js?v=29';
import {overviewStats,latestPlayDate,typeLabels,gameTypeList,attendanceCount} from './stats-overview.js?v=29';
import {readIdentity,meIn} from './personal-stats.js?v=29';
import {renderGameArtwork} from './game-artwork.js?v=29';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const num=n=>n===null?'—':n.toLocaleString('ko-KR');
function metrics(box,values){const row=el('div',undefined,'insight-metrics');row.setAttribute('data-columns',String(values.length));for(const [value,label]of values){const cell=el('div');cell.append(el('strong',num(value)),el('span',label));row.append(cell);}box.append(row);}
function note(box,text){box.append(el('p',text,'insight-footnote'));}
export function renderOverview(container,records,{scope,view,onGame,onRecord}){
 container.replaceChildren();const profile=readIdentity(scope),day=latestPlayDate(records),subset=view==='recent'?records.filter(p=>p.date===day):records,s=overviewStats(subset,profile);
 const hero=el('section',undefined,'insight-hero overview-summary');hero.append(el('h2',view==='recent'?(day?`${Number(day.slice(5,7))}월 ${Number(day.slice(8,10))}일 함께한 기록`:'최근 기록'):'지금까지의 플레이'));
 if(!s.total){note(hero,'저장된 게임 기록이 없습니다.');const link=el('a','기록 가져오기','insight-link');link.href='#settings';hero.append(link);container.append(hero);return;}
 if(view==='recent'){hero.className+=' recent-summary';metrics(hero,[[s.total,'플레이한 게임 수'],[attendanceCount(subset,profile),'함께한 인원 수']]);hero.setAttribute('title','게임 수는 경기 수, 인원은 나를 포함해 같은 이름을 중복 제외합니다. 익명은 경기당 최대 인원 기준입니다.');}else{metrics(hero,[[s.total,'플레이 횟수'],[s.wins,'내 우승 횟수'],[s.gameCount,'게임 종류']]);note(hero,'저장된 전체 기록 기준입니다.');}container.append(hero);
 if(s.unassigned){const hint=el('div',undefined,'stats-self-hint');note(hint,`내 플레이어 미지정 ${num(s.unassigned)}경기 · 우승은 내 플레이어가 지정된 경쟁 기록에서 집계합니다.`);const button=el('button','이름·닉네임 연결','insight-link');button.type='button';button.onclick=()=>{location.hash='settings';};hint.append(button);container.append(hint);}
 if(view==='recent')renderHighlights(container,records,profile,onRecord);
 if(view==='all'){
  renderRivals(container,records,profile,onRecord);
  const card=el('section',undefined,'insight-card overview-types');card.append(el('h3','어떤 게임을 했을까'));
  for(const [type,label]of Object.entries(typeLabels).filter(([type])=>s.types[type]>0)){const row=el('div',undefined,'type-count-row'),track=el('span',undefined,'type-track'),bar=el('span',undefined,'type-fill type-'+type);bar.style.width=`${s.types[type]/s.total*100}%`;track.setAttribute('aria-hidden','true');track.append(bar);row.append(el('span',label),el('strong',`${num(s.types[type])}건`),track);card.append(row);}container.append(card);
  if(s.types.unknown){const button=el('button',`미분류 ${s.types.unknown}건 · 분류 확인하기`,'insight-link');button.type='button';button.onclick=()=>onGame(s.games.find(g=>g.types.has('unknown')).key);card.append(button);}
 }
 const games=el('section',undefined,'insight-card overview-games');games.append(el('h3',view==='recent'?'이날 플레이한 게임':'많이 플레이한 게임'));
 for(const group of s.games.slice(0,view==='recent'?s.games.length:8)){const button=el('button',undefined,'overview-game-row'),cover=el('span',undefined,'overview-game-art');button.type='button';renderGameArtwork(cover,group.game);const text=el('span',undefined,'overview-game-name');text.append(el('strong',group.game.name),el('small',[...group.types].map(t=>typeLabels[t]).join(' · ')));button.append(cover,text,el('span',`${num(group.count)}회`));button.onclick=()=>onGame(group.key);games.append(button);}container.append(games);
 const criteria=el('details',undefined,'stats-methods');criteria.append(el('summary','집계 기준'));note(criteria,'플레이 횟수와 게임 분류는 저장된 경기 수 기준입니다. 내 우승은 내 플레이어와 승자가 확인된 경쟁 경기만 세며 공동 승리도 포함합니다. 협동 게임은 개인 우승 횟수에서 제외합니다.');if(view==='all')note(criteria,'BGG 유형을 모두 반영하므로 한 경기가 전략·가족 등에 중복 집계될 수 있습니다. 협동은 BGG의 Cooperative Game 메커니즘 기준입니다. BGG 정보가 없는 게임은 미분류로 표시합니다.');container.append(criteria);
}
export function renderGameTypeEditor(container,records){container.replaceChildren();if(!records.length)return;const card=el('div',undefined,'stats-game-type');card.append(el('p','BGG 유형 · '+gameTypeList(records[0]).map(t=>typeLabels[t]).join(' · '),'insight-footnote'));const id=bggId(records[0].game);if(id){const link=el('a','BGG에서 게임 정보 보기','insight-link');link.href='https://boardgamegeek.com/boardgame/'+id;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}if(gameTypeList(records[0]).includes('unknown'))note(card,'BGG 정보가 아직 없습니다. 서버 연결 후 자동으로 가져옵니다.');container.append(card);}
function highlightRow(card,play,title,detail,onRecord){const button=el('button',undefined,'overview-game-row');button.type='button';const text=el('span',undefined,'overview-game-name');text.append(el('strong',title),el('small',play.game.name+' · '+detail));button.append(text);button.onclick=()=>onRecord(play.id);card.append(button);}
function renderHighlights(container,records,profile,onRecord){
 const data=recentHighlights(records,profile),winners=el('section',undefined,'insight-card');winners.append(el('h3','이날의 승자'));for(const {play,players}of data.winners)highlightRow(winners,play,players.map(p=>p.anonymous?'익명의 플레이어':p.name).join(' · '),players.length>1?'공동 우승':'우승',onRecord);if(!data.winners.length)note(winners,'승자를 확인할 수 있는 경쟁 경기 기록이 없습니다.');container.append(winners);
 const close=el('section',undefined,'insight-card');close.append(el('h3','가장 접전이었던 경기'));for(const {play,gap}of data.closest)highlightRow(close,play,gap===0?'공동 1위':gap.toLocaleString('ko-KR')+'점 차이','1·2위 점수 차이',onRecord);if(!data.closest.length)note(close,'전체 점수와 승자를 확인할 수 있는 경기가 없습니다.');else note(close,'게임마다 점수 체계가 달라 단순 점수 차이로 비교합니다.');container.append(close);
 const best=el('section',undefined,'insight-card');best.append(el('h3','개인 최고점'));for(const {play,me,improved}of data.personal)highlightRow(best,play,me.score.toLocaleString('ko-KR')+'점', (play.rule==='lowest'?'이날 최저점':'이날 최고점')+(improved?' · 개인 기록 갱신':''),onRecord);if(!data.personal.length)note(best,'내 플레이어와 점수가 지정된 경쟁 기록이 필요합니다.');else note(best,'이날의 내 최고 성적을 게임별로 표시합니다. 낮은 점수 승리 게임은 최저점 기준입니다.');container.append(best);
}
function renderRivals(container,records,profile,onRecord){
 const rivals=rivalStats(records,profile),card=el('section',undefined,'insight-card');card.append(el('h3','나의 라이벌'));if(!rivals.length){note(card,'내 플레이어를 지정하고 이름이 있는 상대와의 경기를 저장하면 전적을 볼 수 있습니다.');container.append(card);return;}
 const select=el('select'),body=el('div');select.setAttribute('aria-label','라이벌 선택');for(const r of rivals){const option=el('option',r.name+' · 함께 '+r.met+'회');option.value=r.key;select.append(option);}select.value=rivals[0].key;
 const draw=()=>{const r=rivals.find(x=>x.key===select.value);body.replaceChildren();metrics(body,[[r.met,'함께한 경기'],[r.ahead,'내가 앞섬'],[r.behind,'상대가 앞섬'],[r.tied,'동점']]);if(r.unknown)note(body,'비교할 수 없는 경기 '+r.unknown+'회');body.append(el('h4','최근 대결'));for(const entry of r.recent){const names={ahead:'내가 앞섬',behind:'상대가 앞섬',tied:'동점',unknown:'비교 불가'},score=p=>p.score===null?'—':p.score.toLocaleString('ko-KR');highlightRow(body,entry.play,entry.play.date+' · '+names[entry.result],'나 '+score(entry.me)+' : '+score(entry.opponent)+' '+r.name,onRecord);}};select.onchange=draw;draw();card.append(select,body);note(card,'다인 경기도 나와 상대의 순위를 비교합니다. 기록 순위를 우선하고, 없으면 승리 조건에 따른 점수를 비교합니다. 협동 경기와 익명 상대는 제외합니다.');container.append(card);
}
