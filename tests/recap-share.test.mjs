import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={createElement:()=>({})};
const {maskName,recapData,recapPlan,recapTrait,recapCopy}=await import('../recap-share.js');
const play=(id,date,game='카탄',extra={})=>({id,date,createdAt:date+'T12:00:00Z',game:{name:game,bggId:''},rule:'highest',players:[{id:'a',name:'나',score:30,winner:true},{id:'b',name:'김민수',score:28,winner:false}],...extra});
const month={preset:'month',title:'2026년 10월',label:'이전 달',current:{start:'2026-10-01',end:'2026-10-31'},previous:{start:'2026-09-01',end:'2026-09-30'}};
const profile={primary:'나',aliases:[]};

test('mask keeps the first letter and hides the rest with up to three stars',()=>{
 assert.equal(maskName('민수'),'민*');assert.equal(maskName('김민수'),'김**');assert.equal(maskName('Christopher'),'C***');assert.equal(maskName('J'),'J*');assert.equal(maskName(''),'');
});

test('public recap hides other names and the rival, friends recap shows them',()=>{
 const records=[play('1','2026-10-01'),play('2','2026-10-02','카탄',{players:[{id:'a',name:'나',score:20,winner:false},{id:'b',name:'김민수',score:25,winner:true}]}),play('3','2026-10-03'),play('4','2026-10-04','카탄',{players:[{id:'a',name:'나',score:9,winner:false},{id:'b',name:'김민수',score:10,winner:true}]})];
 const data=recapData(records,month,profile,{locale:'ko-KR'});
 assert.equal(data.rival,null,'public recap leaves out head-to-head');assert.ok(data.mask);
 const friends=recapData(records,month,profile,{locale:'ko-KR',scope:'friends'});
 assert.deepEqual([friends.rival.name,friends.rival.mine,friends.rival.theirs,friends.rival.results.join('')],['김민수',2,2,'wlwl']);
 assert.ok(data.personRows.every(row=>row.name!=='김민수'));
 assert.deepEqual([data.close.gap,data.best.score,data.best.who],[1,30,'나']);
 assert.ok(data.personRows.some(row=>row.name==='김**'));
});

test('carousel plan adds the cover wall for 9+ games and a second page for 18+',()=>{
 const many=n=>Array.from({length:n},(_,i)=>play('g'+i,'2026-10-'+String(1+i%28).padStart(2,'0'),'게임'+i));
 assert.deepEqual(recapPlan(recapData(many(3),month,profile,{locale:'ko'})),['cover','top','people','calendar','highlights']);
 assert.ok(recapPlan(recapData(many(9),month,profile,{locale:'ko'})).includes('wall'));
 assert.ok(!recapPlan(recapData(many(17),month,profile,{locale:'ko'})).includes('wall2'));
 assert.ok(recapPlan(recapData(many(18),month,profile,{locale:'ko'})).includes('wall2'));
 assert.ok(!recapPlan(recapData(many(3),{...month,preset:'all'},profile,{locale:'ko'})).includes('calendar'));
});

test('single recap picks one trait per period',()=>{
 const trait=records=>recapTrait(recapData(records,month,profile,{locale:'ko'})).kind;
 const before=Array.from({length:9},(_,i)=>play('o'+i,'2026-09-0'+(i+1),'아줄'));
 assert.equal(trait([...before,play('n','2026-10-02','아줄')]),'milestone');
 assert.equal(trait([play('1','2026-10-01','카탄'),play('2','2026-10-02','아줄')]),'firsts');
 const old=[play('x','2026-08-01','카탄'),play('y','2026-08-02','아줄')];
 assert.equal(trait([...old,...Array.from({length:5},(_,i)=>play('c'+i,'2026-10-1'+i,'카탄')),play('z','2026-10-20','아줄')]),'focus');
 const coop=i=>play('p'+i,'2026-10-0'+(i+1),i%2?'팬데믹':'카탄',i%2?{rule:'cooperative',cooperativeResult:'success',players:[{id:'a',name:'나',score:null}]}:{});
 assert.equal(trait([...old,{...play('pp','2026-08-03','팬데믹')},...Array.from({length:6},(_,i)=>coop(i))]),'coop');
 assert.equal(trait([...old,play('t1','2026-10-01','카탄'),play('t2','2026-10-02','아줄')]),'top');
});

test('english recap copy stays short and pluralizes',()=>{
 const words=recapCopy('en-US');
 assert.equal(words.title('October 2026'),'October 2026 Recap');
 assert.equal(words.wall('2026',1,2),'2026 · 1 game · 2 plays');
 assert.equal(words.compareHead(-1),'-1 play');assert.equal(words.compareHead(0),'No change');
 assert.equal(recapData([play('1','2026-10-01')],month,profile,{locale:'en-US'}).title,'October 2026 Recap');
});

test('people slide data: wins out of plays, variety, streak, new faces; milestones say what was reached',()=>{
 const p=(id,date,game,winner)=>({id,date,createdAt:date+'T12:00:00Z',game:{name:game,bggId:''},rule:'highest',players:['나','김민수','지영'].map((name,i)=>({id:'p'+i,name,score:null,winner:name===winner}))});
 const records=[p('old','2026-09-01','카탄','나'),...['카탄','아줄','스플렌더','카탄'].map((game,i)=>p('n'+i,'2026-10-0'+(i+1),game,'김민수'))];
 const data=recapData(records,month,profile,{locale:'ko-KR'});
 assert.deepEqual(data.personRows.map(row=>[row.title,row.name,row.value]),[['가장 많이 이긴 사람','김**','4승 / 4판'],['나와 가장 많이 함께한 사람','지*','4판']],'each row picks someone not shown yet');
 assert.deepEqual([data.newFaces,data.avgPlayers],[0,3]);
 assert.equal(recapCopy('ko').markDetail('plays','10월1일','카탄'),'10월1일 · 그 판: 카탄');assert.equal(recapCopy('ko').markDetail('days','10월1일','카탄'),'10월1일');
});

test('closest finish skips single-digit games; biggest win needs 10+ points',()=>{
 const small=[play('1','2026-10-01','카탄',{players:[{id:'a',name:'나',score:3,winner:true},{id:'b',name:'김민수',score:2,winner:false}]})];
 assert.equal(recapData(small,month,profile,{locale:'ko'}).close,null);
 const big=[play('2','2026-10-02','카탄',{players:[{id:'a',name:'나',score:40,winner:true},{id:'b',name:'김민수',score:12,winner:false}]})];
 const data=recapData(big,month,profile,{locale:'ko'});assert.equal(data.close.gap,28);assert.deepEqual([data.blow.gap,data.blow.who],[28,'나']);
});

test('people filter: title names them, milestones and newly logged are left out, rival comes from the chosen people',()=>{
 const p=(id,date,names,winner)=>({id,date,createdAt:date+'T12:00:00Z',game:{name:'카탄',bggId:''},rule:'highest',players:names.map((name,i)=>({id:'p'+i,name,score:null,winner:name===winner}))});
 const records=[...Array.from({length:4},(_,i)=>p('a'+i,'2026-10-0'+(i+1),['나','김민수','지영'],i%2?'나':'지영')),...Array.from({length:6},(_,i)=>p('b'+i,'2026-10-1'+i,['나','지영'],'지영'))];
 const people={keys:['김민수'],names:['김민수'],mode:'any'};
 const data=recapData(records.filter(play=>play.players.some(x=>x.name==='김민수')),{...month,people},profile,{locale:'ko-KR',scope:'friends'});
 assert.equal(data.title,'2026년 10월 결산 · 김민수');assert.deepEqual([data.marks.length,data.firsts.length],[0,0]);
 assert.equal(data.rival.name,'김민수','rival is a chosen person even if someone else played more');
 assert.equal(recapData(records,{...month,people},profile,{locale:'ko-KR'}).title,'2026년 10월 결산 · 김**');
});
