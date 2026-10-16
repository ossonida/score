import {resolveGame,searchableGameGroups} from './game-catalog.js?v=61';
import {gameKey} from './records-core.js?v=61';
const valid=g=>g&&typeof g.name==='string'&&g.name.trim().length>0&&g.name.trim().length<=120&&(!g.bggId||/^[1-9][0-9]{0,9}$/.test(String(g.bggId)));
const clean=g=>({name:g.name.trim(),bggId:String(g.bggId||'')});
const storageKey=scope=>'score.games.v1.'+scope;
export function readGameLibrary(scope,storage=localStorage){try{const value=JSON.parse(storage.getItem(storageKey(scope))||'[]');return Array.isArray(value)?value.filter(valid).slice(0,1000).map(clean):[];}catch{return [];}}
export function libraryGames(records,saved=[]){
 const map=new Map();for(const raw of saved){if(!valid(raw))continue;const game=resolveGame(clean(raw),records),key=gameKey(game);if(!map.has(key))map.set(key,{key,game,count:0});}
 for(const play of records){if(!valid(play.game))continue;const game=resolveGame(clean(play.game),records),key=gameKey(game),row=map.get(key)||{key,game,count:0};row.count++;map.set(key,row);}
 return searchableGameGroups([...map.values()]);
}
export function addLibraryGame(scope,game,records=[],storage=localStorage){
 if(!valid(game))throw Error('게임 이름과 BGG ID를 확인해주세요.');
 const resolved=resolveGame(clean(game),records),key=gameKey(resolved),saved=readGameLibrary(scope,storage);
 if(libraryGames(records,saved).some(row=>row.key===key))return false;
 if(saved.length>=1000)throw Error('추가한 게임은 최대 1,000개까지 저장할 수 있습니다.');
 storage.setItem(storageKey(scope),JSON.stringify([...saved,resolved]));return true;
}
