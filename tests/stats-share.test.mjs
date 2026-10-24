import test from 'node:test';
import assert from 'node:assert/strict';
import {formatRecentRecordTitle,localizedGameName,recentShareData,shareLanguage} from '../stats-share.js';

const play=(id,date,game,name='카탄')=>({id,date,createdAt:date+'T12:00:00Z',game:{name,bggId:game},rule:'highest',players:[{id:'a',name:'하늘',score:10,winner:true,isSelf:true},{id:'b',name:'바다',score:8,winner:false}]});

test('recent share title uses the requested game record wording',()=>{
 assert.equal(formatRecentRecordTitle('2026-10-10'),'10월10일 게임기록');
 assert.equal(formatRecentRecordTitle(''),'최근 게임기록');
 assert.equal(formatRecentRecordTitle('2026-10-10','en-US'),'October 10 Game Record');
 assert.equal(shareLanguage(['ko-KR','en-US']),'ko');assert.equal(shareLanguage('en-GB'),'en');
});

test('recent share data localizes known games and attaches winners to each game',()=>{
 const old=play('old','2026-10-09','13'),first=play('one','2026-10-10','13'),second=play('two','2026-10-10','11','보난자');second.players[0].winner=false;second.players[1].winner=true;
 const ko=recentShareData([old,first,second],null,'ko-KR'),en=recentShareData([old,first,second],null,'en-US');
 assert.equal(ko.date,'2026-10-10');assert.equal(ko.playCount,2);assert.equal(ko.peopleCount,2);assert.deepEqual(ko.games.map(row=>[row.game.name,row.winners]),[['카탄',['하늘']],['보난자',['바다']]]);
 assert.equal(en.title,'October 10 Game Record');assert.deepEqual(en.games.map(row=>row.game.name),['CATAN','Bohnanza']);assert.equal(en.copy.otherGames,'Other games');assert.equal(ko.copy.otherGames,'그 밖의 게임');
 assert.equal(localizedGameName({name:'직접 입력 게임',bggId:''},'en-US'),'직접 입력 게임');
});

test('share covers load app assets directly and only proxy BGG covers',async()=>{
 const {shareImageSource}=await import('../stats-share.js');const base='https://ossonida.github.io/score/';
 assert.equal(shareImageSource('./assets/score-games/holdem.webp',base),'https://ossonida.github.io/score/assets/score-games/holdem.webp');
 const proxied=new URL(shareImageSource('https://cf.geekdo-images.com/abc/pic1.jpg',base));assert.equal(proxied.searchParams.get('action'),'cover');assert.equal(proxied.searchParams.get('url'),'https://cf.geekdo-images.com/abc/pic1.jpg');
 assert.equal(shareImageSource('https://example.com/a.png',base),'');assert.equal(shareImageSource('',base),'');
});

test('share layout keeps three columns up to six games, two columns from seven and an other-games list past twelve',async()=>{
 const {shareCoverLayout}=await import('../stats-share.js');
 const six=shareCoverLayout(6);assert.equal(six.side,false);assert.equal(six.cells.length,6);assert.equal(new Set(six.cells.map(c=>c.x)).size,3);assert.ok(six.cells.every(c=>c.y>=122&&c.y+c.h<=six.metrics[0].y-19.5));assert.equal(six.metrics[0].y+172,1260);assert.equal(six.others,null);
 for(const count of [7,8,11,12]){const layout=shareCoverLayout(count);assert.equal(layout.side,true);assert.equal(layout.cells.length,count);assert.equal(layout.others,null);assert.equal(new Set(layout.cells.map(c=>c.x)).size,2);assert.ok(layout.cells.every(c=>c.x+c.w<=632&&c.y>=274&&c.y+c.h<=(count<12?1260.5:1290.5)&&c.w>0&&c.h>0),String(count));}
 const many=shareCoverLayout(15);assert.equal(many.cells.length,12);assert.deepEqual(many.others,{x:660,y:440,w:348,h:845});assert.deepEqual(shareCoverLayout(15,2).others,{x:660,y:836,w:348,h:449});
});

test('recent share puts comma-separated unique winners on each played game',()=>{
 const first=play('one','2026-10-10','13'),second=play('two','2026-10-10','13'),third=play('three','2026-10-10','13'),other=play('four','2026-10-10','11','보난자');
 second.players[0].winner=false;second.players[1].winner=true;
 const data=recentShareData([first,second,third,other],null,'ko-KR');
 assert.deepEqual(data.games.map(game=>[game.game.name,game.count,game.winners]),[['카탄',3,['하늘','바다']],['보난자',1,['하늘']]]);assert.equal('winners' in data,false);
});

const scoredPlay=(id,game,scores,{date='2026-10-10',createdAt=`${date}T12:00:00Z`,rule='highest',anonymous=[]}={})=>({id,date,createdAt,game:{name:game,bggId:''},rule,players:Object.entries(scores).map(([name,score],index)=>({id:'p'+index,name,score,anonymous:anonymous.includes(name)||undefined}))});

test('day cards list MVP first and then the closest game within three points, newest first on ties',async()=>{
 const {pickDayCards}=await import('../stats-share.js');
 const plays=[scoredPlay('a','카탄',{하늘:10,바다:8},{createdAt:'2026-10-10T10:00:00Z'}),scoredPlay('b','아줄',{하늘:30,바다:28},{createdAt:'2026-10-10T11:00:00Z'}),scoredPlay('c','보난자',{하늘:20,바다:5})];
 const cards=pickDayCards(plays,'2026-10-10','ko-KR');assert.deepEqual(cards.map(card=>card.kind),['mvp','close']);
 assert.deepEqual({headline:cards[0].headline,detail:cards[0].detail},{headline:'하늘',detail:'3승 · 3판 중'});
 assert.deepEqual({playId:cards[1].playId,title:cards[1].title,headline:cards[1].headline,detail:cards[1].detail},{playId:'b',title:'오늘의 접전',headline:'아줄 2점 차',detail:'하늘 30 : 28 바다'});
 const three=pickDayCards([scoredPlay('x','카탄',{하늘:13,바다:10})],'2026-10-10','ko-KR');assert.deepEqual(three.map(card=>[card.kind,card.gap]),[['close',3]]);
 assert.deepEqual(pickDayCards([scoredPlay('x','카탄',{하늘:14,바다:10})],'2026-10-10','ko-KR'),[]);
 assert.equal(pickDayCards(plays,'2026-10-10','en-US')[1].headline,'아줄 by 2 points');
});

test('day MVP needs two or more wins and at most two tied leaders',async()=>{
 const {pickDayCards}=await import('../stats-share.js');
 const wide=(id,winner,loser)=>scoredPlay(id,'카탄',{[winner]:20,[loser]:5});
 const [mvp]=pickDayCards([wide('1','하늘','바다'),wide('2','하늘','바다'),wide('3','바다','하늘')],'2026-10-10','ko-KR');
 assert.deepEqual({kind:mvp.kind,names:mvp.names,headline:mvp.headline,detail:mvp.detail},{kind:'mvp',names:['하늘'],headline:'하늘',detail:'2승 · 3판 중'});
 assert.deepEqual(pickDayCards([wide('1','하늘','바다'),wide('2','바다','하늘')],'2026-10-10','ko-KR'),[]);
 const [two]=pickDayCards([wide('1','하늘','별'),wide('2','하늘','별'),wide('3','바다','별'),wide('4','바다','별')],'2026-10-10','ko-KR');assert.equal(two.headline,'바다 · 하늘');assert.equal(two.detail,'2승 · 4판 중');
 assert.deepEqual(pickDayCards([wide('1','하늘','별'),wide('2','하늘','별'),wide('3','바다','별'),wide('4','바다','별'),wide('5','구름','별'),wide('6','구름','별')],'2026-10-10','ko-KR'),[]);
 assert.deepEqual(pickDayCards([],'2026-10-10','ko-KR'),[]);
 assert.equal(pickDayCards([wide('1','하늘','바다'),wide('2','하늘','바다')],'2026-10-10','en-US')[0].detail,'2 wins · 2 games');
});

test('day cards skip anonymous players, cooperative games and score-less games',async()=>{
 const {pickDayCards}=await import('../stats-share.js');
 const anonClose=scoredPlay('a','카탄',{익명:10,바다:9},{anonymous:['익명']});
 assert.deepEqual(pickDayCards([anonClose],'2026-10-10','ko-KR'),[]);
 const anonWins=[scoredPlay('1','카탄',{익명:20,바다:5},{anonymous:['익명']}),scoredPlay('2','카탄',{익명:20,바다:5},{anonymous:['익명']})];
 assert.deepEqual(pickDayCards(anonWins,'2026-10-10','ko-KR'),[]);
 const coop={...scoredPlay('c','판데믹',{하늘:10,바다:9}),rule:'cooperative',cooperativeResult:'success'};
 assert.deepEqual(pickDayCards([coop],'2026-10-10','ko-KR'),[]);
 const winOnly=id=>({id,date:'2026-10-10',createdAt:'2026-10-10T12:00:00Z',game:{name:'할리갈리',bggId:''},rule:'highest',players:[{id:'a',name:'하늘',score:null,winner:true},{id:'b',name:'바다',score:null,winner:false}]});
 const cards=pickDayCards([winOnly('1'),winOnly('2'),coop],'2026-10-10','ko-KR');
 assert.deepEqual(cards.map(card=>[card.kind,card.detail]),[['mvp','2승 · 2판 중']]);
 assert.equal(pickDayCards([anonClose,scoredPlay('b','아줄',{하늘:7,바다:5})],'2026-10-10','ko-KR')[0].headline,'아줄 2점 차');
});

test('day cards replace the winner box: side by side up to six games and stacked in the right column from seven',async()=>{
 const {shareCoverLayout}=await import('../stats-share.js');
 assert.deepEqual(shareCoverLayout(5).cards,[]);
 assert.deepEqual(shareCoverLayout(5,1).cards,[{x:72,y:1064,w:936,h:196}]);
 assert.deepEqual(shareCoverLayout(5,2).cards,[{x:72,y:1064,w:459,h:196},{x:549,y:1064,w:459,h:196}]);
 assert.deepEqual(shareCoverLayout(8,2).cards,[{x:660,y:610,w:348,h:316},{x:660,y:944,w:348,h:316}]);assert.deepEqual(shareCoverLayout(12,2).cards,[{x:660,y:440,w:348,h:413.5},{x:660,y:871.5,w:348,h:413.5}]);assert.deepEqual(shareCoverLayout(15,2).cards,[{x:660,y:440,w:348,h:180},{x:660,y:638,w:348,h:180}]);
 assert.deepEqual(shareCoverLayout(8,2).cells,shareCoverLayout(8).cells);assert.equal(shareCoverLayout(8,1).cards.length,1);
});

test('redesigned share header uses a short date, the most common place and a three-slot metric row only when a place exists',async()=>{
 const {formatShareDate,shareCoverLayout}=await import('../stats-share.js');
 assert.equal(formatShareDate('2026-10-22','ko-KR'),'10월22일');assert.equal(formatShareDate('2026-10-22','en-US'),'October 22');assert.equal(formatShareDate('','ko-KR'),'');
 const at=(id,location)=>({...play(id,'2026-10-10','13'),location});
 const data=recentShareData([at('1',' B1 '),at('2','B1'),at('3','홍대'),at('4','')],null,'ko-KR');assert.equal(data.location,'B1');assert.equal(data.dateLabel,'10월10일');
 assert.equal(recentShareData([play('x','2026-10-10','13')],null,'ko-KR').location,'');
 const withPlace=shareCoverLayout(3,false,true).metrics,without=shareCoverLayout(3).metrics;
 assert.equal(withPlace.length,3);assert.deepEqual(withPlace.map(m=>Math.round(m.x)),[72,397,722]);assert.ok(withPlace.every(m=>Math.round(m.w)===286&&m.y===1088&&m.h===172));
 assert.equal(without.length,2);assert.equal(Math.round(without[1].x+without[1].w),1008);
 assert.deepEqual(shareCoverLayout(8,false,true).metrics,[{x:660,y:274,w:348,h:150},{x:660,y:442,w:348,h:150}]);assert.deepEqual(shareCoverLayout(12).metrics,[{x:660,y:274,w:168,h:148},{x:840,y:274,w:168,h:148}]);
});

test('share image rendering resolves to a PNG blob for compact and side layouts',async()=>{
 const {createRecentShareImage}=await import('../stats-share.js');
 const gradient={addColorStop(){}},ctx=new Proxy({measureText:text=>({width:String(text).length*12}),createLinearGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:()=>{},set:()=>true});
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>ctx,toBlob:callback=>callback(new Blob(['png'],{type:'image/png'}))})};
 try{
  const games=count=>Array.from({length:count},(_,index)=>({key:'g'+index,game:{name:'게임'+index},count:1,imageUrl:'',winners:index%2?['하늘']:[]}));
  const card={title:'오늘의 MVP',headline:'하늘',detail:'2승 · 3판 중'};
  for(const count of [1,5,8,15]){const blob=await createRecentShareImage({copy:recentShareData([],null,'ko-KR').copy,playCount:count,peopleCount:2,dateLabel:'10월10일',location:count%2?'B1':'',games:games(count),cards:[card,card]});assert.ok(blob instanceof Blob,String(count));assert.equal(blob.type,'image/png');}
  const winners={kind:'winners',title:'게임별 우승자',rows:Array.from({length:20},(_,index)=>({game:'게임'+index,winners:['하늘','바다']}))};
  for(const count of [2,15]){const blob=await createRecentShareImage({copy:recentShareData([],null,'ko-KR').copy,playCount:count,peopleCount:2,dateLabel:'10월10일',games:games(count),cards:[winners]});assert.equal(blob.type,'image/png');}
 }finally{globalThis.document=previous;}
});

test('days without MVP or a close game show one winners-by-game card instead of an empty slot',()=>{
 const plays=[scoredPlay('a','카탄',{하늘:20,바다:5}),scoredPlay('b','아줄',{바다:30,하늘:10}),scoredPlay('c','아줄',{구름:40,별:10})];
 const [card,...rest]=recentShareData(plays,null,'ko-KR').cards;
 assert.equal(rest.length,0);assert.equal(card.kind,'winners');assert.equal(card.title,'게임별 우승자');
 assert.deepEqual(JSON.parse(JSON.stringify(card.rows)),[{game:'카탄',winners:['하늘']},{game:'아줄',winners:['바다','구름']}]);
 assert.equal(recentShareData(plays,null,'en-US').cards[0].title,'Winners by game');
 assert.deepEqual(recentShareData([...plays,scoredPlay('d','카탄',{하늘:20,바다:5})],null,'ko-KR').cards.map(item=>item.kind),['mvp']);
});

test('mission sessions show their cleared range on the shared cover instead of winners',()=>{
 const mission=(id,attempts)=>({id,date:'2026-10-10',createdAt:'2026-10-10T12:00:00Z',game:{name:'딥씨 크루',bggId:''},rule:'cooperative',cooperativeResult:attempts.some(a=>a.result==='success')?'success':'failure',missionAttempts:attempts,players:[{id:'a',name:'하늘',score:null}]});
 const data=recentShareData([mission('1',[{mission:4,result:'success'},{mission:5,result:'failure'}]),mission('2',[{mission:5,result:'success'}])],null,'ko-KR');
 assert.deepEqual(data.games.map(game=>[game.count,game.winners,game.mission]),[[2,[],'미션 4 → 5 클리어']]);
 assert.equal(recentShareData([mission('3',[{mission:7,result:'failure'}])],null,'en-US').games[0].mission,'Mission 7 in progress');
});
