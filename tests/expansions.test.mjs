import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlay,isPlay} from '../records-core.js';
import {setRecordExpansions} from '../record-edit.js';
import {bggPlayForm,bggPlayFingerprint} from '../bgg-play-format.js';
import {checkedPlay,playFingerprint} from '../worker/play-upload.js';
import {gameDetails} from '../functions/game-details.js';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const {rememberMetadata,metadata,metadataFresh}=await import('../bgg-metadata.js');
const {expansionChoices,expansionLabel,lastExpansions}=await import('../expansion-picker.js');
const base={game:{name:'Catan',bggId:'13'},date:'2026-10-25',rule:'highest',players:[{id:'a',name:'A',score:10,color:'#ffffff'}]};
const seafarers={id:'325',name:'Catan: Seafarers'},cities={id:'926',name:'Catan: Cities & Knights'};

test('a play keeps used expansions and rejects malformed ones',()=>{
 const play=createPlay({...base,expansions:[seafarers,{id:'926',name:' Catan: Cities & Knights '}]},'p1');
 assert.deepEqual(play.expansions,[seafarers,cities]);assert.ok(isPlay(play));
 assert.equal(createPlay(base,'p2').expansions,undefined);
 for(const bad of [[],[{id:'x',name:'A'}],[seafarers,seafarers],[{id:'5',name:''}],Array.from({length:31},(_,i)=>({id:String(i+1),name:'E'+i}))])assert.throws(()=>createPlay({...base,expansions:bad},'p3'),/사용한 확장/);
});

test('editing expansions changes only that field and an empty list removes it',()=>{
 const play={...createPlay(base,'p1'),createdAt:'2026-10-25T00:00:00.000Z'};
 const added=setRecordExpansions(play,[seafarers]);assert.deepEqual(added.expansions,[seafarers]);assert.equal(added.players,play.players);assert.equal(added.date,play.date);
 assert.equal(setRecordExpansions(added,[seafarers]),added);
 assert.equal('expansions' in setRecordExpansions(added,[]),false);
});

test('BGG export notes expansions without changing plays that have none',async()=>{
 const plain={...createPlay(base,'p1')},withExp={...plain,expansions:[seafarers,cities]};
 assert.equal(bggPlayForm(plain,'me').get('comments'),'Recorded with Score Counter\n[ScoreCounter:p1]');
 assert.equal(bggPlayForm(withExp,'me').get('comments'),'Recorded with Score Counter\nExpansions: Catan: Seafarers, Catan: Cities & Knights\n[ScoreCounter:p1]');
 // 워커가 확장을 보존해야 앱이 계산한 지문과 같아져 같은 기록을 다시 보내지 않습니다.
 assert.deepEqual(checkedPlay(withExp).expansions,[seafarers,cities]);
 assert.equal(await playFingerprint(withExp,'me'),await bggPlayFingerprint(withExp,'me'));
 assert.throws(()=>checkedPlay({...withExp,expansions:[{id:'bad',name:'x'}]}),/INVALID_PLAY/);
});

test('BGG details mark which base game an expansion belongs to',()=>{
 const d=gameDetails({items:{item:[{'@_id':'325','@_type':'boardgameexpansion',name:[{'@_type':'primary','@_value':'Catan: Seafarers'}],link:[{'@_type':'boardgameexpansion','@_id':'13','@_value':'CATAN','@_inbound':'true'}]}]}})[0];
 assert.deepEqual(d.expands,[{id:'13',name:'CATAN'}]);assert.deepEqual(d.expansions,[]);
 rememberMetadata([{...d,domains:[]}]);assert.equal(metadata({bggId:'325'}).subtype,'boardgameexpansion');assert.deepEqual(metadata({bggId:'325'}).expands,[{id:'13',name:'CATAN'}]);assert.ok(metadataFresh({bggId:'325'}));
});

test('expansion choices carry collection tags and the last record preselects',()=>{
 rememberMetadata([{id:'13',name:'CATAN',domains:[],expansions:[seafarers,cities,{id:'1153',name:'Catan: Traders & Barbarians'}]}]);
 const choices=expansionChoices({name:'Catan',bggId:'13'},[{id:'926',owned:true},{id:'1153',wishlist:true}]);
 assert.deepEqual(choices.map(x=>[x.id,x.owned,x.wishlist]),[['325',false,false],['926',true,false],['1153',false,true]]);
 const older={...createPlay({...base,date:'2026-10-01',expansions:[seafarers]},'o'),createdAt:'2026-10-01T00:00:00.000Z'},newer={...createPlay({...base,date:'2026-10-20',expansions:[cities,{id:'9',name:'Gone'}]},'n'),createdAt:'2026-10-20T00:00:00.000Z'};
 assert.deepEqual(lastExpansions([older,newer],base.game,choices),[cities]);
 assert.deepEqual(lastExpansions([older,newer],base.game,choices,'n'),[seafarers]);
 assert.equal(expansionLabel([seafarers]),'+ Catan: Seafarers');assert.equal(expansionLabel([seafarers,cities]),'+ 확장 2');assert.equal(expansionLabel([]),'');
});
