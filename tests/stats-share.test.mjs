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

test('recent share data localizes known games and pairs each winner with a game',()=>{
 const old=play('old','2026-10-09','13'),first=play('one','2026-10-10','13'),second=play('two','2026-10-10','11','보난자');second.players[0].winner=false;second.players[1].winner=true;
 const ko=recentShareData([old,first,second],null,'ko-KR'),en=recentShareData([old,first,second],null,'en-US');
 assert.equal(ko.date,'2026-10-10');assert.equal(ko.playCount,2);assert.equal(ko.peopleCount,2);assert.deepEqual(ko.winners,[{playId:'one',gameName:'카탄',names:['하늘']},{playId:'two',gameName:'보난자',names:['바다']}]);assert.deepEqual(ko.games.map(row=>row.game.name),['카탄','보난자']);
 assert.equal(en.title,'October 10 Game Record');assert.deepEqual(en.games.map(row=>row.game.name),['CATAN','Bohnanza']);assert.deepEqual(en.winners.map(row=>row.gameName),['CATAN','Bohnanza']);assert.equal(en.copy.winners,"Today's winners");
 assert.equal(localizedGameName({name:'직접 입력 게임',bggId:''},'en-US'),'직접 입력 게임');
});

test('share covers load app assets directly and only proxy BGG covers',async()=>{
 const {shareImageSource}=await import('../stats-share.js');const base='https://ossonida.github.io/score/';
 assert.equal(shareImageSource('./assets/score-games/holdem.webp',base),'https://ossonida.github.io/score/assets/score-games/holdem.webp');
 const proxied=new URL(shareImageSource('https://cf.geekdo-images.com/abc/pic1.jpg',base));assert.equal(proxied.searchParams.get('action'),'cover');assert.equal(proxied.searchParams.get('url'),'https://cf.geekdo-images.com/abc/pic1.jpg');
 assert.equal(shareImageSource('https://example.com/a.png',base),'');assert.equal(shareImageSource('',base),'');
});

test('share layout keeps three columns up to six games and moves seven or more covers into a left two-column list',async()=>{
 const {shareCoverLayout}=await import('../stats-share.js');
 const six=shareCoverLayout(6);assert.equal(six.side,false);assert.equal(six.cells.length,6);assert.equal(new Set(six.cells.map(c=>c.x)).size,3);assert.ok(six.cells.every(c=>c.y>=122&&c.y+c.h<=650.5));
 for(const count of [7,8,12,15]){const layout=shareCoverLayout(count);assert.equal(layout.side,true);assert.equal(layout.cells.length,Math.min(count,12));assert.equal(new Set(layout.cells.map(c=>c.x)).size,2);assert.ok(layout.cells.every(c=>c.x+c.w<=632&&c.y>=274&&c.y+c.h<=1260.5&&c.w>0&&c.h>0),String(count));}
 assert.equal(shareCoverLayout(15).max,12);
});

test('recent share groups repeated games into one winner row with comma-separated unique names',()=>{
 const first=play('one','2026-10-10','13'),second=play('two','2026-10-10','13'),third=play('three','2026-10-10','13'),other=play('four','2026-10-10','11','보난자');
 second.players[0].winner=false;second.players[1].winner=true;
 const data=recentShareData([first,second,third,other],null,'ko-KR');
 assert.deepEqual(data.winners,[{playId:'one',gameName:'카탄',names:['하늘','바다']},{playId:'four',gameName:'보난자',names:['하늘']}]);
});

const scoredPlay=(id,game,scores,{date='2026-10-10',createdAt=`${date}T12:00:00Z`,rule='highest',anonymous=[]}={})=>({id,date,createdAt,game:{name:game,bggId:''},rule,players:Object.entries(scores).map(([name,score],index)=>({id:'p'+index,name,score,anonymous:anonymous.includes(name)||undefined}))});

test('day card prefers the closest game within three points, newest first on ties',async()=>{
 const {pickDayCard}=await import('../stats-share.js');
 const plays=[scoredPlay('a','카탄',{하늘:10,바다:8},{createdAt:'2026-10-10T10:00:00Z'}),scoredPlay('b','아줄',{하늘:30,바다:28},{createdAt:'2026-10-10T11:00:00Z'}),scoredPlay('c','보난자',{하늘:20,바다:5})];
 const card=pickDayCard(plays,'2026-10-10','ko-KR');
 assert.deepEqual({kind:card.kind,playId:card.playId,title:card.title,headline:card.headline,detail:card.detail},{kind:'close',playId:'b',title:'오늘의 접전',headline:'아줄 2점 차',detail:'하늘 30 : 28 바다'});
 assert.equal(pickDayCard([scoredPlay('x','카탄',{하늘:13,바다:10})],'2026-10-10','ko-KR').gap,3);
 assert.equal(pickDayCard([scoredPlay('x','카탄',{하늘:14,바다:10})],'2026-10-10','ko-KR'),null);
 assert.equal(pickDayCard(plays,'2026-10-10','en-US').headline,'아줄 by 2 points');
});

test('day card falls back to MVP with two or more wins and at most two tied leaders',async()=>{
 const {pickDayCard}=await import('../stats-share.js');
 const wide=(id,winner,loser)=>scoredPlay(id,'카탄',{[winner]:20,[loser]:5});
 const mvp=pickDayCard([wide('1','하늘','바다'),wide('2','하늘','바다'),wide('3','바다','하늘')],'2026-10-10','ko-KR');
 assert.deepEqual({kind:mvp.kind,names:mvp.names,headline:mvp.headline,detail:mvp.detail},{kind:'mvp',names:['하늘'],headline:'하늘',detail:'2승 · 3판 중'});
 assert.equal(pickDayCard([wide('1','하늘','바다'),wide('2','바다','하늘')],'2026-10-10','ko-KR'),null);
 const two=pickDayCard([wide('1','하늘','별'),wide('2','하늘','별'),wide('3','바다','별'),wide('4','바다','별')],'2026-10-10','ko-KR');assert.equal(two.headline,'바다 · 하늘');assert.equal(two.detail,'2승 · 4판 중');
 assert.equal(pickDayCard([wide('1','하늘','별'),wide('2','하늘','별'),wide('3','바다','별'),wide('4','바다','별'),wide('5','구름','별'),wide('6','구름','별')],'2026-10-10','ko-KR'),null);
 assert.equal(pickDayCard([],'2026-10-10','ko-KR'),null);
 assert.equal(pickDayCard([wide('1','하늘','바다'),wide('2','하늘','바다')],'2026-10-10','en-US').detail,'2 wins · 2 games');
});

test('day card skips anonymous players, cooperative games and score-less games',async()=>{
 const {pickDayCard}=await import('../stats-share.js');
 const anonClose=scoredPlay('a','카탄',{익명:10,바다:9},{anonymous:['익명']});
 assert.equal(pickDayCard([anonClose],'2026-10-10','ko-KR'),null);
 const anonWins=[scoredPlay('1','카탄',{익명:20,바다:5},{anonymous:['익명']}),scoredPlay('2','카탄',{익명:20,바다:5},{anonymous:['익명']})];
 assert.equal(pickDayCard(anonWins,'2026-10-10','ko-KR'),null);
 const coop={...scoredPlay('c','판데믹',{하늘:10,바다:9}),rule:'cooperative',cooperativeResult:'success'};
 assert.equal(pickDayCard([coop],'2026-10-10','ko-KR'),null);
 const winOnly=id=>({id,date:'2026-10-10',createdAt:'2026-10-10T12:00:00Z',game:{name:'할리갈리',bggId:''},rule:'highest',players:[{id:'a',name:'하늘',score:null,winner:true},{id:'b',name:'바다',score:null,winner:false}]});
 const card=pickDayCard([winOnly('1'),winOnly('2'),coop],'2026-10-10','ko-KR');
 assert.equal(card.kind,'mvp');assert.equal(card.detail,'2승 · 2판 중');
 assert.equal(pickDayCard([anonClose,scoredPlay('b','아줄',{하늘:7,바다:5})],'2026-10-10','ko-KR').headline,'아줄 2점 차');
});

test('day card layout narrows the winner box up to six games and trims covers and winner rows from seven games',async()=>{
 const {shareCoverLayout}=await import('../stats-share.js');
 assert.deepEqual([shareCoverLayout(5).winners,shareCoverLayout(5).card],[{x:72,y:872,w:936,h:196},null]);
 const narrow=shareCoverLayout(5,true);assert.deepEqual(narrow.winners,{x:72,y:872,w:560,h:196});assert.deepEqual(narrow.card,{x:650,y:872,w:358,h:196});assert.equal(narrow.cells.length,5);
 const plain=shareCoverLayout(8);assert.equal(plain.cells.length,8);assert.deepEqual(plain.winners,{x:660,y:610,w:348,h:650});assert.equal(plain.card,null);
 const withCard=shareCoverLayout(8,true);assert.deepEqual(withCard.card,{x:72,y:1112,w:936,h:148});assert.equal(withCard.cells.length,6);assert.equal(withCard.winners.h,484);assert.ok(withCard.cells.every(c=>c.y+c.h<=1094.5));
 assert.deepEqual(withCard.cells.map(c=>c.w),plain.cells.slice(0,6).map(c=>c.w));
 assert.equal(shareCoverLayout(14,true).cells.length,10);assert.equal(shareCoverLayout(14).cells.length,12);
});

test('redesigned share header uses a short date, the most common place and a three-slot metric row only when a place exists',async()=>{
 const {formatShareDate,shareCoverLayout}=await import('../stats-share.js');
 assert.equal(formatShareDate('2026-10-22','ko-KR'),'10월22일');assert.equal(formatShareDate('2026-10-22','en-US'),'October 22');assert.equal(formatShareDate('','ko-KR'),'');
 const at=(id,location)=>({...play(id,'2026-10-10','13'),location});
 const data=recentShareData([at('1',' B1 '),at('2','B1'),at('3','홍대'),at('4','')],null,'ko-KR');assert.equal(data.location,'B1');assert.equal(data.dateLabel,'10월10일');
 assert.equal(recentShareData([play('x','2026-10-10','13')],null,'ko-KR').location,'');
 const withPlace=shareCoverLayout(3,false,true).metrics,without=shareCoverLayout(3).metrics;
 assert.equal(withPlace.length,3);assert.deepEqual(withPlace.map(m=>Math.round(m.x)),[72,397,722]);assert.ok(withPlace.every(m=>Math.round(m.w)===286&&m.y===670&&m.h===172));
 assert.equal(without.length,2);assert.equal(Math.round(without[1].x+without[1].w),1008);
 assert.deepEqual(shareCoverLayout(8,false,true).metrics,[{x:660,y:274,w:348,h:150},{x:660,y:442,w:348,h:150}]);
});
