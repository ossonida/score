import test from 'node:test';
import assert from 'node:assert/strict';
import {planBggExport,sendBggExport} from '../bgg-export.js';

const play=(id,bggId='13')=>({id,game:{name:'Game',bggId}});

test('bulk export sends only new records with BGG game IDs',()=>{
 const records=[play('new'),play('sent'),play('unknown'),play('pending'),play('missing','')];
 const uploads={sent:{status:'sent',bggPlayId:'99'},unknown:{status:'unknown'},pending:{status:'pending'}};
 const plan=planBggExport(records,uploads);
 assert.deepEqual(plan.records.map(item=>item.id),['new']);
 assert.deepEqual({already:plan.already,missingGame:plan.missingGame,needsReview:plan.needsReview},{already:1,missingGame:1,needsReview:2});
});

test('bulk export limits each confirmed batch and reports remaining records',()=>{
 const plan=planBggExport(Array.from({length:23},(_,index)=>play(String(index))),{},20);
 assert.equal(plan.records.length,20);
 assert.equal(plan.remaining,3);
});

test('bulk export continues record errors but stops when the session or result is unsafe',async()=>{
 const calls=[],records=[play('bad'),play('ok'),play('limit'),play('never')];
 const result=await sendBggExport(records,async item=>{calls.push(item.id);if(item.id==='bad')throw Object.assign(Error('rejected'),{code:'BGG_POST_REJECTED'});if(item.id==='limit')throw Object.assign(Error('wait'),{code:'BGG_LOGIN_RATE_LIMIT'});return {posted:true};});
 assert.deepEqual(calls,['bad','ok','limit']);
 assert.deepEqual(result,{sent:1,unchanged:0,failed:2,lastError:'wait'});
});
