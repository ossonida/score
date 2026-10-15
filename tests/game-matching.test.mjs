import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveGame,matchGameRecords,searchableGameGroups} from '../game-catalog.js';
const play=(id,name,bggId='')=>({id,game:{name,bggId}});
test('exact aliases, Unicode, case and spacing identify known games without fuzzy title matching',()=>{for(const name of ['카탄','CATAN',' Catan '])assert.equal(resolveGame({name,bggId:''}).bggId,'13');assert.equal(resolveGame({name:'플립7',bggId:''}).bggId,'420087');assert.equal(resolveGame({name:'카탄 확장 미확인',bggId:''}).bggId,'');});
test('unique existing IDs connect unlinked games without merging or changing play data',()=>{const records=[play('a','테스트게임'),play('b','테스트 게임','999999')],result=matchGameRecords(records);assert.equal(result.length,2);assert.equal(result[0].game.bggId,'999999');assert.equal(records[0].game.bggId,'');assert.equal(result[1],records[1]);});
test('ambiguous names and explicit IDs are never reassigned',()=>{const records=[play('a','동명 게임'),play('b','동명 게임','999998'),play('c','동명 게임','999999')];assert.equal(matchGameRecords(records)[0].game.bggId,'');assert.equal(resolveGame({name:'카탄',bggId:'999999'}).bggId,'999999');});

test('statistics games sort English ABC then Korean 가나다 and search registered aliases',()=>{const group=(name,bggId='')=>({key:name,game:{name,bggId}}),groups=[group('나무'),group('Beta'),group('가족'),group('apple'),group('CATAN','13')];assert.deepEqual(searchableGameGroups(groups).map(g=>g.game.name),['apple','Beta','CATAN','가족','나무']);assert.deepEqual(searchableGameGroups(groups,'카탄').map(g=>g.game.name),['CATAN']);assert.equal(searchableGameGroups(groups,'UNKNOWN').length,0);assert.equal(searchableGameGroups(groups,' APP ').length,1);assert.equal(groups[0].game.name,'나무');});
