import test from 'node:test';import assert from 'node:assert/strict';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const {rememberMetadata,gameNames,metadata,metadataFresh}=await import('../bgg-metadata.js');
test('BGG Korean names show first with the English name, and old metadata is refreshed',()=>{
 store.set('score.bgg.metadata.v1',JSON.stringify({'29223':{domains:[],cooperative:false,checkedAt:Date.now()}}));assert.equal(metadataFresh({bggId:'29223'}),false);
 rememberMetadata([{id:'29223',name:'Marrakech',koName:'마라케시',domains:['Family Games'],expansions:[{id:'200',name:'Marrakech: Expansion'},{id:'bad',name:'x'}]}]);
 assert.equal(metadataFresh({bggId:'29223'}),true);assert.deepEqual(gameNames({name:'Marrakech',bggId:'29223'}),{ko:'마라케시',en:'Marrakech'});assert.deepEqual(gameNames({name:'마라케시',bggId:'29223'}),{ko:'마라케시',en:'Marrakech'});assert.deepEqual(metadata({bggId:'29223'}).expansions,[{id:'200',name:'Marrakech: Expansion'}]);
 assert.deepEqual(gameNames({name:'Unknown Game',bggId:'999999'}),{ko:'Unknown Game',en:''});
});
