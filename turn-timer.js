// 턴 타이머 관리 하단 시트. 점수판에는 툴바 아이콘만 두고 시간·순서·설정은 모두 이 시트에서 다룬다.
// 상태 계산은 turn-timer-core.js, 저장은 기기(localStorage). 시트가 닫혀 있으면 아이콘 표시만 갱신한다.
import {TIMER_KEY,loadTimer,startTurn,endTurn,selectPlayer,setNext,togglePass,nextRound,pauseTimer,resumeTimer,toggleShared,undoTurn,setStarter,reorder,setAutoStart,editTime,finishTimer,resetTimer,syncPlayers,timerRecord,liveTime,gameTime,sharedTime,turnTime,nextPlayer,canUndo,formatDuration} from './turn-timer-core.js?v=282';
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';

const $=id=>document.getElementById(id);
const board=()=>window.ScoreCounter?.getPlayers?.()||[];
const STATUS={idle:'시작 전',running:'측정 중',waiting:'시작 대기',paused:'일시정지',shared:'공용 시간',roundEnd:'라운드 종료',ended:'기록 저장됨'};
const FLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
const HANDLE='<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 5.5h20M4 11h20M4 17h20M4 22.5h20"/></svg>';
let state=null,ticker=0,live=[],saveError='',renderLater=0;

function stored(){return loadTimer(readStoredJson(TIMER_KEY,null));}
// 점수판 플레이어(ID)와 순서를 맞춘 최신 상태. 다른 탭이 바꿨으면 storage 이벤트로 캐시가 비워져 새로 읽는다.
function current(){
 const loaded=stored(),synced=syncPlayers(loaded,Date.now(),board().map(p=>p.id));
 if(synced!==loaded)persist(synced);state=synced;return state;
}
function persist(next){state=next;try{writeStoredJson(TIMER_KEY,next);saveError='';}catch{saveError='브라우저 저장 공간을 사용할 수 없어 타이머가 저장되지 않습니다.';}}
function apply(change){const before=current(),next=change(before,Date.now());if(next===before)return false;persist(next);updateIcon();if($('turnTimerDialog')?.open)render();return true;}

function updateIcon(){
 const button=$('turnTimer');if(!button)return;const s=state||stored(),base=s.status==='paused'?'paused':['running','shared'].includes(s.status)?'running':'';
 if(base)button.dataset.timer=base;else delete button.dataset.timer;
 const label=base?`턴 타이머 · ${STATUS[s.status]}`:'턴 타이머';button.setAttribute('aria-label',label);button.title=label;
}

const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function button(text,cls,onclick,{label,pressed,disabled}={}){const b=node('button',cls,text);b.type='button';if(label)b.setAttribute('aria-label',label);if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.disabled=!!disabled;b.onclick=onclick;return b;}
const liveText=(el,value)=>{live.push([el,value]);el.textContent=formatDuration(value(Date.now()));return el;};

function primaryAction(s){
 if(s.status==='running'){const index=s.turns.length-1;return ['턴 종료',()=>apply((t,now)=>endTurn(t,now,index))];}
 if(s.status==='paused')return ['타이머 재개',()=>apply(resumeTimer)];
 if(s.status==='shared')return ['공용 시간 종료',()=>apply(toggleShared)];
 if(s.status==='roundEnd')return ['다음 라운드',()=>apply(nextRound)];
 if(s.status==='ended')return ['새 타이머',()=>window.ScoreCounter.confirm('새 타이머','저장한 경기의 시간과 턴 기록을 지우고 새로 시작할까요? 저장된 기록은 유지됩니다.',()=>apply(t=>resetTimer(t)))];
 return ['턴 시작',()=>apply(startTurn)];
}

function render(){
 const s=current(),people=new Map(board().map(p=>[p.id,p])),nameOf=id=>people.get(id)?.name||'—',next=s.status==='ended'?'':nextPlayer(s);live=[];
 // 상단: 라운드 · 다음 예정 · 전체 경과
 const overview=$('turnTimerOverview');overview.replaceChildren();
 overview.append(node('span','',`라운드 ${s.round}`));if(next&&s.status!=='ended')overview.append(node('span','',`다음 예정 ${nameOf(next)}`));
 const total=node('span','');total.append('전체 ',liveText(node('output'),t=>gameTime(state,t)));overview.append(total);
 // 메인: 현재 플레이어 · 상태 · 누적 시간 · 주 CTA
 const main=$('turnTimerMain'),who=s.current&&people.get(s.current);main.replaceChildren();main.dataset.state=s.status;
 const head=node('div','turn-timer-now');if(who)head.style.setProperty('--player',who.color);
 const status=node('span','turn-timer-status',STATUS[s.status]);status.dataset.state=s.status;
 const name=node('strong','turn-timer-current',who?who.name:'플레이어 없음');
 const clock=liveText(node('output','turn-timer-clock'),t=>state.current?liveTime(state,state.current,t):0);clock.setAttribute('aria-label','현재 플레이어 누적 시간');
 const detail=node('small','turn-timer-detail');if(s.turns.at(-1)?.open){detail.append('이번 턴 ',liveText(node('output'),t=>turnTime(state,t)));}else detail.textContent=s.status==='idle'?(s.starter?'선플레이어부터 시작':'순서 첫 플레이어부터 시작'):s.status==='roundEnd'?'모두 패스했습니다':s.status==='ended'?'기록과 함께 저장했습니다':'턴 시작을 누르면 측정합니다';
 head.append(status,name,clock,detail);
 const [label,action]=primaryAction(s),cta=button(label,'primary turn-timer-cta',action,{disabled:!s.order.length});
 const tools=node('div','turn-timer-tools');
 if(['running','waiting','shared','roundEnd'].includes(s.status))tools.append(button('일시정지','secondary',()=>apply(pauseTimer)));
 if(['idle','running','waiting','roundEnd'].includes(s.status))tools.append(button('공용 시간','secondary',()=>apply(toggleShared),{disabled:!s.order.length}));
 if(!['idle','ended'].includes(s.status))tools.append(button('되돌리기','secondary',()=>apply(undoTurn),{disabled:!canUndo(s),label:'직전 턴 전환 취소'}));
 main.append(head,cta);if(tools.childElementCount)main.append(tools);
 if(saveError)main.append(node('p','record-error',saveError));
 renderPlayers(s,people,next);renderSettings(s,people);
}

function renderPlayers(s,people,next){
 const list=$('turnTimerPlayers'),locked=['shared','ended'].includes(s.status);list.replaceChildren();
 for(const id of s.order){
  const person=people.get(id);if(!person)continue;const isCurrent=s.current===id,passed=s.passed.includes(id);
  const row=node('li','turn-timer-row'+(isCurrent?' is-current':'')+(passed?' is-passed':''));row.dataset.playerId=id;row.style.setProperty('--player',person.color);
  const flag=button('','turn-timer-flag',()=>apply(t=>setStarter(t,id)),{label:`${person.name} 선플레이어 지정`,pressed:s.starter===id,disabled:s.status==='ended'});flag.innerHTML=FLAG;
  const sub=isCurrent?(s.status==='running'?'진행 중':s.status==='idle'?'시작 플레이어':s.status==='ended'?'':STATUS[s.status]):passed?'패스':next===id?'다음':'';
  const pick=button('','turn-timer-pick',()=>apply((t,now)=>selectPlayer(t,now,id)),{label:`${person.name} 턴으로 전환`,disabled:locked});
  pick.append(node('span','turn-timer-name',person.name));if(sub)pick.append(node('small','turn-timer-sub',sub));
  const time=liveText(node('output','turn-timer-time'),t=>liveTime(state,id,t));
  const nextChip=button('다음','turn-timer-chip',()=>apply(t=>setNext(t,id)),{label:`${person.name} 다음 차례로 지정`,pressed:s.nextOverride===id,disabled:locked});
  const pass=button('패스','turn-timer-chip',()=>apply((t,now)=>togglePass(t,now,id)),{label:`${person.name} 패스`,pressed:passed,disabled:locked});
  const handle=button('','rank-drag-handle turn-timer-handle',()=>{},{label:`${person.name} 턴 순서 이동`,pressed:false});handle.innerHTML=HANDLE;
  row.append(flag,pick,time,nextChip,pass,handle);list.append(row);
  window.ScoreCounter?.setupOrderDrag?.(row,handle,list,{selector:'.turn-timer-row',scroller:$('turnTimerDialog'),
   onDrop:(order,moved)=>{if(!moved)return;const before=current(),changed=reorder(before,order);if(changed!==before)persist(changed);clearTimeout(renderLater);renderLater=setTimeout(()=>{if($('turnTimerDialog').open)render();},240);},
   onAbort:render,onKey:delta=>{const order=[...state.order],from=order.indexOf(id),to=Math.max(0,Math.min(order.length-1,from+delta));if(from===to)return;order.splice(to,0,...order.splice(from,1));apply(t=>reorder(t,order));requestAnimationFrame(()=>list.querySelector(`[data-player-id="${id}"] .turn-timer-handle`)?.focus({preventScroll:true}));}});
 }
}

// 보조 설정: 자동 시작, 경과·공용 시간, 시간 수정(전후 값 기록), 초기화.
function parseDuration(text){const parts=String(text).trim().split(':').map(part=>part.trim());if(!parts.length||parts.length>3||parts.some(part=>!/^\d{1,4}$/.test(part)))return NaN;const [h,m,sec]=[0,0,0,...parts.map(Number)].slice(-3);return ((h*60+m)*60+sec)*1000;}
function renderSettings(s,people){
 const body=$('turnTimerSettingsBody');body.replaceChildren();
 const auto=node('label','turn-timer-switch'),check=node('input');check.type='checkbox';check.checked=s.autoStart;check.disabled=s.status==='ended';check.onchange=()=>apply(t=>setAutoStart(t,check.checked));auto.append(check,'다음 턴 자동 시작');
 const note=node('p','record-note',s.autoStart?'턴 종료 즉시 다음 플레이어를 측정합니다.':'턴 종료 후 다음 플레이어는 턴 시작을 눌러야 측정합니다.');
 const sums=node('p','turn-timer-sums');sums.append('전체 경과 ',liveText(node('output'),t=>gameTime(state,t)),' · 공용 ',liveText(node('output'),t=>sharedTime(state,t)));
 body.append(auto,note,sums);
 if(s.order.length&&s.status!=='ended'){
  const form=node('form','turn-timer-edit'),select=node('select'),input=node('input'),error=node('p','record-error');select.setAttribute('aria-label','시간을 수정할 플레이어');
  for(const id of s.order){const option=node('option','',people.get(id)?.name||id);option.value=id;select.append(option);}
  input.type='text';input.inputMode='numeric';input.placeholder='시:분:초';input.setAttribute('aria-label','수정할 누적 시간');input.autocomplete='off';
  const fill=()=>{input.value=formatDuration(liveTime(state,select.value,Date.now()));};select.onchange=fill;fill();
  form.onsubmit=event=>{event.preventDefault();const value=parseDuration(input.value);if(!Number.isFinite(value)){error.textContent='시간을 00:00:00 형식으로 입력하세요.';return;}error.textContent='';apply((t,now)=>editTime(t,now,select.value,value));};
  const label=node('label','','플레이어 시간 수정');const row=node('div','turn-timer-edit-row');row.append(select,input,button('적용','secondary',()=>form.requestSubmit()));form.append(label,row,error);body.append(form);
 }
 const edits=s.log.filter(item=>item.type==='edit').slice(-3).reverse();
 if(edits.length){const list=node('ul','turn-timer-log');for(const item of edits)list.append(node('li','',`${people.get(item.player)?.name||'삭제된 플레이어'} ${formatDuration(item.before)} → ${formatDuration(item.after)}`));body.append(list);}
 if(s.used)body.append(button('타이머 초기화','record-danger turn-timer-reset',()=>window.ScoreCounter.confirm('타이머 초기화','모든 플레이어의 시간과 턴 기록을 지울까요? 점수는 바뀌지 않습니다.',()=>apply(t=>resetTimer(t)))));
}

function tick(){const now=Date.now();for(const [el,value]of live){const text=formatDuration(value(now));if(el.textContent!==text)el.textContent=text;}}
function open(){if(!window.ScoreCounter)return;render();$('turnTimerDialog').showModal();clearInterval(ticker);ticker=setInterval(tick,250);}

const dialog=$('turnTimerDialog');
if(dialog&&$('turnTimer')){
 $('turnTimer').onclick=open;
 dialog.addEventListener('close',()=>{clearInterval(ticker);ticker=0;live=[];});
 // 점수판 플레이어가 바뀌면 순서를 맞춘다. 시트가 닫혀 있으면 아이콘만 갱신한다.
 window.addEventListener('scorecounter:changed',()=>{const before=state;current();updateIcon();if(dialog.open&&state!==before)render();});
 window.addEventListener('storage',event=>{if(event.key!==TIMER_KEY&&event.key!==null)return;state=null;updateIcon();if(dialog.open)render();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&dialog.open)tick();});
 current();updateIcon();
}

window.ScoreTurnTimer={
 // 기록 저장 직전: 타이머를 쓴 경기면 플레이어 ID별 요약을 돌려준다.
 recordData:(playerIds,recordId)=>{try{return timerRecord(current(),Date.now(),playerIds,recordId);}catch{return undefined;}},
 // 기록 저장 후: 타이머를 멈추고 그 기록에 연결한다. 연속 판(저장하고 다음 판)이면 바로 새 타이머로 비운다.
 saved:(recordId,{next=false}={})=>{apply((t,now)=>{const done=finishTimer(t,now,recordId);return next?resetTimer(done):done;});}
};
