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

test('recap data hides other names, keeps me and finds the rival',()=>{
 const records=[play('1','2026-10-01'),play('2','2026-10-02','카탄',{players:[{id:'a',name:'나',score:20,winner:false},{id:'b',name:'김민수',score:25,winner:true}]}),play('3','2026-10-03'),play('4','2026-10-04','카탄',{players:[{id:'a',name:'나',score:9,winner:false},{id:'b',name:'김민수',score:10,winner:true}]})];
 const data=recapData(records,month,profile,{locale:'ko-KR'});
 assert.deepEqual([data.rival.name,data.rival.mine,data.rival.theirs,data.rival.results.join('')],['김**',2,2,'wlwl']);
 assert.ok(data.personRows.every(row=>row.name!=='김민수'));
 assert.deepEqual([data.close.gap,data.best.score,data.best.who],[1,30,'나']);
 assert.equal(recapData(records,month,profile,{locale:'ko-KR',mask:false}).rival.name,'김민수');
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
