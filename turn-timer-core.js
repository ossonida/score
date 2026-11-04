// 턴 타이머 상태. 화면 숫자를 1초씩 올리지 않고 기준 시각(ms)과 실제 경과 시간으로 계산한다.
// 모든 변경은 (상태, now, ...) → 새 상태인 순수 함수다. 플레이어는 닉네임·순서가 아니라 고유 ID로 연결한다.
// 상태: idle 시작 전 · running 개인 턴 측정 · waiting 시작 대기 · paused 일시정지 · shared 공용 시간 · roundEnd 모두 패스 · ended 기록 저장됨
export const TIMER_KEY='score.turnTimer.v1';
const ID=/^[A-Za-z0-9_.:-]{1,100}$/,STATUSES=['idle','running','waiting','paused','shared','roundEnd','ended'];
const MAX_UNDO=20,MAX_LOG=100,RECORD_TURNS=1000;
const clock=(c,now)=>c.ms+(c.since?Math.max(0,now-c.since):0);
const stop=(c,now)=>({ms:clock(c,now),since:0});
const run=(c,now)=>c.since?c:{ms:c.ms,since:now};
const clone=value=>JSON.parse(JSON.stringify(value));
const ms=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const validClock=c=>c&&typeof c==='object'&&Number.isSafeInteger(c.ms)&&c.ms>=0&&Number.isSafeInteger(c.since)&&c.since>=0;

export function createTimer(order=[],{autoStart=false}={}){
 return {v:1,used:false,autoStart:autoStart===true,order:order.filter(id=>ID.test(id)),firstStarter:'',starter:'',current:'',nextOverride:'',status:'idle',pausedFrom:'',sharedFrom:'',round:1,passed:[],times:{},run:0,game:{ms:0,since:0},shared:{ms:0,since:0},pause:{ms:0,since:0},turns:[],log:[],undo:[],savedRecordId:''};
}
// 저장 문자열이 깨졌거나 형식이 다르면 새 타이머로 시작한다(점수판에는 영향 없음).
export function validTimer(s){
 return !!s&&typeof s==='object'&&s.v===1&&STATUSES.includes(s.status)&&Array.isArray(s.order)&&s.order.every(id=>typeof id==='string'&&ID.test(id))&&new Set(s.order).size===s.order.length&&Array.isArray(s.passed)&&Array.isArray(s.turns)&&Array.isArray(s.log)&&Array.isArray(s.undo)&&s.times&&typeof s.times==='object'&&Object.values(s.times).every(value=>Number.isSafeInteger(value)&&value>=0)&&Number.isSafeInteger(s.run)&&s.run>=0&&Number.isSafeInteger(s.round)&&s.round>=1&&validClock(s.game)&&validClock(s.shared)&&validClock(s.pause)&&['current','starter','firstStarter','nextOverride','pausedFrom','sharedFrom','savedRecordId'].every(key=>typeof s[key]==='string');
}
export function loadTimer(value){return validTimer(value)?value:createTimer();}

const openTurn=s=>{const last=s.turns[s.turns.length-1];return last?.open?last:null;};
// 측정 중인 구간을 현재 시각까지 확정한다. keep이면 같은 턴을 계속 측정한다.
function settle(s,now,keep=false){
 if(!s.run)return;const segment=Math.max(0,now-s.run);s.times[s.current]=(s.times[s.current]||0)+segment;const turn=openTurn(s);if(turn)turn.ms+=segment;s.run=keep?now:0;
}
function closeTurn(s,now){settle(s,now);const turn=openTurn(s);if(turn)delete turn.open;}
function beginTurn(s,now){s.turns.push({player:s.current,round:s.round,ms:0,at:now,open:true});s.run=now;s.status='running';s.used=true;s.game=run(s.game,now);}
// 되돌리기용 스냅샷. 턴 이력은 앞부분이 바뀌지 않으므로 길이와 마지막 두 개만 보관한다.
const UNDO_KEYS=['used','firstStarter','current','nextOverride','status','pausedFrom','sharedFrom','round','passed','times','run','game','shared'];
function remember(s,now){const snap={pauseMs:clock(s.pause,now),turnsLength:s.turns.length,tail:clone(s.turns.slice(-2))};for(const key of UNDO_KEYS)snap[key]=clone(s[key]);s.undo=[...s.undo,snap].slice(-MAX_UNDO);}

export function liveTime(s,id,now){return (s.times[id]||0)+(s.run&&s.current===id?Math.max(0,now-s.run):0);}
export function gameTime(s,now){return clock(s.game,now);}
export function sharedTime(s,now){return clock(s.shared,now);}
export function turnTime(s,now){const turn=openTurn(s);return turn?turn.ms+(s.run?Math.max(0,now-s.run):0):0;}
export function canUndo(s){return s.undo.length>0&&!['paused','shared','ended'].includes(s.status);}
// 다음 예정 플레이어: 일회 지정 → 현재 다음 순서 중 패스하지 않은 사람. 모두 패스면 ''.
export function nextPlayer(s,from=s.current){
 if(s.nextOverride&&s.order.includes(s.nextOverride)&&!s.passed.includes(s.nextOverride))return s.nextOverride;
 const size=s.order.length,start=s.order.indexOf(from);
 for(let step=1;step<=size;step++){const id=s.order[((start<0?-1:start)+step)%size];if(!s.passed.includes(id))return id;}
 return '';
}
const firstActive=s=>(s.starter&&s.order.includes(s.starter)&&!s.passed.includes(s.starter)?s.starter:s.order.find(id=>!s.passed.includes(id)))||'';

// 현재 턴을 닫고 target으로 넘긴다(''이면 라운드 종료). 일시정지 중에는 자동 측정하지 않는다.
function moveTo(s,now,target,auto){
 closeTurn(s,now);const paused=s.status==='paused';let next;
 if(!target){next='roundEnd';s.current=(s.starter&&s.order.includes(s.starter)?s.starter:s.order[0])||'';}
 else{s.current=target;next=auto&&s.autoStart&&!paused?'running':'waiting';}
 if(paused)s.pausedFrom=next;else if(next==='running')beginTurn(s,now);else s.status=next;
}
function takeNext(s){const next=nextPlayer(s);if(next&&next===s.nextOverride)s.nextOverride='';return next;}

export function startTurn(input,now){
 if(!['idle','waiting'].includes(input.status)||!input.order.length)return input;const s=clone(input);remember(s,now);
 if(!s.current||!s.order.includes(s.current))s.current=firstActive(s)||s.order[0];
 if(s.status==='idle'&&!s.firstStarter)s.firstStarter=s.starter||s.current;
 beginTurn(s,now);return s;
}
// turnIndex는 화면이 그릴 때의 턴 수. 두 번 눌러 이미 다음 턴으로 넘어갔으면 무시한다(이중 누적 방지).
export function endTurn(input,now,turnIndex=input.turns.length-1){
 if(input.status!=='running'||turnIndex!==input.turns.length-1)return input;const s=clone(input);remember(s,now);moveTo(s,now,takeNext(s),true);return s;
}
export function selectPlayer(input,now,id){
 if(!input.order.includes(id)||['shared','ended'].includes(input.status))return input;
 if(input.status==='running'&&input.current===id)return input;
 const s=clone(input);
 if(['idle','roundEnd'].includes(s.status)){s.current=id;return s;}
 if(s.status==='waiting'&&s.current===id&&!s.autoStart)return input;
 remember(s,now);
 if(s.status==='waiting'){s.current=id;if(s.autoStart)beginTurn(s,now);return s;}
 moveTo(s,now,id,true);return s;
}
export function setNext(input,id){if(!input.order.includes(id)||input.status==='ended')return input;const s=clone(input);s.nextOverride=s.nextOverride===id?'':id;return s;}
export function togglePass(input,now,id){
 if(!input.order.includes(id)||['shared','ended'].includes(input.status))return input;const s=clone(input);remember(s,now);
 if(s.passed.includes(id)){s.passed=s.passed.filter(item=>item!==id);if(s.status==='roundEnd'){s.status='waiting';s.current=id;}else if(s.status==='paused'&&s.pausedFrom==='roundEnd'){s.pausedFrom='waiting';s.current=id;}return s;}
 s.passed=[...s.passed,id];if(s.nextOverride===id)s.nextOverride='';
 const base=s.status==='paused'?s.pausedFrom:s.status;
 if(s.current===id&&['running','waiting'].includes(base))moveTo(s,now,takeNext(s),base==='running');
 else if(!s.order.some(item=>!s.passed.includes(item))&&['running','waiting'].includes(base))moveTo(s,now,'',false);
 return s;
}
export function nextRound(input,now){
 if(input.status!=='roundEnd')return input;const s=clone(input);remember(s,now);s.round+=1;s.passed=[];s.nextOverride='';s.status='waiting';if(!s.order.includes(s.current))s.current=firstActive(s);return s;
}
export function pauseTimer(input,now){
 if(!['running','waiting','shared','roundEnd'].includes(input.status))return input;const s=clone(input);
 settle(s,now);s.game=stop(s.game,now);s.shared=stop(s.shared,now);s.pause=run(s.pause,now);s.pausedFrom=s.status;s.status='paused';return s;
}
export function resumeTimer(input,now){
 if(input.status!=='paused')return input;const s=clone(input);s.pause=stop(s.pause,now);s.status=s.pausedFrom||'waiting';s.pausedFrom='';
 s.game=run(s.game,now);if(s.status==='running')s.run=now;if(s.status==='shared')s.shared=run(s.shared,now);return s;
}
// 공용 시간: 개인 시간은 멈추고 전체 경과에는 넣되 누구에게도 배정하지 않는다. 끝나면 이전 상태(측정 중이면 같은 턴)로 돌아간다.
export function toggleShared(input,now){
 if(input.status==='shared'){const s=clone(input);s.shared=stop(s.shared,now);s.status=s.sharedFrom||'waiting';s.sharedFrom='';if(s.status==='running')s.run=now;return s;}
 if(!['idle','running','waiting','roundEnd'].includes(input.status)||!input.order.length)return input;const s=clone(input);
 settle(s,now);if(s.status==='idle'){s.current=s.current&&s.order.includes(s.current)?s.current:firstActive(s);s.sharedFrom='waiting';}else s.sharedFrom=s.status;
 s.used=true;s.game=run(s.game,now);s.shared=run(s.shared,now);s.status='shared';s.undo=[];return s;
}
// 직전 턴 전환 취소. 그 뒤 자동 시작된 플레이어 시간은 버리고, 이전 플레이어는 원래 시작 시각부터 이어 측정한다.
// 그 사이 일시정지했던 시간만큼 기준 시각을 뒤로 미뤄 멈춘 시간은 넣지 않는다.
export function undoTurn(input,now){
 if(!canUndo(input))return input;const s=clone(input),snap=s.undo.pop(),from=s.current,shift=Math.max(0,clock(s.pause,now)-snap.pauseMs);
 for(const key of UNDO_KEYS)s[key]=snap[key];
 s.turns=[...s.turns.slice(0,Math.max(0,snap.turnsLength-snap.tail.length)),...snap.tail];
 if(s.run)s.run+=shift;if(s.game.since)s.game.since+=shift;if(s.shared.since)s.shared.since+=shift;
 s.log=[...s.log,{type:'undo',player:from,after:s.current,at:now}].slice(-MAX_LOG);return s;
}
export function setStarter(input,id){
 if(!input.order.includes(id)||input.status==='ended')return input;const s=clone(input);s.starter=id;if(s.status==='idle'){s.firstStarter=id;s.current=id;}return s;
}
export function reorder(input,order){
 if(order.length!==input.order.length||new Set(order).size!==order.length||order.some(id=>!input.order.includes(id)))return input;const s=clone(input);s.order=[...order];return s;
}
export function setAutoStart(input,value){const s=clone(input);s.autoStart=value===true;return s;}
// 시간 수동 수정: 측정 중이면 지금까지 정산한 뒤 바꾸고 수정 전후 값을 남긴다. 되돌리기 기록은 비운다.
export function editTime(input,now,id,value){
 if(!input.order.includes(id)||!Number.isFinite(value)||input.status==='ended')return input;const s=clone(input);
 if(s.current===id)settle(s,now,s.status==='running');const before=s.times[id]||0,after=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.round(value)));
 if(before===after)return input;s.times[id]=after;s.used=true;s.undo=[];s.log=[...s.log,{type:'edit',player:id,before,after,at:now}].slice(-MAX_LOG);return s;
}
// 기록 저장 후: 모든 시계를 멈추고 이 기록에 연결한다.
export function finishTimer(input,now,recordId){
 if(!input.used)return input;const s=clone(input);closeTurn(s,now);s.game=stop(s.game,now);s.shared=stop(s.shared,now);s.pause=stop(s.pause,now);s.status='ended';s.pausedFrom='';s.sharedFrom='';s.undo=[];s.savedRecordId=recordId;return s;
}
export function resetTimer(input){const s=createTimer(input.order,{autoStart:input.autoStart});s.starter=input.starter&&input.order.includes(input.starter)?input.starter:'';if(s.starter){s.firstStarter=s.starter;s.current=s.starter;}return s;}
// 점수판 플레이어가 바뀌면 순서를 맞춘다. 새 플레이어는 끝에 붙이고, 빠진 플레이어가 현재 턴이면 턴을 닫고 다음 사람을 대기시킨다.
export function syncPlayers(input,now,ids){
 const valid=ids.filter(id=>ID.test(id));if(!valid.length)return input.order.length||input.used?resetTimer({...createTimer(),autoStart:input.autoStart}):input;
 const order=[...input.order.filter(id=>valid.includes(id)),...valid.filter(id=>!input.order.includes(id))];
 if(order.length===input.order.length&&order.every((id,index)=>id===input.order[index]))return input;
 if(input.status==='ended')return resetTimer({...input,order});
 const s=clone(input);
 if(s.current&&!order.includes(s.current)){
  const base=s.status==='paused'?s.pausedFrom:s.status,next=nextPlayer({...s,order:[...order],nextOverride:''},s.current)||order[0];closeTurn(s,now);s.current=next;
  if(base==='running'){if(s.status==='paused')s.pausedFrom='waiting';else s.status='waiting';}
 }
 s.order=order;s.passed=s.passed.filter(id=>order.includes(id));if(!order.includes(s.starter))s.starter='';if(!order.includes(s.nextOverride))s.nextOverride='';if(!s.current&&s.status!=='ended')s.current=firstActive({...s,order});
 s.undo=[];return s;
}
// 기록에 남길 요약. 타이머를 쓰지 않았거나 다른 기록에 이미 저장한 타이머면 넣지 않는다.
export function timerRecord(s,now,playerIds,recordId){
 if(!s.used||s.savedRecordId&&s.savedRecordId!==recordId)return undefined;
 const ids=playerIds.filter(id=>ID.test(id)),players={};for(const id of ids)players[id]=liveTime(s,id,now);
 const turns=s.turns.slice(-RECORD_TURNS).map((turn,index,list)=>({player:turn.player,round:turn.round,ms:turn.ms+(turn.open&&index===list.length-1&&s.run?Math.max(0,now-s.run):0)}));
 const pick=id=>ids.includes(id)?id:'';
 return {totalMs:gameTime(s,now),sharedMs:sharedTime(s,now),rounds:s.round,autoStart:s.autoStart,firstStarter:pick(s.firstStarter),starter:pick(s.starter),players,turns,log:s.log.slice(-MAX_LOG).map(({type,player,before,after})=>({type,player,...(type==='edit'?{before,after}:{after})}))};
}
// 기록 형식 검사(records-core createPlay에서 사용). 기존 기록에는 이 필드가 없다.
export function validTurnTimerRecord(t){
 const id=value=>typeof value==='string'&&ID.test(value),n=value=>Number.isSafeInteger(value)&&value>=0;
 if(!t||typeof t!=='object'||Array.isArray(t))return false;
 const keys=Object.keys(t);if(keys.some(key=>!['totalMs','sharedMs','rounds','autoStart','firstStarter','starter','players','turns','log'].includes(key)))return false;
 if(!n(t.totalMs)||!n(t.sharedMs)||!Number.isSafeInteger(t.rounds)||t.rounds<1||t.rounds>9999||typeof t.autoStart!=='boolean')return false;
 if(![t.firstStarter,t.starter].every(value=>value===''||id(value)))return false;
 if(!t.players||typeof t.players!=='object'||Array.isArray(t.players)||Object.keys(t.players).length>100||!Object.entries(t.players).every(([key,value])=>id(key)&&n(value)))return false;
 if(!Array.isArray(t.turns)||t.turns.length>RECORD_TURNS||!t.turns.every(turn=>turn&&Object.keys(turn).length===3&&id(turn.player)&&Number.isSafeInteger(turn.round)&&turn.round>=1&&turn.round<=9999&&n(turn.ms)))return false;
 return Array.isArray(t.log)&&t.log.length<=MAX_LOG&&t.log.every(item=>item&&(item.type==='edit'&&Object.keys(item).length===4&&id(item.player)&&n(item.before)&&n(item.after)||item.type==='undo'&&Object.keys(item).length===3&&typeof item.player==='string'&&typeof item.after==='string'));
}
export function copyTurnTimerRecord(t){return clone(t);}
// 00:00:00 형식(초 단위 표시).
export function formatDuration(value){const total=Math.floor(ms(value)/1000),h=Math.floor(total/3600),m=Math.floor(total/60)%60,sec=total%60;return [h,m,sec].map(part=>String(part).padStart(2,'0')).join(':');}
