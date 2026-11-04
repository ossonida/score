import test from 'node:test';
import assert from 'node:assert/strict';
import {createTimer,startTurn,endTurn,selectPlayer,setNext,togglePass,nextRound,pauseTimer,resumeTimer,toggleShared,undoTurn,setStarter,reorder,setAutoStart,editTime,finishTimer,syncPlayers,timerRecord,validTurnTimerRecord,liveTime,gameTime,sharedTime,nextPlayer,canUndo,formatDuration,loadTimer,setLimit,remainingTime,advanceRound,resetTimer} from '../turn-timer-core.js';

const base=(auto=false)=>setAutoStart(createTimer(['a','b','c']),auto);
const S=1000,T=ms=>1e9+ms;

test('manual start: end turn settles time and waits for the next player',()=>{
 let s=startTurn(base(),T(0));assert.equal(s.status,'running');assert.equal(s.current,'a');assert.equal(s.firstStarter,'a');
 assert.equal(liveTime(s,'a',T(5*S)),5*S);
 s=endTurn(s,T(7*S));assert.equal(s.status,'waiting');assert.equal(s.current,'b');assert.equal(s.times.a,7*S);
 assert.equal(liveTime(s,'b',T(20*S)),0,'waiting player is not measured');
 s=startTurn(s,T(20*S));s=endTurn(s,T(23*S));assert.equal(s.times.b,3*S);assert.equal(s.current,'c');
 assert.deepEqual(s.turns.map(t=>[t.player,t.ms]),[['a',7*S],['b',3*S]]);
});

test('double click on end turn never double counts',()=>{
 let s=startTurn(base(true),T(0));const index=s.turns.length-1;
 s=endTurn(s,T(4*S),index);const again=endTurn(s,T(4*S+50),index);
 assert.equal(again,s);assert.equal(s.current,'b');assert.equal(s.status,'running');assert.equal(s.times.a,4*S);
});

test('auto start runs the next player immediately and the same player resumes accumulation',()=>{
 let s=startTurn(base(true),T(0));s=endTurn(s,T(2*S));s=endTurn(s,T(5*S));s=endTurn(s,T(6*S));
 assert.equal(s.current,'a');s=endTurn(s,T(10*S));
 assert.equal(s.times.a,6*S);assert.equal(s.times.b,3*S);assert.equal(s.times.c,1*S);
});

test('only one personal timer runs and paused time is not counted',()=>{
 let s=startTurn(base(),T(0));s=pauseTimer(s,T(3*S));assert.equal(liveTime(s,'a',T(100*S)),3*S);
 s=resumeTimer(s,T(100*S));assert.equal(s.status,'running');assert.equal(liveTime(s,'a',T(102*S)),5*S);
 assert.equal(gameTime(s,T(102*S)),5*S,'pause excluded from game time');
 assert.equal(['a','b','c'].filter(id=>liveTime(s,id,T(110*S))!==liveTime(s,id,T(109*S))).length,1);
});

test('direct selection closes the running turn; selecting the running player again adds nothing',()=>{
 let s=startTurn(base(),T(0));assert.equal(selectPlayer(s,T(1*S),'a'),s);
 s=selectPlayer(s,T(4*S),'c');assert.equal(s.status,'waiting');assert.equal(s.current,'c');assert.equal(s.times.a,4*S);
 let auto=startTurn(base(true),T(0));auto=selectPlayer(auto,T(2*S),'c');assert.equal(auto.status,'running');assert.equal(auto.current,'c');
});

test('one-shot next player and consecutive turns',()=>{
 let s=startTurn(base(),T(0));s=setNext(s,'c');assert.equal(nextPlayer(s),'c');
 s=endTurn(s,T(S));assert.equal(s.current,'c');assert.equal(s.nextOverride,'');assert.equal(nextPlayer(s),'a','back to default order');
 s=startTurn(s,T(2*S));s=setNext(s,'c');s=endTurn(s,T(3*S));assert.equal(s.current,'c');s=startTurn(s,T(4*S));s=endTurn(s,T(6*S));
 assert.equal(s.times.c,3*S);assert.deepEqual(s.turns.map(t=>t.player),['a','c','c']);
});

test('pass skips players, all passed ends the round, next round never starts a timer',()=>{
 let s=startTurn(base(true),T(0));s=togglePass(s,T(S),'b');s=endTurn(s,T(2*S));assert.equal(s.current,'c');
 s=togglePass(s,T(3*S),'c');assert.equal(s.current,'a');assert.equal(s.status,'running');
 s=togglePass(s,T(4*S),'a');assert.equal(s.status,'roundEnd');assert.equal(s.run,0);
 const times={...s.times};s=nextRound(s,T(10*S));assert.equal(s.round,2);assert.deepEqual(s.passed,[]);assert.equal(s.status,'waiting');assert.deepEqual(s.times,times);
 s=togglePass(s,T(11*S),'b');s=togglePass(s,T(11*S),'b');assert.deepEqual(s.passed,[]);
});

test('next round starting player can be chosen while the round is over',()=>{
 let s=startTurn(base(),T(0));for(const id of ['b','c','a'])s=togglePass(s,T(S),id);assert.equal(s.status,'roundEnd');
 s=selectPlayer(s,T(2*S),'c');assert.equal(s.current,'c');assert.equal(s.status,'roundEnd');s=nextRound(s,T(3*S));assert.equal(s.current,'c');
});

test('starter flag: first starter is kept, order is not changed',()=>{
 let s=setStarter(base(),'b');assert.equal(s.current,'b');s=startTurn(s,T(0));assert.equal(s.firstStarter,'b');
 s=setStarter(s,'c');assert.equal(s.firstStarter,'b');assert.equal(s.starter,'c');assert.deepEqual(s.order,['a','b','c']);assert.equal(s.status,'running');assert.equal(s.current,'b');
});

test('reordering keeps running timer and applies from the next turn',()=>{
 let s=startTurn(base(),T(0));s=reorder(s,['a','c','b']);assert.equal(s.status,'running');assert.equal(liveTime(s,'a',T(3*S)),3*S);
 s=endTurn(s,T(3*S));assert.equal(s.current,'c');assert.equal(reorder(s,['a','b']),s);
});

test('undo restores the previous player and drops auto-started time',()=>{
 let s=startTurn(base(true),T(0));s=endTurn(s,T(5*S));assert.equal(canUndo(s),true);
 s=undoTurn(s,T(8*S));assert.equal(s.current,'a');assert.equal(s.status,'running');
 assert.equal(liveTime(s,'a',T(8*S)),8*S,'previous player continues from the original start');assert.equal(liveTime(s,'b',T(8*S)),0);
 assert.deepEqual(s.turns.map(t=>[t.player,t.open]),[['a',true]]);assert.equal(s.log.at(-1).type,'undo');
 s=endTurn(s,T(9*S));assert.equal(s.times.a,9*S);
});

test('undo after a pause excludes the paused interval',()=>{
 let s=startTurn(base(true),T(0));s=endTurn(s,T(5*S));s=pauseTimer(s,T(6*S));assert.equal(canUndo(s),false);s=resumeTimer(s,T(60*S));
 s=undoTurn(s,T(61*S));assert.equal(liveTime(s,'a',T(61*S)),7*S);assert.equal(gameTime(s,T(61*S)),7*S);
});

test('shared time is outside personal time but inside game time',()=>{
 let s=startTurn(base(),T(0));s=toggleShared(s,T(2*S));assert.equal(s.status,'shared');assert.equal(liveTime(s,'a',T(50*S)),2*S);
 s=toggleShared(s,T(12*S));assert.equal(s.status,'running');assert.equal(s.current,'a');
 assert.equal(sharedTime(s,T(20*S)),10*S);assert.equal(gameTime(s,T(20*S)),20*S);assert.equal(liveTime(s,'a',T(20*S)),10*S);
});

test('manual time edit settles first, blocks negatives and logs before and after',()=>{
 let s=startTurn(base(),T(0));s=editTime(s,T(10*S),'a',3*S);assert.equal(liveTime(s,'a',T(10*S)),3*S);assert.equal(liveTime(s,'a',T(12*S)),5*S);
 s=editTime(s,T(12*S),'b',-500);assert.equal(s.times.b||0,0);
 s=editTime(s,T(13*S),'c',61*S);assert.deepEqual(s.log.map(({type,player,before,after})=>[type,player,before,after]),[['edit','a',10*S,3*S],['edit','c',0,61*S]]);
});

test('clock going backwards never makes negative time',()=>{
 let s=startTurn(base(),T(10*S));assert.equal(liveTime(s,'a',T(5*S)),0);s=endTurn(s,T(5*S));assert.equal(s.times.a,0);
});

test('board player changes keep times by id and close a removed current turn',()=>{
 let s=startTurn(base(),T(0));s=syncPlayers(s,T(4*S),['b','c','d']);assert.deepEqual(s.order,['b','c','d']);assert.equal(s.status,'waiting');assert.equal(s.current,'b');assert.equal(s.times.a,4*S);
 assert.equal(syncPlayers(s,T(5*S),['b','c','d']),s);
 const empty=syncPlayers(s,T(5*S),[]);assert.equal(empty.used,false);assert.deepEqual(empty.order,[]);
});

test('record summary is stored by player id, validated and not reused for another record',()=>{
 let s=setStarter(base(true),'b');s=startTurn(s,T(0));s=endTurn(s,T(3*S));s=toggleShared(s,T(4*S));s=toggleShared(s,T(6*S));s=editTime(s,T(7*S),'a',0);
 const record=timerRecord(s,T(9*S),['a','b','c'],undefined);
 assert.ok(validTurnTimerRecord(record),JSON.stringify(record));
 assert.equal(record.totalMs,9*S);assert.equal(record.sharedMs,2*S);assert.equal(record.firstStarter,'b');assert.deepEqual(record.players,{a:0,b:3*S,c:4*S});
 assert.deepEqual(record.turns,[{player:'b',round:1,ms:3*S},{player:'c',round:1,ms:4*S}]);
 assert.equal(timerRecord(base(),T(0),['a'],undefined),undefined,'unused timer is not saved');
 const done=finishTimer(s,T(9*S),'play-1');assert.equal(done.status,'ended');assert.equal(liveTime(done,'c',T(99*S)),4*S);
 assert.ok(timerRecord(done,T(99*S),['a','b','c'],'play-1'));assert.equal(timerRecord(done,T(99*S),['a','b','c'],undefined),undefined);
 assert.equal(validTurnTimerRecord({...record,players:{'bad id':1}}),false);assert.equal(validTurnTimerRecord({...record,extra:1}),false);
 const restarted=syncPlayers(done,T(100*S),['x','y']);assert.equal(restarted.status,'idle');assert.equal(restarted.used,false);
});

test('broken storage falls back to a fresh timer and durations show seconds',()=>{
 assert.equal(loadTimer({v:2}).status,'idle');assert.equal(loadTimer(null).status,'idle');
 assert.equal(formatDuration(3723999),'01:02:03');assert.equal(formatDuration(-5),'00:00:00');
});

test('turn limit: warn keeps counting past zero, stop freezes the player at the limit and a new turn gets a fresh limit',()=>{
 const M=60*S;let s=setLimit(base(),T(0),{mode:'turn',minutes:1});assert.equal(remainingTime(s,T(0),'a'),M,'no turn yet shows the full limit');
 s=startTurn(s,T(0));assert.equal(remainingTime(s,T(70*S)),-10*S);assert.equal(liveTime(s,'a',T(70*S)),70*S,'warn keeps measuring');
 let stop=setLimit(s,T(30*S),{over:'stop'});assert.equal(liveTime(stop,'a',T(30*S)),30*S,'change settles first');
 assert.equal(liveTime(stop,'a',T(90*S)),M);assert.equal(remainingTime(stop,T(90*S)),0);assert.ok(gameTime(stop,T(90*S))>M,'game time keeps running');
 stop=endTurn(stop,T(100*S));assert.equal(stop.times.a,M);assert.equal(stop.turns[0].ms,M);
 stop=startTurn(stop,T(100*S));assert.equal(remainingTime(stop,T(110*S)),50*S,'next turn starts with a fresh limit');
});
test('game limit is shared across turns and survives reset; old saves load without a limit',()=>{
 let s=setLimit(base(true),T(0),{mode:'game',minutes:2,over:'stop'});s=startTurn(s,T(0));s=endTurn(s,T(90*S));
 s=endTurn(s,T(100*S));s=endTurn(s,T(110*S));assert.equal(s.current,'a');assert.equal(remainingTime(s,T(140*S)),0);assert.equal(liveTime(s,'a',T(200*S)),120*S);
 assert.deepEqual(resetTimer(s).limit,{mode:'game',minutes:2,over:'stop'});
 const old=createTimer(['a']);delete old.limit;assert.equal(loadTimer(old).limit.mode,'none');
 assert.equal(setLimit(s,T(0),{minutes:0}),s,'invalid minutes are ignored');
});
test('next round from settings closes the open turn without everyone passing and can be undone',()=>{
 let s=startTurn(base(),T(0));s=togglePass(s,T(S),'c');s=advanceRound(s,T(10*S));
 assert.equal(s.round,2);assert.deepEqual(s.passed,[]);assert.equal(s.status,'waiting');assert.equal(s.current,'a');assert.equal(s.times.a,10*S);assert.equal(s.turns.at(-1).open,undefined);
 s=undoTurn(s,T(12*S));assert.equal(s.round,1);assert.equal(s.status,'running');assert.deepEqual(s.passed,['c']);
 assert.equal(advanceRound(pauseTimer(s,T(13*S)),T(14*S)).round,1,'paused timer does not advance');
});
