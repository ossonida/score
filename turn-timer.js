// 턴 타이머 관리 전체 화면. 점수판에는 툴바 아이콘만 두고 시간·순서·설정은 모두 이 화면에서 다룬다.
// 상태 계산은 turn-timer-core.js, 저장은 기기(localStorage). 시트가 닫혀 있으면 아이콘 표시만 갱신한다.
import {TIMER_KEY,loadTimer,startTurn,endTurn,selectPlayer,togglePass,nextRound,pauseTimer,resumeTimer,toggleShared,undoTurn,setStarter,reorder,setAutoStart,setLimit,advanceRound,editTime,finishTimer,resetTimer,syncPlayers,timerRecord,liveTime,gameTime,turnTime,remainingTime,limitOf,limitMs,voiceCue,nextPlayer,canUndo,formatDuration} from './turn-timer-core.js?v=292';
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';

const $=id=>document.getElementById(id);
const board=()=>window.ScoreCounter?.getPlayers?.()||[];
const STATUS={idle:'시작 전',running:'측정 중',waiting:'시작 대기',paused:'일시정지',shared:'공용 시간',roundEnd:'라운드 종료',ended:'기록 저장됨'};
const FLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
// Figma 189:441 아이콘(Material Symbols). 원 안 기호는 RING과 함께 그린다.
const svg=(box,d)=>`<svg viewBox="0 0 ${box} ${box}" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
const RING='M9.5 19A9.5 9.5 0 1 1 9.5 0a9.5 9.5 0 0 1 0 19Zm0-1.5a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
const ICON={
 play:svg(19,RING+'M7.25 13.54 13.54 9.5 7.25 5.46Z'),
 check:svg(19,RING+'M8.08 13.75l6.72-6.72-1.05-1.05-5.67 5.67-2.85-2.85-1.05 1.05Z'),
 pause:svg(19,RING+'M6.9 13.25h1.5v-7.5H6.9Zm3.7 0h1.5v-7.5h-1.5Z'),
 undo:svg(24,'M11.98 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7c-2.18 0-4.07-.71-5.67-2.14-1.6-1.43-2.53-3.22-2.77-5.36h1.53c.25 1.73 1.03 3.16 2.34 4.3 1.3 1.13 2.83 1.7 4.57 1.7 1.95 0 3.6-.68 4.96-2.04 1.36-1.36 2.04-3.01 2.04-4.96s-.68-3.6-2.04-4.96C15.58 5.68 13.93 5 11.98 5c-1.09 0-2.12.24-3.07.73-.96.49-1.78 1.15-2.47 2h2.62v1.5H3.98V4.15h1.5v2.37a8.5 8.5 0 0 1 2.92-2.23 8.4 8.4 0 0 1 3.58-.79c1.18 0 2.29.22 3.32.67 1.03.45 1.93 1.05 2.7 1.82.76.77 1.37 1.67 1.82 2.7.44 1.03.67 2.14.67 3.31s-.23 2.28-.67 3.32c-.45 1.03-1.06 1.93-1.82 2.7-.77.76-1.67 1.37-2.7 1.82-1.03.44-2.14.66-3.32.66Z'),
 settings:svg(24,'M17.65 19.65a3.35 3.35 0 1 1 0-6.69 3.35 3.35 0 0 1 0 6.69Zm0-1.5a1.85 1.85 0 1 0 0-3.69 1.85 1.85 0 0 0 0 3.69ZM4.5 17.06v-1.5h7.62v1.5H4.5Zm1.85-6.02a3.35 3.35 0 1 1 0-6.69 3.35 3.35 0 0 1 0 6.69Zm0-1.5a1.85 1.85 0 1 0 0-3.69 1.85 1.85 0 0 0 0 3.69Zm5.53-1.1v-1.5h7.62v1.5h-7.62Z'),
 drag:svg(24,'M9 19.62a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Zm6 0a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Zm-6-6a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Zm6 0a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Zm-6-6a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Zm6 0a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24Z')
};
let state=null,ticker=0,live=[],saveError='',renderLater=0,settingsOpen=false,iconLater=0,shownOver=false;

function stored(){return loadTimer(readStoredJson(TIMER_KEY,null));}
// 점수판 플레이어(ID)와 순서를 맞춘 최신 상태. 다른 탭이 바꿨으면 storage 이벤트로 캐시가 비워져 새로 읽는다.
function current(){
 const loaded=stored(),synced=syncPlayers(loaded,Date.now(),board().map(p=>p.id));
 if(synced!==loaded)persist(synced);state=synced;return state;
}
function persist(next){state=next;try{writeStoredJson(TIMER_KEY,next);saveError='';}catch{saveError='브라우저 저장 공간을 사용할 수 없어 타이머가 저장되지 않습니다.';}}
function apply(change){const before=current(),next=change(before,Date.now());if(next===before)return false;persist(next);if(limitOf(next).voice)unlockVoice();updateIcon();if($('turnTimerDialog')?.open)render();return true;}

// 측정 중인 현재 플레이어가 제한 시간을 다 썼는지(제한 없음이면 false).
const isOver=(s,now)=>s.status==='running'&&(remainingTime(s,now)??1)<=0;
const overText=s=>limitOf(s).over==='stop'?'시간 종료':'시간 초과';
function updateIcon(){
 const button=$('turnTimer');if(!button)return;const s=state||stored(),now=Date.now(),over=isOver(s,now),base=over?'over':s.status==='paused'?'paused':['running','shared'].includes(s.status)?'running':'';
 if(base)button.dataset.timer=base;else delete button.dataset.timer;
 const label=base?`턴 타이머 · ${over?overText(s):STATUS[s.status]}`:'턴 타이머';button.setAttribute('aria-label',label);button.title=label;
 // 화면이 닫혀 있어도 제한 시간에 닿는 순간 빨간 점으로 바꾼다.
 clearTimeout(iconLater);const left=s.status==='running'?remainingTime(s,now):null;if(left>0)iconLater=setTimeout(updateIcon,Math.min(left+50,2**31-1));
 syncVoice();
}
// 음성 안내: 측정 중이고 제한·음성 안내가 켜져 있을 때만 0.25초마다 남은 시간을 보고, 안내 시점을 지날 때 한 번 읽는다.
const speech=window.speechSynthesis&&window.SpeechSynthesisUtterance?window.speechSynthesis:null;
let voiceLoop=0,voiceLast=null,voiceReady=false;
const voiceOn=s=>!!speech&&!!limitOf(s).voice&&s.status==='running'&&remainingTime(s,Date.now())!==null;
function speak(text){if(!speech)return;const u=new SpeechSynthesisUtterance(text),ko=speech.getVoices().find(v=>/^ko/i.test(v.lang));u.lang='ko-KR';if(ko)u.voice=ko;if(/^\d$/.test(text))speech.cancel();speech.speak(u);}
// 아이폰은 사용자가 누른 순간에만 소리를 열 수 있어 켜기·턴 조작 때 무음으로 한 번 연다.
function unlockVoice(){if(!speech||voiceReady)return;voiceReady=true;const u=new SpeechSynthesisUtterance(' ');u.volume=0;speech.speak(u);}
function voiceCheck(){
 const s=state||stored();if(!voiceOn(s)){clearInterval(voiceLoop);voiceLoop=0;voiceLast=null;return;}
 const left=remainingTime(s,Date.now()),key=`${s.current}|${s.round}`;
 if(voiceLast?.key===key&&left<voiceLast.left){const text=voiceCue(voiceLast.left,left,limitMs(s));if(text)speak(text);}
 voiceLast={key,left};
}
function syncVoice(){if(voiceOn(state||stored())){if(!voiceLoop){voiceLast=null;voiceCheck();voiceLoop=setInterval(voiceCheck,250);}}else voiceCheck();}

const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function button(text,cls,onclick,{label,pressed,disabled}={}){const b=node('button',cls,text);b.type='button';if(label)b.setAttribute('aria-label',label);if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.disabled=!!disabled;b.onclick=onclick;return b;}
const liveText=(el,value,format=formatDuration)=>{live.push([el,value,format]);el.textContent=format(value(Date.now()));return el;};
// 남은 시간: 0 아래로 내려가면 초과한 시간을 +로 센다.
const leftText=value=>value<0?'+'+formatDuration(-value):formatDuration(value);

const withIcon=(b,icon,text)=>{b.innerHTML=ICON[icon];b.append(node('span','',text));return b;};
// 주 CTA [문구, 아이콘, 동작]. 공용 시간은 시작 버튼을 뺐고, 이전에 시작해 둔 경우만 재개로 끝낸다.
function primaryAction(s,name){
 if(s.status==='running'){const index=s.turns.length-1;return [`${name} 턴 종료`.trim(),'check',()=>apply((t,now)=>endTurn(t,now,index))];}
 if(s.status==='paused')return ['타이머 재개','play',()=>apply(resumeTimer)];
 if(s.status==='shared')return ['타이머 재개','play',()=>apply(toggleShared)];
 if(s.status==='roundEnd')return ['다음 라운드','play',()=>apply(nextRound)];
 if(s.status==='ended')return ['새 타이머','play',()=>window.ScoreCounter.confirm('새 타이머','저장한 경기의 시간과 턴 기록을 지우고 새로 시작할까요? 저장된 기록은 유지됩니다.',()=>apply(t=>resetTimer(t)))];
 return [`${name} 턴 시작`.trim(),'play',()=>apply(startTurn)];
}

function render(){
 const s=current(),people=new Map(board().map(p=>[p.id,p])),nameOf=id=>people.get(id)?.name||'—',next=s.status==='ended'?'':nextPlayer(s);live=[];
 // 상단: 라운드 · 다음 예정 · 전체 경과
 const overview=$('turnTimerOverview');overview.replaceChildren();
 overview.append(node('span','',`라운드 ${s.round}`));if(next&&s.status!=='ended')overview.append(node('span','',`다음 예정 ${nameOf(next)}`));
 const total=node('span','');total.append('전체 ',liveText(node('output'),t=>gameTime(state,t)));overview.append(total);
 // 현재 플레이어 카드: 이름·상태 · 누적 시간 · 이번 턴, 아래쪽에 주 CTA와 되돌리기. 저장됨이면 주 CTA만 화면 아래 고정 영역으로.
 const main=$('turnTimerMain'),who=s.current&&people.get(s.current),now=Date.now(),limited=remainingTime(s,now)!==null&&s.status!=='ended',over=shownOver=isOver(s,now);
 main.replaceChildren();main.dataset.state=s.status;if(over)main.dataset.over=limitOf(s).over;else delete main.dataset.over;
 const head=node('div','turn-timer-now'),top=node('div','turn-timer-top');if(who)head.style.setProperty('--player',who.color);
 const status=node('span','turn-timer-status',over?overText(s):STATUS[s.status]);status.dataset.state=over?'over':s.status;
 top.append(node('strong','turn-timer-current',who?who.name:'플레이어 없음'),status);
 // 제한이 있으면 큰 숫자는 남은 시간(초과하면 +초과 시간), 아래 줄에 누적·이번 턴.
 const clock=limited?liveText(node('output','turn-timer-clock'),t=>remainingTime(state,t)??0,leftText):liveText(node('output','turn-timer-clock'),t=>state.current?liveTime(state,state.current,t):0);
 clock.setAttribute('aria-label',limited?'현재 플레이어 남은 시간':'현재 플레이어 누적 시간');
 const open=s.turns.at(-1)?.open,detail=node('small','turn-timer-detail');
 if(limited&&open)detail.append('누적 ',liveText(node('output'),t=>liveTime(state,state.current,t)),' · 이번 턴 ',liveText(node('output'),t=>turnTime(state,t)));
 else if(open)detail.append('이번 턴 ',liveText(node('output'),t=>turnTime(state,t)));
 else detail.textContent=s.status==='idle'?(s.starter?'선플레이어부터 시작':'순서 첫 플레이어부터 시작'):s.status==='roundEnd'?'모두 패스했습니다':s.status==='ended'?'기록과 함께 저장했습니다':'턴 시작을 누르면 측정합니다';
 head.append(top,node('small','turn-timer-caption',over?(limitOf(s).over==='stop'?'제한 시간 종료':'제한 시간 초과'):limited?'남은 시간':'누적 사용 시간'),clock,detail);
 const [label,icon,action]=primaryAction(s,who?.name||''),cta=withIcon(button('','primary turn-timer-cta',action,{disabled:!s.order.length}),icon,label);
 main.append(head);if(saveError)main.append(node('p','record-error',saveError));
 const actions=$('turnTimerActions');actions.replaceChildren();actions.hidden=s.status!=='ended';
 if(s.status==='ended')actions.append(cta);
 else{const row=node('div','turn-timer-cta-row');row.append(cta);if(canUndo(s))row.append(withIcon(button('','turn-timer-undo',()=>apply(undoTurn),{label:'되돌리기 · 직전 턴 전환 취소'}),'undo',''));main.append(row);}
 // 목록 아래 보조 줄: 일시정지 · 설정(펼침)
 const round=$('turnTimerRoundRow');round.replaceChildren();round.hidden=!s.order.length||s.status==='ended';if(!round.hidden)round.append(button('다음 라운드','secondary turn-timer-round',()=>apply(advanceRound),{disabled:!['running','waiting','roundEnd'].includes(s.status)}));
 const tools=$('turnTimerTools');tools.replaceChildren();
 if(s.status!=='ended')tools.append(withIcon(button('','secondary',()=>apply(pauseTimer),{disabled:!['running','waiting','shared','roundEnd'].includes(s.status)}),'pause','일시정지'));
 tools.append(withIcon(button('','secondary',()=>{settingsOpen=!settingsOpen;render();if(settingsOpen)$('turnTimerSettings').scrollIntoView({block:'nearest',behavior:'smooth'});}),'settings','설정'));
 tools.lastChild.setAttribute('aria-expanded',String(settingsOpen));tools.lastChild.setAttribute('aria-controls','turnTimerSettings');
 $('turnTimerSettings').hidden=!settingsOpen;
 renderPlayers(s,people,next);renderSettings(s,people);
}

function renderPlayers(s,people,next){
 const list=$('turnTimerPlayers'),locked=['shared','ended'].includes(s.status);list.replaceChildren();
 for(const id of s.order){
  const person=people.get(id);if(!person)continue;const isCurrent=s.current===id,passed=s.passed.includes(id);
  const spent=limitOf(s).mode==='game'&&remainingTime(s,Date.now(),id)<=0;
  const row=node('li','turn-timer-row'+(isCurrent?' is-current':'')+(passed?' is-passed':'')+(spent?' is-over':''));row.dataset.playerId=id;row.style.setProperty('--player',person.color);
  const flag=button('','turn-timer-flag',()=>apply(t=>setStarter(t,id)),{label:`${person.name} 선플레이어 지정`,pressed:s.starter===id,disabled:s.status==='ended'});flag.innerHTML=FLAG;
  const sub=isCurrent?(s.status==='running'?'진행 중':s.status==='idle'?'시작 플레이어':s.status==='ended'?'':STATUS[s.status]):passed?'패스':next===id?'다음':'';
  const pick=button('','turn-timer-pick',()=>apply((t,now)=>selectPlayer(t,now,id)),{label:`${person.name} 턴으로 전환`,disabled:locked});
  // 이름 줄(이름 · 상태) 아래에 누적 시간
  const line=node('span','turn-timer-line');line.append(node('span','turn-timer-name',person.name));if(sub)line.append(node('small','turn-timer-sub',sub));
  pick.append(line,liveText(node('output','turn-timer-time'),t=>liveTime(state,id,t)));
  const pass=button('패스','turn-timer-chip',()=>apply((t,now)=>togglePass(t,now,id)),{label:`${person.name} 패스`,pressed:passed,disabled:locked});
  const handle=button('','rank-drag-handle turn-timer-handle',()=>{},{label:`${person.name} 턴 순서 이동`,pressed:false});handle.innerHTML=ICON.drag;
  row.append(flag,pick,pass,handle);list.append(row);
  window.ScoreCounter?.setupOrderDrag?.(row,handle,list,{selector:'.turn-timer-row',scroller:$('turnTimerBody'),
   onDrop:(order,moved)=>{if(!moved)return;const before=current(),changed=reorder(before,order);if(changed!==before)persist(changed);clearTimeout(renderLater);renderLater=setTimeout(()=>{if($('turnTimerDialog').open)render();},240);},
   onAbort:render,onKey:delta=>{const order=[...state.order],from=order.indexOf(id),to=Math.max(0,Math.min(order.length-1,from+delta));if(from===to)return;order.splice(to,0,...order.splice(from,1));apply(t=>reorder(t,order));requestAnimationFrame(()=>list.querySelector(`[data-player-id="${id}"] .turn-timer-handle`)?.focus({preventScroll:true}));}});
 }
}

// 설정: 턴 종료 후 다음 플레이어 · 제한 시간 · 이번 라운드 패스와 다음 라운드 · 시간 수정(전후 값 기록) · 초기화.
function group(title){const box=node('fieldset','turn-timer-group');box.append(node('legend','',title));return box;}
function radio(name,value,checked,text,hint,onpick,disabled){
 const label=node('label','turn-timer-option'),input=node('input'),copy=node('span');input.type='radio';input.name=name;input.value=value;input.checked=checked;input.disabled=disabled;input.onchange=()=>{if(input.checked)onpick();};
 copy.append(node('span','',text));if(hint)copy.append(node('small','',hint));label.append(input,copy);return label;
}
function check(text,checked,onchange,disabled){const label=node('label','turn-timer-switch'),input=node('input');input.type='checkbox';input.checked=checked;input.disabled=disabled;input.onchange=()=>onchange(input.checked);label.append(typeof text==='string'?node('span','',text):text,input);return label;}
function renderLimit(s,body){
 const locked=s.status==='ended',limit=limitOf(s),change=patch=>apply((t,now)=>setLimit(t,now,patch));
 const mode=group('제한 시간 방식');
 for(const [value,text,hint] of [['none','제한 없음','사용 시간만 누적'],['game','게임 전체 제한 시간','여러 턴에 걸쳐 차감'],['turn','매 턴 제한 시간','턴마다 새로 부여']])mode.append(radio('turnTimerLimitMode',value,limit.mode===value,text,hint,()=>change({mode:value}),locked));
 body.append(mode);if(limit.mode==='none')return;
 const title=limit.mode==='turn'?'1인당 매 턴 제한 시간 (분)':'1인당 게임 전체 제한 시간 (분)',minutes=group(title),row=node('div','turn-timer-minutes'),input=node('input');
 input.type='number';input.min='1';input.max='999';input.step='1';input.inputMode='numeric';input.value=String(limit.minutes);input.disabled=locked;input.setAttribute('aria-label',title);
 input.onchange=()=>{const value=Number(input.value);if(Number.isInteger(value)&&value>=1&&value<=999)change({minutes:value});else input.value=String(limitOf(state).minutes);};
 row.append(input);for(const value of [1,3,5,10])row.append(button(`${value}분`,'turn-timer-chip',()=>change({minutes:value}),{pressed:limit.minutes===value,disabled:locked}));
 minutes.append(row);
 const over=group('시간 초과 시');
 over.append(radio('turnTimerLimitOver','warn',limit.over==='warn','경고 표시 후 계속 측정','',()=>change({over:'warn'}),locked),radio('turnTimerLimitOver','stop',limit.over==='stop','제한 시간 도달 시 개인 타이머 정지','',()=>change({over:'stop'}),locked));
 const voice=group('음성 안내'),copy=node('span','turn-timer-copy');copy.append(node('span','','남은 시간 읽어 주기'),node('small','',speech?'1분·30초·10초 전, 5초부터 카운트다운':'이 브라우저는 음성 안내를 지원하지 않습니다'));
 voice.append(check(copy,!!limit.voice,value=>{change({voice:value});if(value){unlockVoice();speak('음성 안내를 켰습니다');}},locked||!speech));
 body.append(minutes,over,voice);
}
function parseDuration(text){const parts=String(text).trim().split(':').map(part=>part.trim());if(!parts.length||parts.length>3||parts.some(part=>!/^\d{1,4}$/.test(part)))return NaN;const [h,m,sec]=[0,0,0,...parts.map(Number)].slice(-3);return ((h*60+m)*60+sec)*1000;}
function renderSettings(s,people){
 const body=$('turnTimerSettingsBody');body.replaceChildren();
 const auto=group('턴 종료 후 다음 플레이어');auto.append(check('자동 시작',s.autoStart,value=>apply(t=>setAutoStart(t,value)),s.status==='ended'));
 body.append(auto);renderLimit(s,body);
 if(s.order.length){
  const passes=group('이번 라운드 패스'),locked=['shared','ended'].includes(s.status);
  for(const id of s.order){const person=people.get(id);if(person){const name=node('span'),dot=node('i','turn-timer-dot');dot.style.background=person.color||'#52c7ef';name.append(dot,person.name);passes.append(check(name,s.passed.includes(id),()=>apply((t,now)=>togglePass(t,now,id)),locked));}}
  body.append(passes);
 }
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
 if(s.used)body.append(button('타이머 초기화','turn-timer-reset',()=>window.ScoreCounter.confirm('타이머 초기화','모든 플레이어의 시간과 턴 기록을 지울까요? 점수는 바뀌지 않습니다.',()=>apply(t=>resetTimer(t)))));
}

function tick(){
 const now=Date.now();if(state&&isOver(state,now)!==shownOver){render();updateIcon();return;}
 for(const [el,value,format]of live){const text=format(value(now));if(el.textContent!==text)el.textContent=text;}
}
function open(){if(!window.ScoreCounter)return;settingsOpen=false;render();$('turnTimerBody').scrollTop=0;$('turnTimerDialog').showModal();clearInterval(ticker);ticker=setInterval(tick,250);}

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
