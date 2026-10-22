import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalyticsGate,isExcludedEmail} from '../analytics-policy.js';
import {createFeatureAnalytics,playerCountBucket} from '../analytics-events.js';
function app({storage=new Map(),search='',isExcluded=async email=>email==='internal@example.invalid'}={}){let starts=0,disabled;const gate=createAnalyticsGate({storage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},search,isExcluded,start:()=>{starts++;disabled=false;},stop:()=>{disabled=true;}});return {gate,storage,get starts(){return starts;},get disabled(){return disabled;}};}
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
