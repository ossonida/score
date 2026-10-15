import {renderPersonalGame} from './personal-dashboard.js';
import {summarizeStats} from './stats-insights.js';
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const number=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
export function renderStatsDashboard(container,records,today,onOpen,selectedGame=false,options={}){
 if(selectedGame){renderPersonalGame(container,records,onOpen,options);return;}
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
