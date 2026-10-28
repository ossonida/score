import {resolveGame,gameResolver,searchableGameGroups} from './game-catalog.js?v=166';
import {gameKey} from './records-core.js?v=154';
const valid=g=>g&&typeof g.name==='string'&&g.name.trim().length>0&&g.name.trim().length<=120&&(!g.bggId||/^[1-9][0-9]{0,9}$/.test(String(g.bggId)));
const clean=g=>({name:g.name.trim(),bggId:String(g.bggId||'')});
const storageKey=scope=>'score.games.v1.'+scope;
export function readGameLibrary(scope,storage=localStorage){try{const value=JSON.parse(storage.getItem(storageKey(scope))||'[]');return Array.isArray(value)?value.filter(valid).slice(0,1000).map(clean):[];}catch{return [];}}
export function libraryGames(records,saved=[]){
 // 기록에서 만든 이름 색인은 한 번만 만든다(게임마다 만들면 기록 수×게임 수만큼 느려진다).
 const resolve=gameResolver(records),map=new Map();for(const raw of saved){if(!valid(raw))continue;const game=resolve(clean(raw)),key=gameKey(game);if(!map.has(key))map.set(key,{key,game,count:0});}
 for(const play of records){if(!valid(play.game))continue;const game=resolve(clean(play.game)),key=gameKey(game),row=map.get(key)||{key,game,count:0};row.count++;map.set(key,row);}
 return searchableGameGroups([...map.values()]);
}
// 게임 탭 보기(all·played·wantToPlay·owned·wishlist·preordered): 내 목록·기록과 BGG 컬렉션·플레이를 BGG ID로 맞춰 한 줄로 합칩니다.
// bggPlays는 BGG 컬렉션 플레이 수와 가져온 BGG 플레이 기록 중 큰 값입니다. 해본 탭은 플레이 많은 순입니다.
export function gameCollectionView(records,saved=[],collection=[],view='all',bggPlays=[]){
 const id=value=>/^[1-9][0-9]{0,9}$/.test(String(value??''))?String(value):'',named=item=>typeof item?.name==='string'&&item.name.trim(),status=new Map(),extra=[];
 const entry=key=>{if(!status.has(key))status.set(key,{owned:false,wishlist:false,wantToPlay:false,preordered:false,bggPlays:0,logged:0,thumbnail:''});return status.get(key);};
 for(const item of collection){const key=id(item?.id);if(!key||!named(item))continue;const s=entry(key);s.owned||=item.owned===true;s.wishlist||=item.wishlist===true;s.wantToPlay||=item.wantToPlay===true;s.preordered||=item.preordered===true;if(Number.isSafeInteger(item.numPlays))s.bggPlays=Math.max(s.bggPlays,item.numPlays);if(!s.thumbnail&&typeof item.thumbnail==='string')s.thumbnail=item.thumbnail;extra.push({name:item.name.trim().slice(0,120),bggId:key});}
 for(const play of bggPlays){const key=id(play?.gameId);if(!key||!named(play))continue;entry(key).logged+=Number.isSafeInteger(play.quantity)?play.quantity:1;extra.push({name:play.name.trim().slice(0,120),bggId:key});}
 const mine=libraryGames(records,saved),known=new Set(mine.map(row=>row.key)),more=libraryGames([],extra).filter(row=>!known.has(row.key));
 const rows=searchableGameGroups([...mine,...more]).map(row=>{const {logged,...s}=status.get(row.game.bggId)||entry('');const bgg=Math.max(s.bggPlays,logged);return {...row,...s,bggPlays:bgg,played:row.count>0||bgg>0};});
 if(view==='played')return rows.filter(row=>row.played).sort((a,b)=>Math.max(b.count,b.bggPlays)-Math.max(a.count,a.bggPlays));
 if(view==='wantToPlay')return rows.filter(row=>row.wantToPlay&&!row.played);
 return view==='all'?rows:rows.filter(row=>row[view]);
}
// 내 목록에서 지운다. 기록이나 BGG에서 온 게임은 목록에 남으므로 화면에서 먼저 막는다.
export function removeLibraryGame(scope,key,records=[],storage=localStorage){
 const resolve=gameResolver(records),saved=readGameLibrary(scope,storage),next=saved.filter(game=>gameKey(resolve(game))!==key);
 if(next.length===saved.length)return false;
 storage.setItem(storageKey(scope),JSON.stringify(next));return true;
}
export function addLibraryGame(scope,game,records=[],storage=localStorage){
 if(!valid(game))throw Error('게임 이름과 BGG ID를 확인해주세요.');
 const resolved=resolveGame(clean(game),records),key=gameKey(resolved),saved=readGameLibrary(scope,storage);
 if(libraryGames(records,saved).some(row=>row.key===key))return false;
 if(saved.length>=1000)throw Error('추가한 게임은 최대 1,000개까지 저장할 수 있습니다.');
 storage.setItem(storageKey(scope),JSON.stringify([...saved,resolved]));return true;
}
