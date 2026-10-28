import test from 'node:test';
import assert from 'node:assert/strict';
import {planBggExport,sendBggExport} from '../bgg-export.js';
import {bggPlayFingerprint} from '../bgg-play-format.js';

const play=(id,bggId='13',score=10)=>({id,game:{name:'Game',bggId},date:'2026-10-16',rule:'highest',players:[{name:'Me',score,color:'#52c7ef',isSelf:true},{name:'Other',score:5,color:'#ffcc00'}]});

test('bulk export sends new, changed and uncertain records but skips unchanged records',async()=>{
 const records=[play('new'),play('sent'),play('unknown'),play('pending'),play('missing','')];
 const uploads={sent:{status:'sent',bggPlayId:'99',fingerprint:await bggPlayFingerprint(records[1],'alice')},unknown:{status:'unknown'},pending:{status:'pending'}};
 const plan=await planBggExport(records,uploads,20,'alice');
 assert.deepEqual(plan.records.map(item=>item.id),['new','unknown','pending']);
 assert.deepEqual({already:plan.already,missingGame:plan.missingGame,needsReview:plan.needsReview},{already:1,missingGame:1,needsReview:2});
});

test('bulk export includes a previously sent record after its score changes',async()=>{
 const original=play('changed'),changed=play('changed','13',20),uploads={changed:{status:'sent',bggPlayId:'99',fingerprint:await bggPlayFingerprint(original,'alice')}};
 const plan=await planBggExport([changed],uploads,20,'alice');assert.deepEqual(plan.records.map(item=>item.id),['changed']);
});

test('bulk export limits each confirmed batch and reports remaining records',async()=>{
 const plan=await planBggExport(Array.from({length:23},(_,index)=>play(String(index))),{},20,'alice');
 assert.equal(plan.records.length,20);
 assert.equal(plan.remaining,3);
});

test('bulk export continues record errors but stops when the session or result is unsafe',async()=>{
 const calls=[],records=[play('bad'),play('ok'),play('limit'),play('never')];
 const result=await sendBggExport(records,async item=>{calls.push(item.id);if(item.id==='bad')throw Object.assign(Error('rejected'),{code:'BGG_POST_REJECTED'});if(item.id==='limit')throw Object.assign(Error('wait'),{code:'BGG_LOGIN_RATE_LIMIT'});return {posted:true};});
 assert.deepEqual(calls,['bad','ok','limit']);
 assert.deepEqual(result,{sent:1,unchanged:0,failed:2,lastError:'wait'});
});
test('Score native games are explicitly excluded from BGG export',async()=>{const native=play('native','');native.game.name='홀덤';const plan=await planBggExport([native,play('bgg')],{},20,'alice');assert.deepEqual(plan.records.map(item=>item.id),['bgg']);assert.equal(plan.scoreGame,1);assert.equal(plan.missingGame,0);});

test('unchanged records whose BGG play is missing from a later full import are sent again for the worker to verify',async()=>{
 const records=[play('gone'),play('there'),play('fresh'),{...play('older'),date:'2020-01-01'}];const [fg,ft,ff,old]=await Promise.all(records.map(r=>bggPlayFingerprint(r,'alice')));
 const uploads={gone:{status:'sent',bggPlayId:'91',fingerprint:fg,sentAt:100},there:{status:'sent',bggPlayId:'92',fingerprint:ft,sentAt:100},fresh:{status:'sent',bggPlayId:'93',fingerprint:ff,sentAt:900},older:{status:'sent',bggPlayId:'94',fingerprint:old}};
 const remote={plays:[{id:'92',date:'2026-10-01'}],fullAt:500};
 const plan=await planBggExport(records,uploads,20,'alice',new Map(),remote);
 assert.deepEqual(plan.records.map(p=>p.id),['gone']);assert.deepEqual([...plan.verify],['gone']);assert.equal(plan.missing,1);assert.equal(plan.already,3,'present, sent after the import, or older than the imported range');
 assert.equal((await planBggExport(records,uploads,20,'alice')).records.length,0,'no import, no verify');
});
