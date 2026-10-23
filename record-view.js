import {recordMode,modeLabels,modeStats,resultLabel,winnerIds,missionLabel} from './records-core.js?v=127';
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
export function renderModeStats(container,records){
 for(const group of modeStats(records)){
  const section=el('section',undefined,'record-mode-stats');section.append(el('h3',modeLabels[group.mode]+' · '+group.count+'회'));
  if(group.mode==='cooperative')section.append(el('p',`성공 ${group.successes}회 · 실패 ${group.known-group.successes}회 · 성공률 ${rate(group.successRate)} · 결과 미입력 ${group.count-group.known}회`));
  const scored=['highest','lowest'].includes(group.mode),ranked=group.mode==='rank',coop=group.mode==='cooperative',unknown=group.mode==='unknown';
  const labels=ranked?['플레이어','횟수','1위 비율','인원별 평균 순위']:scored?['플레이어','횟수','승률','평균 점수',group.mode==='lowest'?'최저점':'최고점']:unknown?['플레이어','횟수']:['플레이어','횟수',coop?'성공':'승리',...(coop?[]:['무승부']),coop?'실패':'패배',coop?'성공률':'승률'];
  const wrap=el('div',undefined,'record-table-wrap'),table=el('table',undefined,'record-table'),head=el('thead'),hr=el('tr'),body=el('tbody');
  for(const label of labels)hr.append(el('th',label));head.append(hr);table.append(head);
  for(const p of group.players){
   const values=ranked?[p.name,p.count,rate(p.rate),p.sizes.map(s=>`${s.size}명 · ${num(s.average)}위 (${s.count}회)`).join(' / ')||'—']:scored?[p.name,p.count,rate(p.rate),num(p.average),num(p.best)]:unknown?[p.name,p.count]:[p.name,p.count,p.wins,...(coop?[]:[p.draws]),p.losses,rate(p.rate)];
   const row=el('tr');for(const value of values)row.append(el('td',String(value)));body.append(row);
  }
  table.append(body);wrap.append(table);section.append(wrap);container.append(section);
 }
}
