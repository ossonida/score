import test from 'node:test';
import assert from 'node:assert/strict';

class Element{
 constructor(tag){this.tagName=String(tag).toUpperCase();this.children=[];this.attributes={};this.style={setProperty(){},removeProperty(){}};this.dataset={};this.textContent='';this.className='';this.classList={add(){},remove(){},toggle(){},contains:()=>false};}
 append(...nodes){for(const node of nodes){if(typeof node==='string')this.children.push(Object.assign(new Element('#text'),{textContent:node}));else{node.parentNode=this;this.children.push(node);}}}
 insertBefore(node,before){node.parentNode=this;const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,node);}
 remove(){const list=this.parentNode?.children;if(list)list.splice(list.indexOf(this),1);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(){}
 querySelector(){return null;}
}
globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
const {firstPlays,placeCounts,milestones,milestoneTitle,gameLeaderboard,playDays}=await import('../stats-extras.js');
const {renderPeriodDashboard}=await import('../period-dashboard.js');
const {renderOverview,renderGameLeaderboard}=await import('../overview-dashboard.js');
const {periodShareData,periodShareLabel}=await import('../stats-share.js');
const walk=(node,out=[])=>{out.push(node);for(const child of node.children||[])walk(child,out);return out;};
const texts=root=>walk(root).map(n=>n.textContent).filter(Boolean);
const play=(id,date,game='카탄',extra={})=>({id,date,createdAt:date+'T12:00:00Z',game:{name:game,bggId:''},rule:'highest',players:[{id:'a',name:'나',score:30,winner:true},{id:'b',name:'민수',score:20,winner:false}],...extra});
const daysFrom=(start,count,game)=>Array.from({length:count},(_,i)=>play('p'+i,new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),typeof game==='function'?game(i):game));

test('first plays are games whose first-ever play falls in the period',()=>{
 const records=[play('1','2026-09-01','카탄'),play('2','2026-10-02','카탄'),play('3','2026-10-05','아줄'),play('4','2026-10-09','아줄')];
 assert.deepEqual(firstPlays(records,{start:'2026-10-01',end:'2026-10-31'}).map(x=>[x.play.game.name,x.play.date]),[['아줄','2026-10-05']]);
});

test('place counts skip empty places and sort by count',()=>{
 assert.deepEqual(placeCounts([play('1','2026-10-01','카탄',{location:'집'}),play('2','2026-10-02','카탄',{location:' 집 '}),play('3','2026-10-03','카탄',{location:'카페'}),play('4','2026-10-04')]),[{place:'집',count:2},{place:'카페',count:1}]);
});

test('milestones fire at thresholds inside the range only',()=>{
 const records=daysFrom('2026-01-01',25,i=>i<10?'카탄':'게임'+i);
 const all=milestones(records,{start:'2026-01-01',end:'2026-12-31'}).map(m=>[m.kind,m.count,m.play.date]);
 assert.deepEqual(all,[['plays',10,'2026-01-10'],['days',10,'2026-01-10'],['game',10,'2026-01-10'],['games',10,'2026-01-19'],['plays',25,'2026-01-25']]);
 assert.deepEqual(milestones(records,{start:'2026-01-11',end:'2026-01-24'}).map(m=>m.kind),['games']);
 assert.equal(milestoneTitle({kind:'plays',count:100}),'통산 100번째 플레이');
 assert.equal(milestoneTitle({kind:'game',count:10}),'이 게임 10번째 플레이');
});

test('game leaderboard ranks named players by wins, merges my aliases and skips co-op and anonymous',()=>{
 const records=[
  play('1','2026-10-01'),
  play('2','2026-10-02','카탄',{players:[{id:'a',name:'나',score:10,winner:false},{id:'b',name:'민수',score:40,winner:true},{id:'c',name:'지영',score:5,winner:false}]}),
  play('3','2026-10-03','카탄',{players:[{id:'x',name:'Me',score:50,winner:true},{id:'b',name:'민수',score:10,winner:false},{id:'z',name:'익명',anonymous:true,score:1,winner:false}]}),
  play('4','2026-10-04','카탄',{rule:'cooperative',players:[{id:'a',name:'나',score:null},{id:'q',name:'협력러',score:null}]}),
 ];
 const rows=gameLeaderboard(records,{primary:'나',aliases:['Me']});
 assert.deepEqual(rows.map(r=>[r.name,r.wins,r.plays,r.isSelf]),[['나',2,3,true],['민수',1,3,false],['지영',0,1,false]]);
 const root=new Element('div');renderGameLeaderboard(root,records,{scope:'none',onPerson(){}});
 assert.ok(texts(root).includes('게임 순위'));
});

test('play days find the busiest day and the longest streak',()=>{
 const {busiest,streak}=playDays([play('1','2026-10-01'),play('2','2026-10-02'),play('3','2026-10-02'),play('4','2026-10-03'),play('5','2026-10-07')]);
 assert.deepEqual(busiest,{date:'2026-10-02',count:2});assert.equal(streak,3);
});

const monthModel={preset:'month',title:'2026년 10월',label:'이전 달',current:{start:'2026-10-01',end:'2026-10-31'},previous:{start:'2026-09-01',end:'2026-09-30'}};
test('period dashboard shows the calendar, milestones, first plays, places and the recap button',()=>{
 const records=[...daysFrom('2026-09-20',9,'카탄'),play('n1','2026-10-02','카탄',{location:'집'}),play('n2','2026-10-02','아줄',{location:'카페'}),play('n3','2026-10-05','카탄',{location:'집'})];
 const root=new Element('div');renderPeriodDashboard(root,records,monthModel,{scope:'none',onGame(){},onRecord(){}});
 const all=texts(root);
 for(const label of ['결산 공유','플레이 달력','달성 기록','처음 해본 게임','플레이 장소','가장 많이 한 날 10/2 · 2판'])assert.ok(all.includes(label),label);
 assert.ok(!all.includes('플레이 빈도'),'calendar replaces the frequency bars for a month');
 assert.ok(all.includes('통산 10번째 플레이'));
 assert.equal(walk(root).filter(n=>n.className==='calendar-day').length,31);
 const yearRoot=new Element('div');renderPeriodDashboard(yearRoot,records,{...monthModel,title:'2026년',current:{start:'2026-01-01',end:'2026-12-31'}},{scope:'none'});
 assert.equal(walk(yearRoot).filter(n=>n.className==='calendar-month').length,12);
 const allRoot=new Element('div');renderPeriodDashboard(allRoot,records,{preset:'all',title:'전체 기간',label:'',current:{start:'2026-09-20',end:'2026-10-05'},previous:null},{scope:'none'});
 assert.ok(texts(allRoot).includes('플레이 빈도'));assert.ok(!texts(allRoot).includes('처음 해본 게임'));
 const empty=new Element('div');renderPeriodDashboard(empty,[],monthModel,{scope:'none'});assert.ok(!texts(empty).includes('결산 공유'));
});

test('recent highlights lead with the day milestones',()=>{
 const records=daysFrom('2026-10-01',10,'카탄'),root=new Element('div');
 renderOverview(root,records,{scope:'none',view:'recent',onGame(){},onRecord(){}});
 const headings=walk(root).filter(n=>n.tagName==='H3').map(n=>n.textContent);
 assert.equal(headings[0],'이날의 달성');assert.ok(texts(root).includes('통산 10번째 플레이'));
});

test('period recap data names the period and fills the cards',()=>{
 const records=[play('old','2026-09-01','카탄'),play('1','2026-10-02','카탄',{location:'집'}),play('2','2026-10-03','아줄',{location:'집'}),play('3','2026-10-03','카탄')];
 const data=periodShareData(records,monthModel,null,'ko-KR');
 assert.equal(data.title,'2026년 10월 결산');assert.equal(data.playCount,3);assert.equal(data.dayCount,2);
 assert.deepEqual(data.games.map(g=>[g.game.name,g.count]),[['카탄',2],['아줄',1]]);
 assert.deepEqual(data.cards.map(c=>[c.kind,c.headline]),[['mvp','나'],['firsts','1개'],['place','집']]);
 assert.equal(periodShareLabel({preset:'year',current:{start:'2026-01-01',end:'2026-10-29'}},'en-US'),'2026');
 assert.equal(periodShareLabel(monthModel,'en-US'),'October 2026');
 assert.equal(periodShareData(records,monthModel,null,'en-US').title,'October 2026 Recap');
});

test('hold\'em and mafia count once per day in stats: scores summed, else most wins',async()=>{
 const {countSessions}=await import('../stats-extras.js');
 const hand=(id,date,a,b,extra={})=>play(id,date,'홀덤',{players:[{id:'a',name:'나',score:a,isSelf:true},{id:'b',name:'민수',score:b}],...extra});
 const mafia=(id,date,winA)=>play(id,date,'마피아',{rule:'highest',players:[{id:'x',name:'나',score:null,winner:winA},{id:'y',name:'민수',score:null,winner:!winA},{id:'z',name:'지영',score:null,winner:!winA}]});
 const out=countSessions([hand('h1','2026-10-01',10,-10),hand('h2','2026-10-01',-30,30),hand('h3','2026-10-01',5,-5),hand('h4','2026-10-02',1,2),mafia('m1','2026-10-01',true),mafia('m2','2026-10-01',true),mafia('m3','2026-10-01',false),play('c1','2026-10-01'),play('c2','2026-10-01')]);
 assert.equal(out.length,5);
 const day=out.find(p=>p.sessionIds?.includes('h1'));assert.deepEqual(day.sessionIds,['h1','h2','h3']);assert.deepEqual(day.players.map(p=>[p.name,p.score,p.isSelf===true]),[['나',-15,true],['민수',15,false]]);
 const night=out.find(p=>p.game.name==='마피아');assert.deepEqual(night.players.map(p=>[p.name,p.winner]),[['나',true],['민수',false],['지영',false]]);
 assert.ok(out.some(p=>p.id==='h4'&&!p.sessionIds));assert.equal(out.filter(p=>p.game.name==='카탄').length,2);
});
