import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={createElement:()=>({})};
const {gameStory}=await import('../day-share.js');
const {gameKey}=await import('../records-core.js');
const K=name=>gameKey({name,bggId:''});
const profile={primary:'나',aliases:[]};
const at=(date,hour)=>`${date}T${String(hour).padStart(2,'0')}:00:00Z`;
const scored=(id,date,hour,scores,game='카탄',extra={})=>({id,date,createdAt:at(date,hour),game:{name:game,bggId:''},rule:'highest',players:Object.entries(scores).map(([name,score],i)=>({id:'p'+i,name,score})),...extra});
const won=(id,date,hour,names,winner,game='할리갈리')=>({id,date,createdAt:at(date,hour),game:{name:game,bggId:''},rule:'highest',players:names.map((name,i)=>({id:'p'+i,name,score:null,winner:name===winner}))});
const titles=story=>story.stories.map(item=>item.title);

test('score game: top score, personal best, blowout, close game and win chart; names hidden in public',()=>{
 const raw=[scored('o1','2026-10-01',10,{나:40,김민수:30}),scored('o2','2026-10-02',10,{나:42,김민수:35}),scored('o3','2026-10-03',10,{나:41,김민수:20}),
  scored('t1','2026-10-10',10,{나:60,김민수:40}),scored('t2','2026-10-10',11,{나:30,김민수:31})];
 const story=gameStory(raw,'2026-10-10',K('카탄'),profile,{locale:'ko-KR'});
 assert.equal(story.todayLine,'오늘 2판 · 통산 5판');
 assert.deepEqual(titles(story),['오늘 최고점','개인 최고점 갱신','가장 큰 점수 차','가장 아슬아슬한 판','평소보다']);
 assert.deepEqual(story.stories[1],{title:'개인 최고점 갱신',headline:'나 60점',detail:'이전 42'});
 assert.equal(story.stories[3].detail,'','public hides the losing score');
 assert.deepEqual(story.chart.rows.map(row=>[row.label,row.value]),[['나',1],['김**',1]]);
 assert.equal(gameStory(raw,'2026-10-10',K('카탄'),profile,{locale:'ko-KR',mask:false}).stories[3].detail,'31 : 30');
 const quiet=gameStory(raw,'2026-10-10',K('카탄'),profile,{locale:'ko-KR',winners:false});
 assert.equal(quiet.chart,null);assert.deepEqual(titles(quiet),['오늘의 플레이']);
});

test('first play and streak and new all-time leader for win/lose games',()=>{
 const first=gameStory([won('a','2026-10-10',10,['나','지영'],'지영')],'2026-10-10',K('할리갈리'),profile,{locale:'ko-KR'});
 assert.deepEqual(first.stories[0],{title:'첫 플레이',headline:'지* 첫 판 우승',detail:'10월10일'});assert.ok(first.isNew);
 const raw=[won('o0','2026-09-30',10,['나','지영'],'지영'),won('o1','2026-10-01',10,['나','지영'],'지영'),won('o2','2026-10-02',10,['나','지영'],'나'),won('t1','2026-10-10',10,['나','지영'],'나'),won('t2','2026-10-10',11,['나','지영'],'나')];
 const story=gameStory(raw,'2026-10-10',K('할리갈리'),profile,{locale:'en-US'});
 assert.deepEqual(story.stories.map(item=>[item.title,item.headline]),[['Win streak','Me · 3 in a row'],['New all-time leader','Me']]);
});

test('hidden-role games: most often mafia, wins by side and best liar',()=>{
 const night=(id,hour,mafia,mafiaWin)=>({id,date:'2026-10-10',createdAt:at('2026-10-10',hour),game:{name:'마피아',bggId:''},rule:'highest',players:['나','지영','민수','철수'].map((name,i)=>({id:'p'+i,name,score:null,teamId:name===mafia?'team-1':'team-2',teamName:name===mafia?'마피아':'시민',winner:(name===mafia)===mafiaWin}))});
 const raw=[night('a',10,'지영',true),night('b',11,'지영',false),night('c',12,'나',true)];
 const story=gameStory(raw,'2026-10-10',K('마피아'),profile,{locale:'ko-KR'});
 assert.equal(story.todayLine,'오늘 3판 · 통산 3판');
 assert.deepEqual(story.stories.slice(1).map(item=>[item.title,item.headline,item.detail]),[['마피아 역할 최다','지*','2번'],['최고의 거짓말쟁이','지*','마피아 1승']]);
 assert.deepEqual(story.chart.rows.map(row=>[row.label,row.value]).sort(),[['마피아',2],['시민',1]]);
 assert.deepEqual(gameStory(raw,'2026-10-10',K('마피아'),profile,{locale:'ko-KR',winners:false}).stories.map(item=>item.title),['첫 플레이','마피아 역할 최다']);
});

test('co-op missions chart each attempt, hold\'em totals show only the leaders',()=>{
 const crew=(id,hour,attempts)=>({id,date:'2026-10-10',createdAt:at('2026-10-10',hour),game:{name:'더 크루',bggId:''},rule:'cooperative',cooperativeResult:'success',missionAttempts:attempts,players:[{id:'a',name:'나',score:null}]});
 const ok=m=>({mission:m,result:'success'}),fail=m=>({mission:m,result:'failure'});
 const story=gameStory([crew('a',10,[ok(5),fail(6),fail(6)]),crew('b',11,[ok(6),ok(7)])],'2026-10-10',K('더 크루'),profile,{locale:'ko-KR',winners:false});
 assert.deepEqual(story.chart.rows.map(row=>[row.label,row.marks.map(Number).join('')]),[['미션 5','1'],['미션 6','001'],['미션 7','1']]);
 assert.equal(story.stories.find(item=>item.title==='오늘의 미션').headline,'미션 3개 클리어');
 const hand=(id,hour,a,b)=>scored(id,'2026-10-10',hour,{나:a,김민수:b},'홀덤');
 const holdem=gameStory([hand('h1',10,30,-30),hand('h2',11,-10,10),hand('h3',12,5,-5)],'2026-10-10',K('홀덤'),profile,{locale:'ko-KR'});
 assert.deepEqual(holdem.chart.rows.map(row=>[row.label,row.text]),[['나','+25']]);assert.equal(holdem.stories.at(-1).headline,'나 +30');
});
