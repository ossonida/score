import {frequencyBuckets,recordsInPeriod,summarizePeriod,yearlyCounts} from './period-stats.js?v=4';

const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const rangeLabel=period=>`${period.start} ~ ${period.end}`;
const difference=(value,previous,unit,label)=>value===previous?'변화 없음':`${label} 대비 ${value>previous?'+':''}${value-previous}${unit}`;

function metrics(container,current,previous,label){const row=el('div',undefined,'period-metrics');for(const [key,title,unit]of [['plays','플레이 횟수','회'],['days','플레이한 날','일'],['games','서로 다른 게임','개']]){const card=el('article',undefined,'period-metric');card.append(el('span',title),el('strong',`${current[key].toLocaleString('ko-KR')}${unit}`));if(previous)card.append(el('small',difference(current[key],previous[key],unit,label)));row.append(card);}container.append(row);}
function bars(title,items,labelFor){const section=el('section',undefined,'insight-card period-chart'),heading=el('h3',title),max=Math.max(1,...items.map(item=>item.count)),chart=el('div',undefined,'period-bars');chart.setAttribute('role','img');chart.setAttribute('aria-label',items.length?items.map(item=>`${labelFor(item)} ${item.count}회`).join(', '):`${title}: 기록 없음`);for(const item of items){const column=el('div',undefined,'period-bar-column'),track=el('span',undefined,'period-bar-track'),bar=el('span',undefined,'period-bar');bar.style.height=`${item.count/max*100}%`;bar.classList.toggle('is-empty',!item.count);track.append(bar);column.append(el('strong',String(item.count)),track,el('small',item.label||item.year));chart.append(column);}section.append(heading,chart);return section;}

export function renderPeriodDashboard(container,records,model){
 container.replaceChildren();const selected=recordsInPeriod(records,model.current),current=summarizePeriod(records,model.current),previous=model.previous?summarizePeriod(records,model.previous):null;
 const hero=el('section',undefined,'insight-hero period-summary'),head=el('div',undefined,'period-summary-head');head.append(el('h2',model.title),el('p',rangeLabel(model.current),'period-range'));hero.append(head);metrics(hero,current,previous,model.label);container.append(hero);
 if(!selected.length){container.append(el('p','선택한 기간에 저장된 기록이 없습니다.','insight-empty'));return;}
 const frequency=frequencyBuckets(records,model.current,{all:model.preset==='all'});container.append(bars('플레이 빈도',frequency.buckets,item=>`${item.start}~${item.end}`));
 if(model.preset==='all'){const years=yearlyCounts(selected).map(item=>({...item,label:item.year}));container.append(bars('연도별 추이',years,item=>item.year+'년'));}
}
