import test from 'node:test';import assert from 'node:assert/strict';
import {bgStatsLinks,duplicateScoreUploads,bgStatsDuplicates} from '../bgstats-link.js';
import {placeStats} from '../places.js';
import {planBggExport} from '../bgg-export.js';
const record=(id,date,location,scores=[10,7])=>({id,date,rule:'highest',location,game:{name:'Ants',bggId:'13'},players:[{id:'a',name:'나',score:scores[0]},{id:'b',name:'민수',score:scores[1]}]});
const bgg=(id,date,location,extra={})=>({id,gameId:'13',name:'Ants',date,quantity:1,location,players:[{name:'민수 ',username:'',score:7,win:false},{name:'나',username:'',score:10,win:true}],...extra});
test('BG Stats records link to the matching BGG play once, ignoring Score uploads and different results',()=>{
 const records=[record('bgstats:a','2026-09-25','B1'),record('bgstats:b','2026-09-25','B1'),record('score-1','2026-09-25','B1')];
 const plays=[bgg('100','2026-09-25','B.'),bgg('101','2026-09-25','B.',{players:[{name:'나',score:3,win:false},{name:'민수',score:7,win:true}]}),bgg('102','2026-09-25','',{score:{id:'bgstats:a'}})];
 assert.deepEqual([...bgStatsLinks(records,plays)],[['bgstats:a','100']]);
 assert.deepEqual(duplicateScoreUploads(records,plays).map(x=>[x.bggPlayId,x.original]),[['102','100']]);
});
test('abbreviated BG Stats locations on BGG are not counted twice and linked records are not exported again',async()=>{
 const records=[record('bgstats:a','2026-09-25','B1')],plays=[bgg('100','2026-09-25','B.')];
 assert.deepEqual(placeStats(records,plays).map(x=>[x.place,x.records,x.bgg]),[['B1',1,0]]);
 const plan=await planBggExport(records,{},20,'',new Set(bgStatsLinks(records,plays).keys()));assert.equal(plan.records.length,0);assert.equal(plan.fromBgStats,1);
});
test('a stored BGG play number links the record even when names were renamed later',async()=>{const records=[{...record('bgstats:a','2026-09-25','B1'),bggPlayId:'100',players:[{id:'a',name:'나',score:10},{id:'b',name:'케이',score:7}]}],plays=[bgg('100','2026-09-25','B.')];
 assert.deepEqual([...bgStatsLinks(records,plays)],[['bgstats:a','100']]);assert.deepEqual(placeStats(records,plays).map(x=>x.place),['B1']);});
test('duplicates are only Score uploads whose BG Stats original is still on BGG',()=>{const records=[{id:'bgstats:a'},{id:'bgstats:b'},{id:'bgstats:c'}],links=new Map([['bgstats:a','100'],['bgstats:b','200'],['bgstats:c','300']]),plays=[{id:'100'},{id:'900'},{id:'300'}],uploads={'bgstats:a':{bggPlayId:'900'},'bgstats:b':{bggPlayId:'901'}};
 assert.deepEqual(bgStatsDuplicates(records,links,plays,uploads),[{recordId:'bgstats:a',playId:'900',original:'100',date:undefined}],'b keeps its upload because its original was deleted; c was never uploaded');});
