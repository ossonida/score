import test from 'node:test';
import assert from 'node:assert/strict';
import {savingPlayers,withSelf,selectedSelf,savedPlayerChoices} from '../player-memory.js';
import {meIn,namesIn,personalGame} from '../personal-stats.js';
import {createPlay,gameStats} from '../records-core.js';
const people=[{id:'a',name:'Sky',autoName:'Sky',color:'#52c7ef',score:15},{id:'b',name:'친구',autoName:'',color:'#ffcc00',score:10}];
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const game=players=>createPlay({game:{name:'카탄'},date:'2026-10-15',rule:'highest',players});
test('untouched auto names become anonymous; manually renamed players keep their names and live board is untouched',()=>{const saved=savingPlayers(people,'a');assert.equal(saved[0].name,'익명의 플레이어');assert.equal(saved[0].anonymous,true);assert.equal(saved[1].name,'친구');assert.equal(people[0].name,'Sky');const p=game(saved);assert.equal(p.players[0].isSelf,true);assert.equal(p.players[0].anonymous,true);assert.equal('autoName' in p.players[0],false);});
test('per-record self assignment identifies an anonymous player and overrides name matching',()=>{const p=game(savingPlayers(people,''));assert.equal(meIn(p,{primary:'친구',aliases:[]}).id,'b');const updated=withSelf(p,'a');assert.equal(meIn(updated,null).id,'a');assert.equal(personalGame([updated],null).total,1);assert.equal(meIn(p,null),null);assert.throws(()=>withSelf(p,'invalid'));assert.equal(gameStats([p])[0].players.length,1);assert.deepEqual(namesIn([p]).map(x=>x[1]),['친구']);});
test('anonymous names never link different people; explicit self survives serialization',()=>{const saved=savingPlayers([...people,{id:'c',name:'Sea',autoName:'Sea',score:3,color:'#aa33dd'}],'c'),p=game(saved);const decoded=JSON.parse(JSON.stringify(p));assert.equal(meIn(decoded,null).id,'c');assert.equal(personalGame([decoded],null).opponents.length,1);assert.equal(withSelf(p,'b').players.filter(p=>p.isSelf).length,1);});
test('live self selection cannot silently follow a different account',()=>{const board=people.map(p=>({...p,isSelf:p.id==='a',selfScope:'one'}));assert.equal(selectedSelf(board,'one'),'a');assert.equal(selectedSelf(board,'two'),'');});

test('saved player choices use recent unique names and exclude anonymous and untouched generated players',()=>{const rows=[{date:'2026-10-15',createdAt:'2026-10-15T00:00:00Z',players:[{name:'sky'},{name:'익명의 플레이어'},{name:'Generated',autoName:'Generated'},{name:'Hidden',anonymous:true}]},{date:'2026-10-16',createdAt:'2026-10-16T00:00:00Z',players:[{name:' Sky '},{name:'친구'},{name:'Anonymous player'}]}];assert.deepEqual(savedPlayerChoices(rows),[{name:'Sky'},{name:'친구'}]);assert.equal(rows[0].date,'2026-10-15');assert.deepEqual(savedPlayerChoices([]),[]);});
