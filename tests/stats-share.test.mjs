import test from 'node:test';
import assert from 'node:assert/strict';
import {formatRecentRecordTitle,recentShareData} from '../stats-share.js';

const play=(id,date,game,name='카탄')=>({id,date,createdAt:date+'T12:00:00Z',game:{name,bggId:game},rule:'highest',players:[{id:'a',name:'하늘',score:10,winner:true,isSelf:true},{id:'b',name:'바다',score:8,winner:false}]});

test('recent share title uses the requested game record wording',()=>{
 assert.equal(formatRecentRecordTitle('2026-10-10'),'10월10일 게임기록');
 assert.equal(formatRecentRecordTitle(''),'최근 게임기록');
});

test('recent share data only summarizes the latest day and keeps unique cover games',()=>{
 const old=play('old','2026-10-09','13'),first=play('one','2026-10-10','13'),second=play('two','2026-10-10','11','보난자');second.players[0].winner=false;second.players[1].winner=true;
 const data=recentShareData([old,first,second],null);
 assert.equal(data.date,'2026-10-10');assert.equal(data.playCount,2);assert.equal(data.peopleCount,2);assert.deepEqual(data.winners,['하늘','바다']);assert.equal(data.games.length,2);assert.equal(data.games[0].count,1);
});
