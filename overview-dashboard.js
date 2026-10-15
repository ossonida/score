import {gameKey} from './records-core.js?v=23';
import {overviewStats,latestPlayDate,typeLabels,readGameTypes,gameType,saveGameType} from './stats-overview.js?v=23';
import {readIdentity,meIn} from './personal-stats.js?v=23';
import {renderGameArtwork} from './game-artwork.js?v=23';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const num=n=>n===null?'—':n.toLocaleString('ko-KR');
function metrics(box,values){const row=el('div',undefined,'insight-metrics');for(const [value,label]of values){const cell=el('div');cell.append(el('strong',num(value)),el('span',label));row.append(cell);}box.append(row);}
function note(box,text){box.append(el('p',text,'insight-footnote'));}
export function renderOverview(container,records,{scope,view,onGame,onRecord}){
 container.replaceChildren();const profile=readIdentity(scope),overrides=readGameTypes(scope),day=latestPlayDate(records),subset=view==='recent'?records.filter(p=>p.date===day):records,s=overviewStats(subset,profile,overrides);
 const hero=el('section',undefined,'insight-hero overview-summary');hero.append(el('h2',view==='recent'?(day||'최근 기록'):'지금까지의 플레이'));
 if(!s.total){note(hero,'저장된 게임 기록이 없습니다.');const link=el('a','기록 가져오기','insight-link');link.href='#settings';hero.append(link);container.append(hero);return;}
 metrics(hero,[[s.total,'플레이 횟수'],[s.wins,'내 우승 횟수'],[s.gameCount,'게임 종류']]);note(hero,view==='recent'?'가장 최근 플레이한 날짜의 기록입니다.':'저장된 전체 기록 기준입니다.');container.append(hero);
 if(s.unassigned){const hint=el('div',undefined,'stats-self-hint');note(hint,`내 플레이어 미지정 ${num(s.unassigned)}경기 · 우승은 내 플레이어가 지정된 경쟁 기록에서 집계합니다.`);const button=el('button','내 플레이어 지정','insight-link');button.type='button';button.onclick=()=>onRecord(subset.find(p=>!meIn(p,profile))?.id||subset[0].id);hint.append(button);container.append(hint);}
 if(view==='all'){
  const card=el('section',undefined,'insight-card overview-types');card.append(el('h3','어떤 게임을 했을까'));
  for(const [type,label]of Object.entries(typeLabels)){const row=el('div',undefined,'type-count-row'),track=el('span',undefined,'type-track'),bar=el('span',undefined,'type-fill type-'+type);bar.style.width=`${s.types[type]/s.total*100}%`;track.setAttribute('aria-hidden','true');track.append(bar);row.append(el('span',label),el('strong',`${num(s.types[type])}건`),track);card.append(row);}container.append(card);
  if(s.types.unknown){const button=el('button',`미분류 ${s.types.unknown}건 · 분류 확인하기`,'insight-link');button.type='button';button.onclick=()=>onGame(s.games.find(g=>g.types.has('unknown')).key);card.append(button);}
 }
 const games=el('section',undefined,'insight-card overview-games');games.append(el('h3',view==='recent'?'이날 플레이한 게임':'많이 플레이한 게임'));
 for(const group of s.games.slice(0,view==='recent'?s.games.length:8)){const button=el('button',undefined,'overview-game-row'),cover=el('span',undefined,'overview-game-art');button.type='button';renderGameArtwork(cover,group.game);const text=el('span',undefined,'overview-game-name');text.append(el('strong',group.game.name),el('small',[...group.types].map(t=>typeLabels[t]).join(' · ')));button.append(cover,text,el('span',`${num(group.count)}회`));button.onclick=()=>onGame(group.key);games.append(button);}container.append(games);
 const criteria=el('details',undefined,'stats-methods');criteria.append(el('summary','집계 기준'));note(criteria,'플레이 횟수와 게임 분류는 저장된 경기 수 기준입니다. 내 우승은 내 플레이어와 승자가 확인된 경쟁 경기만 세며 공동 승리도 포함합니다. 협동 게임은 개인 우승 횟수에서 제외합니다.');if(view==='all')note(criteria,'분류는 수동 지정 → 협동 → 전략 → 가족·파티 → 기타 순서로 한 경기당 하나만 적용합니다. BGG 기본 목록 밖의 게임은 미분류로 표시하며 게임별 통계에서 변경할 수 있습니다. 수동 분류는 이 기기에 계정별로 저장됩니다.');container.append(criteria);
}
export function renderGameTypeEditor(container,records,scope,onChange){
 container.replaceChildren();if(!records.length)return;const overrides=readGameTypes(scope),game=records[0].game,details=el('details',undefined,'stats-game-type'),current=gameType(records[0],overrides);details.append(el('summary','게임 분류 · '+typeLabels[current]));const label=el('label','이 게임의 분류'),select=el('select');select.setAttribute('aria-label',game.name+' 게임 분류');for(const [value,text]of [['auto','자동 분류'],...Object.entries(typeLabels).filter(([key])=>key!=='unknown')]){const option=el('option',text);option.value=value;select.append(option);}select.value=overrides[gameKey(game)]||'auto';const status=el('p');status.setAttribute('role','status');select.onchange=()=>{try{saveGameType(scope,game,select.value);onChange();}catch{status.textContent='분류를 저장하지 못했습니다.';}};label.append(select);details.append(label,status);container.append(details);
}
