import test from 'node:test';
import assert from 'node:assert/strict';
import {readIdentity,saveIdentity,hasPendingIdentity,syncIdentity} from '../personal-stats.js';

const profile={primary:'나',aliases:['옛이름']};
function storage(){
 const data=new Map();
 globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 return data;
}
test('legacy local identity uploads, fresh devices restore, and clean devices accept remote changes',async()=>{
 storage();saveIdentity('owner',profile);let remote=null,writes=0;
 const cloud={load:async()=>remote,save:async value=>{remote=value;writes++;}};
 assert.equal(hasPendingIdentity('owner'),true);await syncIdentity('owner',cloud);
 assert.deepEqual(remote,profile);assert.equal(hasPendingIdentity('owner'),false);
 storage();await syncIdentity('owner',cloud);assert.deepEqual(readIdentity('owner'),profile);assert.equal(writes,1);
 remote={primary:'새이름',aliases:['나']};await syncIdentity('owner',cloud);
 assert.deepEqual(readIdentity('owner'),remote);assert.equal(hasPendingIdentity('owner'),false);
});
test('explicit clearing and edits during a cloud read win over the downloaded identity',async()=>{
 storage();saveIdentity('owner',profile);
 const cleared={primary:'',aliases:[]};let uploaded;
 await syncIdentity('owner',{load:async()=>{saveIdentity('owner',cleared);return profile;},save:async value=>{uploaded=value;}});
 assert.deepEqual(uploaded,cleared);assert.deepEqual(readIdentity('owner'),cleared);
 assert.equal(hasPendingIdentity('owner'),false);
});
test('failed writes and newer edits during upload remain pending for retry',async()=>{
 storage();saveIdentity('owner',profile);
 await assert.rejects(syncIdentity('owner',{load:async()=>null,save:async()=>{throw Error('offline');}}),/offline/);
 assert.deepEqual(readIdentity('owner'),profile);assert.equal(hasPendingIdentity('owner'),true);
 const next={primary:'새이름',aliases:[]};
 await syncIdentity('owner',{load:async()=>null,save:async()=>{saveIdentity('owner',next);}});
 assert.deepEqual(readIdentity('owner'),next);assert.equal(hasPendingIdentity('owner'),true);
 let uploaded;await syncIdentity('owner',{load:async()=>profile,save:async value=>{uploaded=value;}});
 assert.deepEqual(uploaded,next);assert.equal(hasPendingIdentity('owner'),false);
});
test('account switches discard late downloads and do not acknowledge late uploads',async()=>{
 storage();saveIdentity('guest',profile);saveIdentity('other',{primary:'다른계정',aliases:[]});
 let current=true,writes=0;
 await syncIdentity('owner',{load:async()=>{current=false;return profile;},save:async()=>{writes++;},isCurrent:()=>current});
 assert.equal(readIdentity('owner'),null);assert.equal(writes,0);
 saveIdentity('owner',profile);current=true;
 await syncIdentity('owner',{load:async()=>null,save:async()=>{current=false;},isCurrent:()=>current});
 assert.equal(hasPendingIdentity('owner'),true);
 assert.deepEqual(readIdentity('guest'),profile);assert.equal(readIdentity('other').primary,'다른계정');
});
test('invalid remote settings and local storage failures preserve retryable local preferences',async()=>{
 const data=storage();saveIdentity('owner',profile);const before=[...data];
 await assert.rejects(syncIdentity('owner',{load:async()=>({primary:1,aliases:[]}),save:async()=>assert.fail('invalid remote must not be overwritten')}),/닉네임/);
 assert.deepEqual([...data],before);
 localStorage.setItem=()=>{throw Error('quota');};
 await assert.rejects(syncIdentity('owner',{load:async()=>null,save:async()=>{}}),/quota/);
 assert.deepEqual(readIdentity('owner'),profile);assert.equal(hasPendingIdentity('owner'),true);
});
