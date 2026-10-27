import test from 'node:test';import assert from 'node:assert/strict';
import {restorablePlay} from '../bgg-restore.js';
import {createPlay,isPlay} from '../records-core.js';
const base={id:'9001',gameId:'13',name:'CATAN',date:'2026-10-24',quantity:1};
const restore=row=>{const raw=restorablePlay(row,'alice');return raw&&{...createPlay(raw,raw.id),createdAt:raw.date+'T12:00:00.000Z'};};
test('restores Score Counter plays from BGG with rule, winners, self and location',()=>{
 const scored=restore({...base,score:{id:'abc-1',location:'Cafe',note:'[ScoreCounter:abc-1]',known:true},players:[{name:'나',username:'Alice',score:10,win:true,color:'#52c7ef'},{name:'민수',username:'',score:7,win:false,color:'Red'}]});
 assert.ok(isPlay(scored));assert.equal(scored.id,'abc-1');assert.equal(scored.rule,'highest');assert.equal(scored.location,'Cafe');assert.equal(scored.players[0].isSelf,true);assert.match(scored.players[1].color,/^#[0-9a-f]{6}$/);assert.equal(scored.game.bggId,'13');
 assert.equal(restore({...base,score:{id:'abc-2',note:'',known:true},players:[{name:'A',score:3,win:true},{name:'B',score:9,win:false}]}).rule,'lowest');
 const wins=restore({...base,score:{id:'abc-3',note:'',known:true},players:[{name:'A',score:null,win:true},{name:'B',score:null,win:false}]});assert.deepEqual(wins.players.map(p=>p.winner),[true,false]);
 const coop=restore({...base,score:{id:'abc-4',note:'Recorded with Score Counter\nScenario 3\n[ScoreCounter:abc-4]',known:false},players:[{name:'A',score:null,win:false},{name:'B',score:null,win:false}]});
 assert.equal(coop.rule,'cooperative');assert.equal('cooperativeResult' in coop,false);assert.equal('scenario' in coop,false);
 assert.equal(restorablePlay({...base,players:[{name:'A'}]}),null,'plays not exported by Score Counter are ignored');
 assert.equal(restorablePlay({...base,score:{id:'bad id!'},players:[{name:'A'}]}),null);
});
