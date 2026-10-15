import {summarizeStats,summarizeGame} from './stats-insights.js';
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const number=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
export function renderStatsDashboard(container,records,today,onOpen,selectedGame=false){
 if(selectedGame){renderGameDashboard(container,records,onOpen);return;}
 const s=summarizeStats(records,today);container.replaceChildren();
 const hero=element('section',undefined,'insight-hero');hero.append(element('p',s.day===today?'TODAY’S PLAY':'LATEST PLAY','insight-kicker'),element('h2',s.day===today?'오늘, 우리의 게임':`${s.day} · 함께한 게임`),element('p',s.total?`총 ${number(s.total)}개의 기록에서 찾은 플레이 이야기`:'첫 게임을 기록하면 우리의 이야기가 시작됩니다.','insight-subtitle'));
 const metrics=element('div',undefined,'insight-metrics');for(const [value,label]of[[s.dayCount,'플레이'],[s.gameCount,'게임'],[s.playerCount,'함께한 사람']]){const metric=element('div');metric.append(element('strong',number(value)),element('span',label));metrics.append(metric);}hero.append(metrics);
 if(s.day!==today&&s.total)hero.append(element('p','오늘은 아직 기록이 없어 최근 플레이한 날을 보여드려요.','insight-footnote'));
 if(s.leaders.length){const leaders=element('div',undefined,'day-leaders');leaders.append(element('span','이날의 승리'));for(const person of s.leaders)leaders.append(element('span',`${person.name} ${person.wins}승`,'leader-chip'));hero.append(leaders);}container.append(hero);
 if(!s.total){const empty=element('section',undefined,'insight-empty');empty.append(element('h3','다음 게임에서 기억할 순간을 남겨보세요'),element('p','게임 종료 후 기록하면 접전 경기와 개인 기록, 함께한 상대의 전적을 여기서 볼 수 있습니다.'));container.append(empty);return;}
 const grid=element('div',undefined,'insight-grid');
 function card(kicker,title,cls){const e=element('article',undefined,'insight-card '+(cls||''));e.append(element('p',kicker,'insight-kicker'),element('h3',title));return e;}
 function openButton(card,play){const button=element('button','이 경기 보기 ↗','insight-link');button.type='button';button.onclick=()=>onOpen(play.id);card.append(button);}
 const close=card('CLOSE GAME','작은 차이가 만든 승부','insight-close');
 if(s.closest){const {play,first,second,gap}=s.closest;close.append(element('p',play.game.name,'insight-game'),element('div',gap===0?'점수 동점':`${number(gap)}점 차`,'insight-number'));
 const row=element('div',undefined,'match-scores');for(const person of [first,second]){const col=element('div');col.append(element('span',person.name),element('strong',number(person.score)+'점'));row.append(col);}close.append(row,element('p','선택한 날의 1·2위 점수차가 가장 작은 경기입니다. 게임마다 점수 척도는 다릅니다.','insight-footnote'));openButton(close,play);
 }else close.append(element('p','접전은 점수와 승자를 확인할 수 있는 경쟁 게임에서 찾아드려요.','insight-subtitle'));grid.append(close);
 const recordsCard=card(s.improved.length?'NEW PERSONAL BEST':'PERSONAL BEST',s.improved.length?'자신의 기록을 넘어섰어요':'게임마다 남긴 개인 기록','insight-best');
 const bests=s.improved.length?s.improved:s.personalBests;
 if(!bests.length)recordsCard.append(element('p','점수가 있는 경쟁 게임을 기록하면 게임별 개인 최고·최저점을 보여드려요.','insight-subtitle'));
 for(const best of bests){const row=element('div',undefined,'personal-best-row'),description=element('div');description.append(element('strong',best.name),element('span',best.play.game.name));const result=element('div',undefined,'personal-best-result');result.append(element('strong',number(best.score)+'점'),element('span',best.improvement?`이전 날짜 기록보다 ${number(best.improvement)}점 ${best.play.rule==='lowest'?'낮음':'높음'}`:best.play.rule==='lowest'?'개인 최저점':'개인 최고점'));row.append(description,result);recordsCard.append(row);}if(bests.length)openButton(recordsCard,bests[0].play);grid.append(recordsCard);
 const rival=card('HEAD TO HEAD','다시 만나고 싶은 라이벌','insight-rival');
 if(s.rival){const r=s.rival;rival.append(element('p',`${r.game.name} · 둘이 함께한 ${r.count}경기`,'insight-game'));const score=element('div',undefined,'rival-score');for(let i=0;i<2;i++){const person=element('div');person.append(element('span',r.names[i]),element('strong',`${r.wins[i]}승`));score.append(person);}rival.append(score);
 const bar=element('div',undefined,'rival-bar');bar.setAttribute('role','img');bar.setAttribute('aria-label',`${r.names[0]} ${r.wins[0]}승, ${r.names[1]} ${r.wins[1]}승, 공동 승리 ${r.draws}경기`);for(const [i,value]of[r.wins[0],r.draws,r.wins[1]].entries()){if(!value)continue;const part=element('span',undefined,'rival-segment segment-'+i);part.style.flex=String(value);bar.append(part);}rival.append(bar,element('p',`공동 승리 ${r.draws}경기 · 승자가 기록된 2인 경쟁 게임만 집계합니다.`,'insight-footnote'));
 }else rival.append(element('p','같은 게임을 같은 두 사람이 두 번 이상 플레이하면 상대 전적이 나타납니다. 협력 게임과 승자 없는 기록은 제외합니다.','insight-subtitle'));grid.append(rival);container.append(grid);
}

function renderGameDashboard(container,records,onOpen){
 const selectedPlayer=container.querySelector('.game-trend select')?.value;const s=summarizeGame(records);container.replaceChildren();
 const hero=element('section',undefined,'insight-hero');hero.append(element('p','GAME OVERVIEW','insight-kicker'),element('h2',s.game?.name||'게임 통계'),element('p',s.total?`${s.first} ~ ${s.last} · 전체 기간`:'아직 기록이 없습니다.','insight-subtitle'));
 const metrics=element('div',undefined,'insight-metrics');for(const [value,label]of[[s.total,'총 플레이'],[s.days,'플레이한 날'],[s.people,'함께한 사람']]){const box=element('div');box.append(element('strong',number(value)),element('span',label));metrics.append(box);}hero.append(metrics);container.append(hero);if(!s.total)return;
 const section=element('section',undefined,'insight-card game-performances');section.append(element('h3','이 게임에서 우리의 성적'),element('p','평균은 점수가 있는 기록만, 승률은 승자가 확인되는 경쟁 경기만 계산합니다. 공동 승리도 승리에 포함됩니다.','insight-footnote'));
 const grid=element('div',undefined,'game-player-grid');
 const ruleLabel=r=>r==='lowest'?'낮은 점수 승리':r==='cooperative'?'협력 게임':'높은 점수 승리';
 for(const p of s.players){const row=element('article',undefined,'game-player-card');row.append(element('h4',p.name),element('p',`${p.count}회 참여 · ${ruleLabel(p.rule)}`,'insight-footnote'));const values=element('dl',undefined,'game-player-values');
  for(const [label,value]of[['승률',p.rate===null?'—':number(p.rate*100)+'%'],['평균 점수',p.average===null?'—':number(p.average)], [p.rule==='lowest'?'개인 최저점':p.rule==='cooperative'?'가장 높은 점수':'개인 최고점',p.best===null?'—':number(p.best)]]){const cell=element('div');cell.append(element('dt',label),element('dd',value));values.append(cell);}row.append(values,element('p',p.rule==='cooperative'?'협력 게임은 개인 승률을 집계하지 않습니다.':`${p.wins}승 / 승자가 확인된 ${p.known}회 · 점수 기록 ${p.scores.length}회`,'insight-footnote'));grid.append(row);
 }section.append(grid);container.append(section);
 const trend=element('section',undefined,'insight-card game-trend');trend.append(element('h3','내 점수 흐름과 최근 경기'));const select=element('select');select.setAttribute('aria-label','점수 흐름을 볼 플레이어');for(const p of s.players){const option=element('option',`${p.name} · ${ruleLabel(p.rule)}`);option.value=p.key;select.append(option);}if(s.players.some(p=>p.key===selectedPlayer))select.value=selectedPlayer;trend.append(select);const chart=element('div',undefined,'game-score-history');trend.append(chart);
 function draw(){const p=s.players.find(p=>p.key===select.value)||s.players[0];chart.replaceChildren();const scored=p.recent.filter(x=>typeof x.score==='number'),last=scored.at(-1),previous=scored.slice(0,-1),average=previous.length?previous.reduce((sum,x)=>sum+x.score,0)/previous.length:null;
  if(last&&average!==null){const delta=last.score-average,better=p.rule==='lowest'?delta<0:delta>0;chart.append(element('p',`최근 점수 ${number(last.score)}점 · 이전 ${previous.length}경기 평균 ${number(average)}점`,'insight-subtitle'),element('p',delta===0?'이전 평균과 같은 점수예요':`이전 평균보다 ${number(Math.abs(delta))}점 ${delta>0?'높아요':'낮아요'}${p.rule==='cooperative'?'':better?' · 좋은 흐름이에요':' · 다음 경기를 기대해봐요'}`,'growth-summary'));}
  else chart.append(element('p',last?'점수가 있는 경기가 더 쌓이면 이전 평균과 비교할 수 있어요.':'저장된 점수가 없어 아직 점수 흐름을 보여드릴 수 없어요.','insight-subtitle'));
  chart.append(element('p','최근 최대 8경기 · 같은 날 경기는 저장 순서가 실제 플레이 순서와 다를 수 있습니다.','insight-footnote'));const scores=p.recent.filter(x=>typeof x.score==='number').map(x=>Math.abs(x.score)),max=Math.max(1,...scores);
  for(const game of [...p.recent].reverse()){const button=element('button',undefined,'game-score-row');button.type='button';button.setAttribute('aria-label',`${game.date} · ${game.score===null?'점수 없음':number(game.score)+'점'} · 경기 보기`);button.append(element('span',game.date),element('strong',game.score===null?'점수 없음':number(game.score)+'점'),element('small',game.won?'승리':game.known?'':'승패 미집계'));if(typeof game.score==='number'){const bar=element('span',undefined,'game-score-bar');bar.style.width=`${Math.abs(game.score)/max*100}%`;bar.setAttribute('aria-hidden','true');button.append(bar);}button.onclick=()=>onOpen(game.id);chart.append(button);}
 }select.onchange=draw;draw();container.insertBefore(trend,section);
}
