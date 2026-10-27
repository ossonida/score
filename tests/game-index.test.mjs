import test from 'node:test';import assert from 'node:assert/strict';
import {indexKey,indexEntries} from '../game-index.js';
test('index keys group Korean initials, Latin letters and everything else',()=>{for(const [label,key] of [['카탄','ㅋ'],['까마귀','ㄱ'],['쓰리','ㅅ'],['ㅎ게임','ㅎ'],['azul','A'],['Écosystème','E'],['7 Wonders','7'],['1899 대한','1'],['#hashtag','#'],['','#'],['三國志','#']])assert.equal(indexKey(label),key,label);});
test('index entries keep each key\'s first list position in index order',()=>{assert.deepEqual(indexEntries(['7 Wonders','가이아','깃발','브라스','Azul','Brass','바다']),[{key:'7',index:0},{key:'ㄱ',index:1},{key:'ㅂ',index:3},{key:'A',index:4},{key:'B',index:5}]);});
