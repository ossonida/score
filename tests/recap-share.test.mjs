import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={createElement:()=>({})};
const {maskName,recapData,recapPlan,recapCopy}=await import('../recap-share.js');
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
 assert.deepEqual([data.close.gap,data.best.score,data.best.who],[1,30,'나*']);
 assert.ok(data.personRows.some(row=>row.name==='김**'));
});

test('carousel plan adds the cover wall for 9+ games and a second page for 18+',()=>{
 const many=n=>Array.from({length:n},(_,i)=>play('g'+i,'2026-10-'+String(1+i%28).padStart(2,'0'),'게임'+i));
 // 게임마다 한 판씩이면 '많이 한 게임' 대신 플레이한 게임 + 게임 종류.
 assert.deepEqual(recapPlan(recapData(many(3),month,profile,{locale:'ko'})),['cover','played','types','people','calendar','highlights']);
 assert.deepEqual(recapPlan(recapData([...many(3),play('again','2026-10-20','게임0')],month,profile,{locale:'ko'})).slice(0,2),['cover','top']);
 assert.ok(recapPlan(recapData(many(9),month,profile,{locale:'ko'})).includes('wall'));
 assert.ok(!recapPlan(recapData(many(17),month,profile,{locale:'ko'})).includes('wall2'));
 assert.ok(recapPlan(recapData(many(18),month,profile,{locale:'ko'})).includes('wall2'));
 assert.ok(!recapPlan(recapData(many(3),{...month,preset:'all'},profile,{locale:'ko'})).includes('calendar'));
});

test('single recap summary data: my wins and best score, partner only for friends, milestone says the game total',()=>{
 const records=[play('1','2026-10-01'),play('2','2026-10-02','아줄',{players:[{id:'a',name:'나',score:12,winner:false},{id:'b',name:'김민수',score:40,winner:true}]})];
 const pub=recapData(records,month,profile,{locale:'ko'}),friends=recapData(records,month,profile,{locale:'ko',scope:'friends'});
 assert.deepEqual([pub.self.wins,pub.self.plays,pub.myBest],[1,2,{score:30,game:'카탄'}]);
 assert.deepEqual(friends.partner,{name:'김민수',count:2});
 const words=recapCopy('ko');assert.equal(words.ms.game(100,'윙스팬'),'윙스팬 통산 100판째');assert.equal(words.ms.plays(200),'전체 게임 통산 200판째');
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
 const data=recapData(big,month,profile,{locale:'ko'});assert.equal(data.close.gap,28);assert.deepEqual([data.blow.gap,data.blow.who],[28,'나*']);
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

test('recap game types, type filter and play rhythm',()=>{
 const coop=(id,date)=>play(id,date,'팬데믹',{rule:'cooperative',cooperativeResult:'success',players:[{id:'a',name:'나',score:null}]});
 const records=[play('a','2026-10-01','카탄'),play('b','2026-10-05','마피아'),coop('c','2026-10-11'),coop('d','2026-10-21')];
 const data=recapData(records,month,profile,{locale:'ko'});
 assert.deepEqual(data.categories.map(row=>[row.key,row.name,row.count,row.pct]),[['coop','협동',2,50],['family','가족/파티',1,25],['deduction','추리',1,25]]);
 assert.deepEqual(data.rhythm,{days:4,every:7,longest:10,last:'2026-10-21'});
 const coopOnly=recapData(records,month,profile,{locale:'ko',category:'coop'});
 assert.equal(coopOnly.plays.length,2);assert.equal(coopOnly.category,'coop');assert.match(coopOnly.title,/ · 협동$/);assert.deepEqual(coopOnly.marks,[]);assert.deepEqual(coopOnly.firsts,[]);
 assert.equal(recapData(records,month,profile,{locale:'en'}).categories.find(row=>row.key==='deduction').name,'Deduction');
});

test('carousel adds my game tiers page when 3+ games played in the period have a personal tier',async()=>{
 const {gameKey}=await import('../records-core.js');const {resolveGame}=await import('../game-catalog.js');
 const records=['게임0','게임1','게임2','게임3'].flatMap((name,i)=>Array.from({length:i+1},(_,k)=>play(name+k,'2026-10-0'+(1+k),name))),catan=play('c','2026-10-09','카탄');
 const base=recapData([...records,catan],month,profile,{locale:'ko'});assert.equal(base.tierCount,0);assert.equal(recapPlan(base).includes('tiers'),false);
 const two=recapData(records,month,profile,{locale:'ko',tiers:{'name:게임0':'fav','name:게임1':'b'}});assert.equal(two.tierCount,2);assert.equal(recapPlan(two).includes('tiers'),false,'needs three ranked games');
 const tiers={'name:게임0':'b','name:게임3':'fav','name:게임2':'b',[gameKey(resolveGame({name:'카탄',bggId:''},[]))]:'s','name:옛게임':'a'};
 const data=recapData([...records,catan,play('old','2026-09-01','옛게임')],month,profile,{locale:'ko',tiers});
 assert.deepEqual(data.tierRows.map(row=>[row.label,row.games.map(game=>game.name)]),[['최애',['게임3']],['S',['카탄']],['B',['게임2','게임0']]],'only this period, tier order, most played first');
 assert.equal(data.unranked,1);const plan=recapPlan(data);assert.equal(plan[plan.indexOf('tiers')-1],'top');
 assert.equal(recapCopy('ko').tierSub('11월',4),'11월 동안 4개 게임 플레이 취향');
 assert.equal(recapData(records,month,profile,{locale:'en',tiers}).tierRows[0].label,'FAV');
});
test('share dialog option rows stay hidden when unused (recent-records share has no people/category row)',async()=>{
 const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../records.css',import.meta.url),'utf8');
 assert.match(css,/\.recap-option\{display:grid/);assert.match(css,/\.recap-option\[hidden\]\{display:none\}/);
});
