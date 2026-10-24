import {recordMode,modeLabels,modeStats,resultLabel,winnerIds,missionLabel,missionSummary,gameKey} from './records-core.js?v=127';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const num=n=>n===null||n===undefined?'—':n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const rate=n=>n===null?'—':num(n*100)+'%';
function action(text,label,callback,cls){const b=el('button',text,cls);b.type='button';b.setAttribute('aria-label',label);b.onclick=callback;return b;}
export function renderRecordParticipants(play,me,onEdit){
 const mode=recordMode(play),list=el('ul',undefined,'record-scores record-mode-'+mode);
 const name=p=>action(p.name+(p.id===me?.id?' · 나':''),p.name+' 이름 수정',()=>onEdit(play,p,'name'),'record-edit-name');
 if(mode==='team'){
  for(const id of new Set(play.players.map(p=>p.teamId))){
   const members=play.players.filter(p=>p.teamId===id),first=members[0],row=el('li',undefined,'record-team'),heading=el('div',undefined,'record-team-heading');
   heading.append(el('strong',first.teamName),action(resultLabel(play,first),first.teamName+' 결과 수정',()=>onEdit(play,first,'result'),'record-edit-result'));
   const people=el('div',undefined,'record-team-members');for(const p of members)people.append(name(p));row.append(heading,people);list.append(row);
  }
  return list;
 }
 if(mode==='cooperative'&&Array.isArray(play.missionAttempts)){
  const row=el('li',undefined,'record-cooperative-result record-mission-result');row.append(el('strong',resultLabel(play,play.players[0]),'record-mission-outcome'),el('span',missionLabel(play.missionAttempts),'record-mission-summary'));list.append(row);
 }else if(mode==='cooperative'){
  const row=el('li',undefined,'record-cooperative-result'),first=play.players[0];
  row.append(action(resultLabel(play,first),'협력 전체 결과 수정',()=>onEdit(play,first,'cooperativeResult'),'record-edit-result'),action(play.sharedScore===undefined?'공동 점수 추가':num(play.sharedScore)+'점 · 공동','공동 점수 수정',()=>onEdit(play,first,'sharedScore'),'record-edit-score'));list.append(row);
 }
 const sorted=[...play.players].sort((a,b)=>mode==='rank'?(a.rank??Infinity)-(b.rank??Infinity):['highest','lowest'].includes(mode)?a.score===null?(b.score===null?0:1):b.score===null?-1:mode==='lowest'?a.score-b.score:b.score-a.score:0);
 for(const p of sorted){
  const row=el('li');row.append(name(p));
  if(['highest','lowest','unknown'].includes(mode))row.append(action(p.score===null?'점수 없음':num(p.score)+'점',p.name+' 점수 수정',()=>onEdit(play,p,'score'),'record-edit-score'));
  if(['rank','win','unknown'].includes(mode))row.append(action(resultLabel(play,p),p.name+(mode==='rank'?' 순위 수정':' 결과 수정'),()=>onEdit(play,p,'result'),'record-edit-result'));
  else if(mode!=='cooperative')row.append(el('span',winnerIds(play).includes(p.id)?'우승':'','record-win'));
  list.append(row);
 }
 return list;
}
const byPlayedAt=(a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''));
export function cooperativeStats(plays){
 const sorted=[...plays].sort(byPlayedAt),known=sorted.filter(p=>['success','failure'].includes(p.cooperativeResult)),successes=known.filter(p=>p.cooperativeResult==='success').length;
 const singleGame=new Set(sorted.map(p=>gameKey(p.game))).size===1,scores=sorted.map(p=>p.sharedScore).filter(Number.isFinite);
 const missionPlays=singleGame?sorted.filter(p=>Array.isArray(p.missionAttempts)&&p.missionAttempts.length):[];
 let missions=null;
 if(missionPlays.length){
  const attempts=missionPlays.flatMap(p=>p.missionAttempts),tries=new Map();
  for(const item of attempts)tries.set(item.mission,(tries.get(item.mission)||0)+1);
  const clearedMissions=attempts.filter(item=>item.result==='success').map(item=>item.mission);
  missions={next:missionSummary(missionPlays.at(-1).missionAttempts).next,best:clearedMissions.length?Math.max(...clearedMissions):null,cleared:new Set(clearedMissions).size,attempts:attempts.length,average:attempts.length/tries.size,hardest:[...tries].filter(([,count])=>count>1).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,3).map(([mission,count])=>({mission,count}))};
 }
 return {missionOnly:missionPlays.length===sorted.length,count:sorted.length,known:known.length,successes,failures:known.length-successes,rate:known.length?successes/known.length:null,recent:known.slice(-10).map(p=>p.cooperativeResult),scores:singleGame&&scores.length?{best:Math.max(...scores),average:scores.reduce((a,b)=>a+b,0)/scores.length,latest:scores.at(-1)}:null,missions};
}
function renderCooperativeSummary(section,group,plays){
 const s=cooperativeStats(plays),box=el('div',undefined,'coop-stats'),head=el('div',undefined,'coop-stats-rate'),bar=el('div',undefined,'coop-stats-bar'),fill=el('span');
 // A mission session counts as a success once any mission is cleared, so its success rate says nothing.
 if(!s.missionOnly){head.append(el('strong',rate(s.rate)),el('span','성공률'));fill.style.width=(s.rate===null?0:Math.round(s.rate*100))+'%';bar.append(fill);
 box.append(head,bar,el('p',`성공 ${s.successes}회 · 실패 ${s.failures}회${s.count>s.known?` · 결과 미입력 ${s.count-s.known}회`:''}`,'coop-stats-counts'));}
 if(!s.missionOnly&&s.recent.length){const recent=el('p',undefined,'coop-stats-recent');recent.append(el('span','최근'));for(const result of s.recent)recent.append(el('b',result==='success'?'✓':'✗',result==='success'?'is-success':'is-failure'));box.append(recent);}
 const facts=(title,items)=>{const wrap=el('div',undefined,'coop-stats-block');wrap.append(el('h4',title));const list=el('dl',undefined,'coop-stats-facts');for(const [label,value] of items){const item=el('div');item.append(el('dt',label),el('dd',value));list.append(item);}wrap.append(list);box.append(wrap);return wrap;};
 if(s.scores)facts('공동 점수',[['최고',num(s.scores.best)+'점'],['평균',num(s.scores.average)+'점'],['최근',num(s.scores.latest)+'점']]);
 if(s.missions){const m=s.missions,wrap=facts('미션 진행',[['다음',`미션 ${m.next}부터`],['최고 클리어',m.best?`미션 ${m.best}`:'—'],['클리어',m.cleared+'개'],['시도',m.attempts+'회'],['미션당 평균',num(m.average)+'회']]);if(m.hardest.length)wrap.append(el('p','어려웠던 미션 · '+m.hardest.map(h=>`미션 ${h.mission} (${h.count}회)`).join(' · '),'coop-stats-hardest'));}
 section.append(box);return s.missionOnly&&!!s.missions;
}
export function renderModeStats(container,records){
 for(const group of modeStats(records)){
  const section=el('section',undefined,'record-mode-stats');section.append(el('h3',modeLabels[group.mode]+' · '+group.count+'회'));
  const missionOnly=group.mode==='cooperative'&&renderCooperativeSummary(section,group,records.filter(play=>recordMode(play)==='cooperative'));
  const scored=['highest','lowest'].includes(group.mode),ranked=group.mode==='rank',coop=group.mode==='cooperative',unknown=group.mode==='unknown';
  const labels=ranked?['플레이어','횟수','1위 비율','인원별 평균 순위']:scored?['플레이어','횟수','승률','평균 점수',group.mode==='lowest'?'최저점':'최고점']:unknown?['플레이어','횟수']:coop?['플레이어','참여',...(missionOnly?[]:['함께한 성공률'])]:['플레이어','횟수','승리','무승부','패배','승률'];
  const wrap=el('div',undefined,'record-table-wrap'),table=el('table',undefined,'record-table'),head=el('thead'),hr=el('tr'),body=el('tbody');
  for(const label of labels)hr.append(el('th',label));head.append(hr);table.append(head);
  for(const p of coop?[...group.players].sort((a,b)=>b.count-a.count):group.players){
   const values=ranked?[p.name,p.count,rate(p.rate),p.sizes.map(s=>`${s.size}명 · ${num(s.average)}위 (${s.count}회)`).join(' / ')||'—']:scored?[p.name,p.count,rate(p.rate),num(p.average),num(p.best)]:unknown?[p.name,p.count]:coop?[p.name,p.count,...(missionOnly?[]:[rate(p.rate)])]:[p.name,p.count,p.wins,p.draws,p.losses,rate(p.rate)];
   const row=el('tr');for(const value of values)row.append(el('td',String(value)));body.append(row);
  }
  table.append(body);wrap.append(table);section.append(wrap);container.append(section);
 }
}
