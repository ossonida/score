import test from 'node:test';import assert from 'node:assert/strict';
import {starterGames,searchCatalog,searchLocalGames,bggSearchQuery,searchableGameGroups} from '../game-catalog.js';
import {wikidataGames} from '../korean-game-names.js';
test('Korean search covers multiple common titles, alternate spellings and spacing',()=>{
 for(const [name,id]of [['보난자','11'],['루미큐브','811'],['오딘을 위하여','177736'],['버라지','251247'],['테라 미스티카','120677'],['스카이팀','373106'],['엘 그란데','93'],['르아브르','35677'],['하모니즈','414317'],['치즈도둑','294175']])assert.ok(searchLocalGames(name).some(g=>g.id===id),name);
 assert.ok(searchLocalGames('스카이 팀').some(g=>g.id==='373106'));assert.equal(bggSearchQuery('보난자'),'Bohnanza');
});
test('open Korean index has valid unique IDs and retains every primary Korean label',()=>{
 const ids=new Set();for(const g of wikidataGames){assert.match(g.id,/^[1-9][0-9]{0,9}$/);assert.ok(!ids.has(g.id));ids.add(g.id);assert.ok(g.aliases.some(a=>/[가-힣]/.test(a)));assert.ok(searchLocalGames(g.aliases[0]).some(x=>x.id===g.id),g.aliases[0]);}
 assert.ok(searchCatalog.length>starterGames.length);
});
test('Korean title aliases also work in saved-game statistics picker',()=>{
 const group={game:{name:'A Feast for Odin',bggId:'177736'}};assert.deepEqual(searchableGameGroups([group],'오딘을 위하여'),[group]);
});
test('unknown and partial titles are not invented or rewritten',()=>{
 assert.deepEqual(searchLocalGames('없는게임xyz123'),[]);assert.equal(bggSearchQuery('없는게임xyz123'),'없는게임xyz123');assert.equal(bggSearchQuery('보난'),'보난');
});
test('Score native games are searchable without a BGG ID',()=>{for(const [name,type]of [['홀덤','strategy'],['테니스','sports'],['볼링','sports'],['당구','sports'],['축구','sports'],['야구','sports'],['배드민턴','sports'],['탁구','sports']]){const result=searchLocalGames(name).find(game=>game.name===name);assert.ok(result,name);assert.equal(result.id,'');assert.equal(result.scoreGame,true);assert.equal(result.type,type);assert.equal(result.source,'Score 자체 게임');}});
