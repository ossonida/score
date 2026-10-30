import {frequencyBuckets,recordsInPeriod,summarizePeriod,yearlyCounts} from './period-stats.js?v=5';
import {firstPlays,placeCounts,milestones,playDays,milestoneTitle} from './stats-extras.js?v=3';
import {readIdentity} from './personal-stats.js?v=117';
import {openRecapShare} from './recap-share.js?v=13';

const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const rangeLabel=period=>`${period.start} ~ ${period.end}`;
const difference=(value,previous,unit,label)=>value===previous?'변화 없음':`${label} 대비 ${value>previous?'+':''}${value-previous}${unit}`;
const DAY=86400000,utc=date=>{const [y,m,d]=date.split('-').map(Number);return Date.UTC(y,m-1,d);},iso=time=>new Date(time).toISOString().slice(0,10);
const md=date=>`${Number(date.slice(5,7))}/${Number(date.slice(8))}`;
// 요일·달 이름은 한 글자 사전 번역과 겹치므로 언어별로 직접 쓴다.
const english=()=>globalThis.ScoreI18n?.lang==='en',weekdays=()=>english()?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['일','월','화','수','목','금','토'],monthName=month=>english()?['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]:`${month}월`;

function metrics(container,current,previous,label){const row=el('div',undefined,'period-metrics');for(const [key,title,unit]of [['plays','플레이 횟수','회'],['days','플레이한 날','일'],['games','서로 다른 게임','개']]){const card=el('article',undefined,'period-metric');card.append(el('span',title),el('strong',`${current[key].toLocaleString('ko-KR')}${unit}`));if(previous)card.append(el('small',difference(current[key],previous[key],unit,label)));row.append(card);}container.append(row);}
function bars(title,items,labelFor){const section=el('section',undefined,'insight-card period-chart'),heading=el('h3',title),max=Math.max(1,...items.map(item=>item.count)),chart=el('div',undefined,'period-bars');chart.setAttribute('role','img');chart.setAttribute('aria-label',items.length?items.map(item=>`${labelFor(item)} ${item.count}회`).join(', '):`${title}: 기록 없음`);for(const item of items){const column=el('div',undefined,'period-bar-column'),track=el('span',undefined,'period-bar-track'),bar=el('span',undefined,'period-bar');bar.style.height=`${item.count/max*100}%`;bar.classList.toggle('is-empty',!item.count);track.append(bar);column.append(el('strong',String(item.count)),track,el('small',item.label||item.year));chart.append(column);}section.append(heading,chart);return section;}
function card(title,right){const section=el('section',undefined,'insight-card'),head=el('div',undefined,'opponent-head');head.append(el('h3',title));if(right)head.append(el('span',right,'opponent-summary'));section.append(head);return section;}
function row(section,title,detail,onClick){const button=el('button',undefined,'overview-game-row'),text=el('span',undefined,'overview-game-name');button.type='button';text.append(el('strong',title),el('small',detail));button.append(text);button.onclick=onClick;section.append(button);}

// 플레이 달력: 62일 이하는 요일 7칸 달력, 366일 이하는 달마다 한 줄(1~31일). 칸 색은 그날 판 수(가장 많이 한 날 기준 4단계).
function calendar(subset,selected){
 const {counts,busiest,streak}=playDays(subset),max=Math.max(1,...counts.values()),start=utc(selected.start),end=utc(selected.end),length=Math.round((end-start)/DAY)+1;
 const section=el('section',undefined,'insight-card play-calendar'),level=count=>count?String(Math.min(4,Math.ceil(count/max*4))):'0';section.append(el('h3','플레이 달력'));
 const cell=(date,label)=>{const count=counts.get(date)||0,box=el('span',undefined,'calendar-day');box.setAttribute('data-level',level(count));box.title=`${md(date)} ${count}판`;if(label!==undefined)box.append(el('b',label));if(count&&label!==undefined)box.append(el('small',`${count}판`));return box;};
 if(length<=62){
  const grid=el('div',undefined,'calendar-grid');for(const day of weekdays())grid.append(el('span',day,'calendar-weekday'));
  for(let i=0;i<new Date(start).getUTCDay();i++)grid.append(el('span',undefined,'calendar-blank'));
  for(let time=start;time<=end;time+=DAY){const date=iso(time);grid.append(cell(date,date.endsWith('-01')&&time!==start?md(date):String(Number(date.slice(8)))));}
  section.append(grid);
 }else{
  const months=el('div',undefined,'calendar-months');
  for(let cursor=selected.start.slice(0,7);cursor<=selected.end.slice(0,7);){const [year,month]=cursor.split('-').map(Number),line=el('div',undefined,'calendar-month'),days=el('div',undefined,'calendar-month-days'),last=new Date(Date.UTC(year,month,0)).getUTCDate();line.append(el('span',monthName(month),'calendar-month-label'));for(let day=1;day<=31;day++){const date=`${cursor}-${String(day).padStart(2,'0')}`;days.append(day>last||date<selected.start||date>selected.end?el('span',undefined,'calendar-blank'):cell(date));}line.append(days);months.append(line);cursor=month===12?`${year+1}-01`:`${year}-${String(month+1).padStart(2,'0')}`;}
  section.append(months);
 }
 const facts=el('p',undefined,'calendar-facts');if(busiest)facts.append(el('span',`가장 많이 한 날 ${md(busiest.date)} · ${busiest.count}판`));if(streak>1)facts.append(el('span',`최장 연속 ${streak}일`));section.append(facts);
 return section;
}

function newGames(container,records,selected,onGame){
 const list=firstPlays(records,selected);if(!list.length)return;const section=card('새로 기록한 게임',`${list.length}개`);
 for(const {key,play}of list.slice(0,8))row(section,play.game.name,`${md(play.date)} 첫 기록`,()=>onGame?.(key));
 if(list.length>8)section.append(el('p',`외 ${list.length-8}개`,'insight-footnote'));container.append(section);
}
function places(container,subset){
 const list=placeCounts(subset);if(!list.length)return;const section=card('플레이 장소',`${list.length}곳`),max=list[0].count,box=el('div',undefined,'place-bars');
 for(const {place,count}of list.slice(0,5)){const line=el('div',undefined,'place-bar'),track=el('span',undefined,'place-bar-track'),fill=el('span',undefined,'place-bar-fill');fill.style.width=`${count/max*100}%`;track.append(fill);line.append(el('strong',place),track,el('span',`${count}판`));box.append(line);}
 section.append(box);container.append(section);
}
function achievements(container,records,selected,onRecord){
 const list=milestones(records,selected);if(!list.length)return;const section=card('달성 기록',`${list.length}개`);
 for(const item of list.slice(-8).reverse())row(section,milestoneTitle(item),`${item.play.game.name} · ${md(item.play.date)}`,()=>onRecord?.(item.play.id));
 container.append(section);
}

export function renderPeriodDashboard(container,records,model,{scope,onGame,onRecord}={}){
 container.replaceChildren();const selected=recordsInPeriod(records,model.current),current=summarizePeriod(records,model.current),previous=model.previous?summarizePeriod(records,model.previous):null;
 const hero=el('section',undefined,'insight-hero period-summary'),head=el('div',undefined,'period-summary-head');head.append(el('h2',model.title));
 // 결산 공유: 기록이 있는 기간만, 최근 기록 공유와 같은 창.
 if(selected.length){const share=el('button','결산 공유','stats-share-trigger');share.type='button';share.onclick=async()=>{share.disabled=true;try{await openRecapShare(records,model,readIdentity(scope));}finally{share.disabled=false;}};head.append(share);}
 head.append(el('p',rangeLabel(model.current),'period-range'));hero.append(head);metrics(hero,current,previous,model.label);container.append(hero);
 if(!selected.length){container.append(el('p','선택한 기간에 저장된 기록이 없습니다.','insight-empty'));return;}
 const days=Math.round((utc(model.current.end)-utc(model.current.start))/DAY)+1;
 if(model.preset!=='all'&&days<=366)container.append(calendar(selected,model.current));
 else{const frequency=frequencyBuckets(records,model.current,{all:model.preset==='all'});container.append(bars('플레이 빈도',frequency.buckets,item=>`${item.start}~${item.end}`));}
 if(model.preset==='all'){const years=yearlyCounts(selected).map(item=>({...item,label:item.year}));container.append(bars('연도별 추이',years,item=>item.year+'년'));}
 achievements(container,records,model.current,onRecord);
 if(model.preset!=='all')newGames(container,records,model.current,onGame);
 places(container,selected);
}
