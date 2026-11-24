import test from 'node:test';
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const target=new EventTarget();globalThis.addEventListener=target.addEventListener.bind(target);globalThis.dispatchEvent=target.dispatchEvent.bind(target);
const {GAME_TIERS,readGameTiers,setGameTier,groupByTier,tierInfo}=await import('../game-tiers.js');

test('game tiers save per scope, ignore invalid values, and clear back to unranked',()=>{
 const events=[];globalThis.addEventListener('score-tiers:changed',event=>events.push(event.detail));
 assert.deepEqual(GAME_TIERS.map(tier=>tier.label),['최애','S','A','B','C']);
 assert.equal(setGameTier('guest','bgg:13','s'),true);assert.equal(setGameTier('guest','bgg:13','s'),false);
 assert.deepEqual(readGameTiers('guest'),{'bgg:13':'s'});assert.deepEqual(readGameTiers('other'),{});
 assert.equal(setGameTier('guest','bgg:13','z'),true,'unknown tier clears');assert.deepEqual(readGameTiers('guest'),{});
 store.set('score.gameTiers.v1.broken',JSON.stringify({a:'fav',b:'nope',c:3}));assert.deepEqual(readGameTiers('broken'),{a:'fav'});
 assert.equal(tierInfo('').label,'미분류');assert.equal(events.length,2);
});

test('groupByTier keeps tier order, keeps row order inside a tier, and puts unranked last',()=>{
 const rows=['x','y','z','w'].map(key=>({key}));
 const groups=groupByTier(rows,{x:'b',y:'fav',w:'b'});
 assert.deepEqual(groups.map(group=>[group.label,group.items.map(row=>row.key)]),[['최애',['y']],['B',['x','w']],['미분류',['z']]]);
});
