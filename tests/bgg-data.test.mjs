import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionData,playsData} from '../functions/bgg-data.js';
import {gameDetails} from '../functions/game-details.js';
test('collection imports owned games only and retains the BGG ID',()=>{const result=collectionData({items:{item:[{'@_objectid':'13',name:'Catan',status:{'@_own':'1'}},{'@_objectid':'822',name:'Carcassonne',status:{'@_own':'0'}}]}});assert.equal(result.total,1);assert.equal(result.items[0].gameId,'13');});
test('public plays preserve absent scores, wins, quantity and remote identity',()=>{const result=playsData({plays:{'@_total':'101',play:[{'@_id':'99','@_date':'2026-10-10','@_quantity':'2',item:{'@_objectid':'13','@_name':'Catan'},players:{player:[{'@_name':'A','@_score':'','@_win':'1'},{'@_name':'B','@_score':'-5','@_win':'0'}]}}]}});assert.equal(result.total,101);assert.equal(result.items[0].id,'99');assert.equal(result.items[0].quantity,2);assert.equal(result.items[0].players[0].score,null);assert.equal(result.items[0].players[0].win,true);assert.equal(result.items[0].players[1].score,-5);});

test('BGG names decode XML entities and details carry the Korean name and expansions',()=>{const c=collectionData({items:{item:[{'@_objectid':'1','name':{'#text':'Detective: Saints &amp; Sinners'},status:{'@_wanttoplay':'1'}},{'@_objectid':'2','name':{'#text':'Chicago &#039;68'},status:{'@_own':'1'}}]}});assert.deepEqual(c.items.map(i=>i.name),['Detective: Saints & Sinners',"Chicago '68"]);
 const d=gameDetails({items:{item:[{'@_id':'29223','@_type':'boardgame',name:[{'@_type':'primary','@_value':'Marrakech'},{'@_type':'alternate','@_value':'마라케시'}],link:[{'@_type':'boardgameexpansion','@_id':'200','@_value':'Marrakech: Expansion &amp; More'},{'@_type':'boardgameexpansion','@_id':'1','@_value':'Base','@_inbound':'true'},{'@_type':'boardgamemechanic','@_id':'2023','@_value':'Cooperative'}]}]}})[0];
 assert.equal(d.name,'Marrakech');assert.equal(d.koName,'마라케시');assert.equal(d.subtype,'boardgame');assert.deepEqual(d.expansions,[{id:'200',name:'Marrakech: Expansion & More'}]);});
test('plays exported by Score Counter carry the record id, note, location and colors for restoring',()=>{
 const result=playsData({plays:{'@_total':'2',play:[
  {'@_id':'501','@_date':'2026-10-24','@_quantity':'1','@_location':'Cafe &amp; Co','@_nowinstats':'0',item:{'@_name':'CATAN','@_objectid':'13'},comments:'Recorded with Score Counter\nScenario 3\n[ScoreCounter:abc-1]',players:{player:[{'@_name':'나','@_username':'alice','@_score':'10','@_win':'1','@_color':'#52c7ef'}]}},
  {'@_id':'502','@_date':'2026-10-24','@_quantity':'1',item:{'@_name':'CATAN','@_objectid':'13'},comments:'just a note',players:{player:[{'@_name':'B','@_score':'3','@_win':'1','@_color':'Red'}]}}]}});
 const [marked,plain]=result.items;
 assert.deepEqual(marked.score,{id:'abc-1',location:'Cafe & Co',note:'Recorded with Score Counter\nScenario 3\n[ScoreCounter:abc-1]',known:true});assert.equal(marked.players[0].color,'#52c7ef');
 assert.equal('score' in plain,false,'plays without the marker stay unchanged');assert.equal('color' in plain.players[0],false);
});
test('every BGG play keeps its trimmed location, not only plays exported by Score',()=>{const result=playsData({plays:{'@_total':'2',play:[{'@_id':'1','@_date':'2026-10-10','@_quantity':'1','@_location':' 철수네 &amp; 카페 ',item:{'@_objectid':'13','@_name':'Catan'}},{'@_id':'2','@_date':'2026-10-11','@_quantity':'1',item:{'@_objectid':'13','@_name':'Catan'}}]}});assert.equal(result.items[0].location,'철수네 & 카페');assert.equal('location' in result.items[1],false);});
