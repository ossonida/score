import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlay,validMightyRounds} from '../records-core.js';
import {mightyStats} from '../mighty-stats.js';

const players=['me','b','c','d','e'].map((id,i)=>({id,name:['나','하늘','소담','누리','다온'][i],color:'#ffcc00',score:0}));
const round=(lead,friend,bid,trump,result,points)=>({lead,friend,bid,trump,result,points});
const rounds=[
 round('me','b',14,'S','success',{me:4,b:2,c:-2,d:-2,e:-2}),
 round('c','me',15,'H','failure',{me:-3,b:3,c:-6,d:3,e:3}),
 round('d','',13,'none','failure',{me:2,b:2,c:2,d:-8,e:2}),
 round('me','c',16,'none','success',{me:16,b:-8,c:8,d:-8,e:-8})
];
const play=(id,date,list=rounds)=>{const totals={};for(const r of list)for(const [k,v]of Object.entries(r.points))totals[k]=(totals[k]||0)+v;return {...createPlay({game:{name:'Mighty',bggId:'172998'},date,rule:'highest',players:players.map(p=>({...p,score:totals[p.id]||0})),mightyRounds:list},id),createdAt:date+'T12:00:00.000Z'};};

test('mighty rounds are kept on highest-score records and rejected when malformed',()=>{
 const saved=play('m1','2026-10-24');assert.equal(saved.mightyRounds.length,4);assert.deepEqual(saved.mightyRounds[0],rounds[0]);
 assert.equal(validMightyRounds([]),false);assert.equal(validMightyRounds([{...rounds[0],bid:21}]),false);assert.equal(validMightyRounds([{...rounds[0],trump:'X'}]),false);
 assert.equal(validMightyRounds([{...rounds[0],friend:'me'}]),false,'lead cannot be their own friend');assert.equal(validMightyRounds([{...rounds[0],extra:1}]),false);
 assert.equal(validMightyRounds([{...rounds[0],points:{me:1.5}}]),false);
 assert.throws(()=>createPlay({game:{name:'Mighty'},date:'2026-10-24',rule:'cooperative',players,mightyRounds:rounds}),/마이티/);
 assert.equal(validMightyRounds([{...rounds[0],lead:'gone'}]),true,'a removed player keeps the record valid');
});

test('mighty personal stats count lead, friend and opponent results, partners and recent games',()=>{
 const a=play('m1','2026-10-17'),b=play('m2','2026-10-24',rounds.slice(0,2));
 const m=mightyStats([a,b].map(p=>({play:p,person:p.players[0]})));
 assert.equal(m.plays,2);assert.equal(m.rounds,6);assert.equal(m.total,19+1);
 assert.deepEqual({tries:m.lead.tries,wins:m.lead.wins,best:m.lead.bestBid,avg:m.lead.averageBid},{tries:3,wins:3,best:16,avg:(14+16+14)/3});
 assert.deepEqual([m.friend.tries,m.friend.wins,m.opponent.tries,m.opponent.defends],[2,0,1,1]);
 assert.equal(m.recent[0].play.id,'m2','newest first');assert.equal(m.recent[0].points,1);assert.equal(m.recent[0].rank,2,'ties share the better rank');assert.deepEqual([m.recent[1].leadWins,m.recent[1].leadTries,m.recent[1].rank],[2,2,1]);
 assert.deepEqual(m.partners.map(p=>[p.name,p.kind,p.count,p.wins]),[['하늘','mine',2,2],['소담','theirs',2,0],['소담','mine',1,1]]);
 assert.equal(mightyStats([{play:{...a,mightyRounds:undefined},person:a.players[0]}]).plays,0);
});

test('the next-round sessionId survives createPlay so backups keep round series',()=>{
 const base={game:{name:'Catan'},date:'2026-10-24',rule:'highest',players:[{id:'a',name:'A',color:'#ffffff',score:1}]};
 assert.equal(createPlay({...base,sessionId:'00000000-0000-4000-8000-000000000000'}).sessionId,'00000000-0000-4000-8000-000000000000');
 assert.throws(()=>createPlay({...base,sessionId:'a b'}),/연속 판/);assert.equal('sessionId' in createPlay(base),false);
});
