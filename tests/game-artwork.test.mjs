import test from 'node:test';
import assert from 'node:assert/strict';
import {safeGameImage,gameImageUrl,rememberGameImages} from '../game-artwork.js';
import {gameImages} from '../game-images.js';
import {starterGames} from '../game-catalog.js';
test('all starter games have verified BGG cover URLs',()=>{for(const game of starterGames)assert.ok(safeGameImage(gameImages[game.id]));assert.ok(gameImageUrl({bggId:'13',name:'카탄'}));assert.equal(gameImageUrl({name:'직접 입력'}),'');});
test('artwork accepts only HTTPS BGG image CDN URLs without credentials',()=>{for(const url of ['javascript:alert(1)','https://evil.example/image.jpg','https://cf.geekdo-images.com.evil.example/image.jpg','http://cf.geekdo-images.com/x','https://user:secret@cf.geekdo-images.com/x'])assert.equal(safeGameImage(url),'');assert.equal(safeGameImage('https://cf.geekdo-images.com/x.png'),'https://cf.geekdo-images.com/x.png');});
test('imported public covers cache separately without accepting unlinked or unsafe images',()=>{const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};rememberGameImages({'999999':'https://cf.geekdo-images.com/example.png','999998':'https://evil.example/a.png','../bad':'https://cf.geekdo-images.com/no.png'});assert.equal(gameImageUrl({bggId:'999999'}),'https://cf.geekdo-images.com/example.png');assert.equal(gameImageUrl({bggId:'999998'}),'');assert.equal(Object.keys(JSON.parse(data.values().next().value)).length,1);});
