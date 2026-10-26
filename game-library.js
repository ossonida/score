import {resolveGame,searchableGameGroups} from './game-catalog.js?v=95';
import {gameKey} from './records-core.js?v=128';
const valid=g=>g&&typeof g.name==='string'&&g.name.trim().length>0&&g.name.trim().length<=120&&(!g.bggId||/^[1-9][0-9]{0,9}$/.test(String(g.bggId)));
const clean=g=>({name:g.name.trim(),bggId:String(g.bggId||'')});
const storageKey=scope=>'score.games.v1.'+scope;
export function readGameLibrary(scope,storage=localStorage){try{const value=JSON.parse(storage.getItem(storageKey(scope))||'[]');return Array.isArray(value)?value.filter(valid).slice(0,1000).map(clean):[];}catch{return [];}}
export function libraryGames(records,saved=[]){
 const map=new Map();for(const raw of saved){if(!valid(raw))continue;const game=resolveGame(clean(raw),records),key=gameKey(game);if(!map.has(key))map.set(key,{key,game,count:0});}
 for(const play of records){if(!valid(play.game))continue;const game=resolveGame(clean(play.game),records),key=gameKey(game),row=map.get(key)||{key,game,count:0};row.count++;map.set(key,row);}
 return searchableGameGroups([...map.values()]);
}
// 게임 탭 보기(all·owned·wishlist): 내 목록과 BGG 컬렉션을 BGG ID로 맞춰 한 줄로 합칩니다.
export function gameCollectionView(records,saved=[],collection=[],view='all'){
 const items=collection.filter(item=>item&&/^[1-9][0-9]{0,9}$/.test(String(item.id))&&typeof item.name==='string'&&item.name.trim()),status=new Map();
 for(const item of items){const s=status.get(String(item.id))||{owned:false,wishlist:false};s.owned||=item.owned===true;s.wishlist||=item.wishlist===true;status.set(String(item.id),s);}
 const mine=libraryGames(records,saved),known=new Set(mine.map(row=>row.key)),extra=libraryGames([],items.map(item=>({name:item.name.trim().slice(0,120),bggId:String(item.id)}))).filter(row=>!known.has(row.key));
 const rows=searchableGameGroups([...mine,...extra]).map(row=>({...row,...(status.get(row.game.bggId)||{owned:false,wishlist:false})}));
 return view==='all'?rows:rows.filter(row=>row[view]);
}
export function addLibraryGame(scope,game,records=[],storage=localStorage){
 if(!valid(game))throw Error('게임 이름과 BGG ID를 확인해주세요.');
 const resolved=resolveGame(clean(game),records),key=gameKey(resolved),saved=readGameLibrary(scope,storage);
 if(libraryGames(records,saved).some(row=>row.key===key))return false;
 if(saved.length>=1000)throw Error('추가한 게임은 최대 1,000개까지 저장할 수 있습니다.');
 storage.setItem(storageKey(scope),JSON.stringify([...saved,resolved]));return true;
}
