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
 const six=shareCoverLayout(6);assert.equal(six.side,false);assert.equal(six.cells.length,6);assert.equal(new Set(six.cells.map(c=>c.x)).size,3);assert.ok(six.cells.every(c=>c.y>=730&&c.y+c.h<=1259));
 for(const count of [7,8,12,15]){const layout=shareCoverLayout(count);assert.equal(layout.side,true);assert.equal(layout.cells.length,Math.min(count,12));assert.equal(new Set(layout.cells.map(c=>c.x)).size,2);assert.ok(layout.cells.every(c=>c.x+c.w<=632&&c.y>=274&&c.y+c.h<=1260.5&&c.w>0&&c.h>0),String(count));}
 assert.equal(shareCoverLayout(15).max,12);
});
