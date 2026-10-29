import test from 'node:test';import assert from 'node:assert/strict';
import {placeStats,placeSuggestions,defaultPlaces} from '../places.js';
const play=(id,date,location)=>({id,date,...(location!==undefined?{location}:{})});
test('places combine records and BGG plays without double counting exported plays',()=>{
 const records=[play('r1','2026-10-01','집'),play('r2','2026-10-03',' 집 '),play('r3','2026-10-02','철수네'),play('r4','2026-10-04')];
 const bgg=[{id:'1',date:'2026-10-05',location:'보드게임 카페',quantity:2},{id:'2',date:'2026-10-06',location:'집',score:{id:'r1',location:'집'}},{id:'3',date:'2026-09-01',score:{id:'gone',location:'옛집'}}];
 assert.deepEqual(placeStats(records,bgg).map(x=>[x.place,x.count,x.records,x.bgg,x.last]),[['보드게임 카페',2,0,2,'2026-10-05'],['집',2,2,0,'2026-10-03'],['철수네',1,1,0,'2026-10-02'],['옛집',1,0,1,'2026-09-01']]);
});
test('suggestions put the default first, drop hidden places and append unused defaults',()=>{
 const records=[play('r1','2026-10-01','철수네'),play('r2','2026-10-02','철수네'),play('r3','2026-10-03','집'),play('r4','2026-10-04','온라인')];
 assert.deepEqual(placeSuggestions(records,[],{primary:'집',hidden:['온라인','모임 장소']}),['집','철수네','보드게임 카페']);
 assert.deepEqual(placeSuggestions([],[],{primary:'',hidden:[]}),defaultPlaces);
 globalThis.ScoreI18n={lang:'en'};try{assert.deepEqual(placeSuggestions([],[],{primary:'',hidden:[]}),['Home','Board game café','Meetup','Online']);}finally{delete globalThis.ScoreI18n;}
});
test('BG Stats initials on BGG count under the one known place starting with that letter',()=>{const records=[play('r1','2026-10-01','2와2분의일'),play('r2','2026-10-02','B1'),play('r3','2026-10-03','보앤미'),play('r4','2026-10-04','보드게임 카페')];const bgg=[{id:'1',date:'2026-02-22',location:'2.'},{id:'2',date:'2026-03-01',location:'B.'},{id:'3',date:'2026-03-26',location:'보.'}];
 const stats=new Map(placeStats(records,bgg).map(x=>[x.place,x.bgg]));assert.equal(stats.get('2와2분의일'),1);assert.equal(stats.get('B1'),1);assert.equal(stats.get('보.'),1,'ambiguous initials stay as they are');});
