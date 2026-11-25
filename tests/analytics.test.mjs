import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalyticsGate,isExcludedEmail,isTestEnvironment} from '../analytics-policy.js';
import {analyticsUserProperties,armUntilTaskEnd,createFeatureAnalytics,playerCountBucket,recordBucket} from '../analytics-events.js';
function app({storage=new Map(),search='',testEnvironment=false,isExcluded=async email=>email==='internal@example.invalid'}={}){let starts=0,disabled;const gate=createAnalyticsGate({storage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},search,isExcluded,testEnvironment,start:()=>{starts++;disabled=false;},stop:()=>{disabled=true;}});return {gate,storage,get starts(){return starts;},get disabled(){return disabled;}};}
test('GA stays disabled until auth is restored, then starts once for ordinary visitors',async()=>{const a=app();assert.equal(a.starts,0);assert.equal(a.disabled,true);await a.gate.onAuthState(null);await a.gate.onAuthState({email:'visitor@example.invalid'});assert.equal(a.starts,1);assert.equal(a.disabled,false);});
test('excluded accounts never start GA and their browser stays excluded after logout/reload',async()=>{const a=app();await a.gate.onAuthState({email:'internal@example.invalid'});await a.gate.onAuthState(null);assert.equal(a.starts,0);assert.equal(a.disabled,true);const b=app({storage:a.storage});await b.gate.onAuthState(null);assert.equal(b.starts,0);});
test('signing into an excluded account stops collection already started anonymously',async()=>{const a=app();await a.gate.onAuthState(null);assert.equal(a.disabled,false);await a.gate.onAuthState({email:'internal@example.invalid'});assert.equal(a.disabled,true);await a.gate.onAuthState(null);assert.equal(a.starts,1);assert.equal(a.disabled,true);});
test('explicit browser opt-out works before any sign-in',async()=>{const a=app({search:'?analytics=off'});await a.gate.onAuthState(null);assert.equal(a.starts,0);assert.equal(a.disabled,true);assert.equal(a.storage.get('score.analytics.exclude.v1'),'1');});

test('feature analytics emits the funnel in order and deduplicates milestones',()=>{
 const events=[],storage=new Map(),analytics=createFeatureAnalytics({storage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},send:(name,params)=>events.push([name,params])});
 analytics.setup('game_setup');analytics.setup('game_setup');analytics.playerAdded('game_setup',3);analytics.gameStarted('score',3);analytics.scoreChanged('increase','step');analytics.scoreChanged('decrease','direct');analytics.gameEndStarted('score');analytics.gameEnded('score','saved');analytics.gameEnded('score','saved');
 assert.deepEqual(events.map(([name])=>name),['setup_started','player_added','game_started','first_score_changed','score_changed','score_changed','game_end_started','game_ended']);
 assert.equal(events[1][1].player_count,'3-4');
});

test('restored first-score state does not emit an automatic or duplicate milestone',()=>{
 const events=[],storage=new Map([['score.analytics.firstScore.v1','1']]),analytics=createFeatureAnalytics({storage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},send:(name,params)=>events.push([name,params])});
 assert.deepEqual(events,[]);analytics.scoreChanged('increase','step');assert.deepEqual(events.map(([name])=>name),['score_changed']);
});

test('record changes keep only documented enum parameters',()=>{
 const events=[],analytics=createFeatureAnalytics({send:(name,params)=>events.push([name,params])});
 analytics.track('record_changed',{change_type:'score',player_name:'private'});analytics.track('record_changed',{change_type:'memo text'});
 assert.deepEqual(events,[['record_changed',{change_type:'score'}]]);
 assert.deepEqual([1,2,3,4,5,20].map(playerCountBucket),['1','2','3-4','3-4','5+','5+']);
});
test('late auth results cannot re-enable collection after an excluded account signs in',async()=>{let release;const a=app({isExcluded:email=>email==='slow@example.invalid'?new Promise(r=>release=r):Promise.resolve(true)});const pending=a.gate.onAuthState({email:'slow@example.invalid'});await a.gate.onAuthState({email:'internal@example.invalid'});release(false);await pending;assert.equal(a.starts,0);assert.equal(a.disabled,true);});
test('email check failure leaves analytics disabled',async()=>{const a=app({isExcluded:async()=>{throw Error('Unavailable crypto');}});await a.gate.onAuthState({email:'visitor@example.invalid'});assert.equal(a.starts,0);assert.equal(a.disabled,true);assert.equal(await isExcludedEmail(null),false);assert.equal(await isExcludedEmail('visitor@example.invalid'),false);});
test('record_changed.change_type maps every saved-record edit field and drops unknown fields',()=>{
 const events=[],analytics=createFeatureAnalytics({send:(name,params)=>events.push([name,params])});
 for(const field of ['name','score','result','cooperativeResult','sharedScore','memo'])analytics.recordChanged(field);
 analytics.recordPlayerRemoved();
 assert.deepEqual(events,[['record_changed',{change_type:'name'}],['record_changed',{change_type:'score'}],['record_changed',{change_type:'result'}],['record_changed',{change_type:'cooperative_result'}],['record_changed',{change_type:'shared_score'}],['record_changed',{change_type:'player_removed'}],['player_removed',{context:'record'}]]);
});
test('a game ends once even when save and discard both complete, and coop is normalized',()=>{
 const events=[],analytics=createFeatureAnalytics({send:(name,params)=>events.push([name,params])});
 analytics.gameStarted('cooperative',2);analytics.gameEnded('coop','saved');analytics.gameEnded('coop','discarded');
 analytics.resetGame();analytics.gameEnded('win','discarded');
 assert.deepEqual(events.slice(1),[['game_ended',{mode:'cooperative',outcome:'saved'}],['game_ended',{mode:'win',outcome:'discarded'}]]);
});
test('screen and feature events accept only documented enums',()=>{
 const events=[],analytics=createFeatureAnalytics({send:name=>events.push(name)});
 analytics.track('screen_viewed',{screen:'settings'});analytics.track('screen_viewed',{screen:'/private/path'});analytics.feature('settings','identity_changed');analytics.feature('settings','nickname=홍길동');
 assert.deepEqual(events,['screen_viewed','feature_used']);
});
test('a blocked GA sender never breaks the calling feature',()=>{
 const analytics=createFeatureAnalytics({send:()=>{throw Error('blocked');}});
 assert.equal(analytics.recordChanged('score'),false);assert.equal(analytics.feature('bgg','import_completed'),false);
});
test('a visitor can turn analytics off and on again; the choice survives reload and is separate from developer exclusion',async()=>{let starts=0,resumes=0,disabled;const storage=new Map(),make=()=>createAnalyticsGate({storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},isExcluded:async()=>false,start:()=>{starts++;disabled=false;},stop:()=>{disabled=true;},resume:()=>{resumes++;disabled=false;}});
 const a=make();await a.onAuthState(null);assert.equal(starts,1);assert.equal(a.enabled(),true);
 a.setEnabled(false);assert.equal(disabled,true);assert.equal(storage.get('score.analytics.optout.v1'),'1');assert.equal(storage.get('score.analytics.exclude.v1'),undefined);
 const b=make();await b.onAuthState(null);assert.equal(starts,1,'opted-out visitors do not start GA after reload');assert.equal(b.enabled(),false);
 b.setEnabled(true);assert.equal(starts,2);assert.equal(disabled,false);b.setEnabled(false);b.setEnabled(true);assert.equal(resumes,1,'turning it back on resumes the loaded GA');});

test('a pending board action survives the microtasks a real tap runs before the button handler', async () => {
  let pending=null;
  armUntilTaskEnd(()=>pending,next=>{pending=next;},{type:'score'});
  // 실제 터치: 캡처 리스너 → (스택이 비어) 마이크로태스크 → 버튼 onclick → scorecounter:changed
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(pending,{type:'score'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(pending,null);
  const next={type:'score'};armUntilTaskEnd(()=>pending,value=>{pending=value;},next);pending={type:'player_remove'};
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(pending,{type:'player_remove'});
});

test('local dev hosts and automated browsers never start GA, without marking the device excluded', async () => {
  assert.equal(isTestEnvironment({hostname:'localhost'}),true);
  assert.equal(isTestEnvironment({hostname:'127.0.0.1'}),true);
  assert.equal(isTestEnvironment({hostname:'ossonida.github.io',webdriver:true}),true);
  assert.equal(isTestEnvironment({hostname:'ossonida.github.io',userAgent:'Mozilla/5.0 HeadlessChrome/131.0'}),true);
  assert.equal(isTestEnvironment({hostname:'ossonida.github.io',webdriver:false,userAgent:'Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile'}),false);
  const a=app({testEnvironment:true});await a.gate.onAuthState(null);await a.gate.onAuthState({email:'visitor@example.invalid'});
  assert.equal(a.starts,0);assert.equal(a.disabled,true);assert.equal(a.storage.get('score.analytics.exclude.v1'),undefined);
  a.gate.setEnabled(true);assert.equal(a.starts,0);
});

test('user properties are coarse buckets and enums only', () => {
  assert.deepEqual(['0','1','2-4','5-19','20+'],[0,1,4,19,20].map(recordBucket));
  const modes={a:'highest',b:'lowest',c:'win',d:'unknown'};
  const values=analyticsUserProperties({records:[{m:'a'},{m:'b'},{m:'c'},{m:'d'}],signedIn:true,standalone:true,bggLinked:false,lang:'en',modeOf:play=>modes[play.m]});
  assert.deepEqual(values,{display_mode:'standalone',signed_in:'yes',record_bucket:'2-4',main_mode:'score',bgg_linked:'no',ui_lang:'en'});
  assert.deepEqual(analyticsUserProperties({}),{display_mode:'browser',signed_in:'no',record_bucket:'0',main_mode:'none',bgg_linked:'no',ui_lang:'ko'});
});

test('first_game_saved accepts only a known mode', () => {
  const events=[],analytics=createFeatureAnalytics({storage:{getItem:()=>null,setItem(){}},send:(name,params)=>events.push([name,params])});
  analytics.track('first_game_saved',{mode:'cooperative'});analytics.track('first_game_saved',{mode:'mighty'});analytics.track('first_game_saved',{});
  assert.deepEqual(events,[['first_game_saved',{mode:'cooperative'}]]);
});
