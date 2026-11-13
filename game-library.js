import {resolveGame,gameResolver,searchableGameGroups} from './game-catalog.js?v=309';
import {gameKey} from './records-core.js?v=309';
const valid=g=>g&&typeof g.name==='string'&&g.name.trim().length>0&&g.name.trim().length<=120&&(!g.bggId||/^[1-9][0-9]{0,9}$/.test(String(g.bggId)));
// 게임 탭 목록 탭(하고 싶은·보유·위시·펀딩)에서 추가한 게임은 그 목록 표시만 저장한다(true일 때만 키를 둔다).
export const LIBRARY_LISTS=['wantToPlay','owned','wishlist','preordered'];
const flags=g=>Object.fromEntries(LIBRARY_LISTS.filter(list=>g?.[list]===true).map(list=>[list,true]));
const clean=g=>({name:g.name.trim(),bggId:String(g.bggId||''),...flags(g)});
const storageKey=scope=>'score.games.v1.'+scope;
export function readGameLibrary(scope,storage=localStorage){try{const value=JSON.parse(storage.getItem(storageKey(scope))||'[]');return Array.isArray(value)?value.filter(valid).slice(0,1000).map(clean):[];}catch{return [];}}
export function libraryGames(records,saved=[]){
 // 기록에서 만든 이름 색인은 한 번만 만든다(게임마다 만들면 기록 수×게임 수만큼 느려진다).
 const resolve=gameResolver(records),map=new Map();for(const raw of saved){if(!valid(raw))continue;const {name,bggId}=clean(raw),game=resolve({name,bggId}),key=gameKey(game);if(!map.has(key))map.set(key,{key,game,count:0,mine:{}});Object.assign(map.get(key).mine,flags(raw));}
 for(const play of records){if(!valid(play.game))continue;const game=resolve(clean(play.game)),key=gameKey(game),row=map.get(key)||{key,game,count:0,mine:{}};row.count++;map.set(key,row);}
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
 const rows=searchableGameGroups([...mine,...more]).map(row=>{const {logged,...s}=status.get(row.game.bggId)||entry('');const bgg=Math.max(s.bggPlays,logged);const mine=row.mine||{};for(const list of LIBRARY_LISTS)s[list]=s[list]||mine[list]===true;return {...row,...s,bggPlays:bgg,played:row.count>0||bgg>0};});
 if(view==='played')return rows.filter(row=>row.played).sort((a,b)=>Math.max(b.count,b.bggPlays)-Math.max(a.count,a.bggPlays));
 if(view==='wantToPlay')return rows.filter(row=>row.wantToPlay&&(!row.played||row.mine?.wantToPlay===true));
 return view==='all'?rows:rows.filter(row=>row[view]);
}
// 내 목록에서 지운다. 기록이나 BGG에서 온 게임은 목록에 남으므로 화면에서 먼저 막는다.
export function removeLibraryGame(scope,key,records=[],storage=localStorage){
 const resolve=gameResolver(records),saved=readGameLibrary(scope,storage),next=saved.filter(game=>gameKey(resolve(game))!==key);
 if(next.length===saved.length)return false;
 storage.setItem(storageKey(scope),JSON.stringify(next));return true;
}
// list(목록 탭)를 주면 그 목록에 표시해 추가한다. 이미 내 목록에 있으면 표시만 더하고, 기록에서 온 게임이면 표시를 단 항목을 새로 저장한다.
export function addLibraryGame(scope,game,records=[],storage=localStorage,list=''){
 if(!valid(game))throw Error('게임 이름과 BGG ID를 확인해주세요.');
 const {name,bggId}=clean(game),resolved=resolveGame({name,bggId},records),key=gameKey(resolved),saved=readGameLibrary(scope,storage),flag=LIBRARY_LISTS.includes(list)?list:'';
 if(flag){const resolve=gameResolver(records),index=saved.findIndex(item=>gameKey(resolve({name:item.name,bggId:item.bggId}))===key);if(index>=0){if(saved[index][flag])return false;const next=[...saved];next[index]={...saved[index],[flag]:true};storage.setItem(storageKey(scope),JSON.stringify(next));return true;}}
 if(!flag&&libraryGames(records,saved).some(row=>row.key===key))return false;
 if(saved.length>=1000)throw Error('추가한 게임은 최대 1,000개까지 저장할 수 있습니다.');
 storage.setItem(storageKey(scope),JSON.stringify([...saved,{name:resolved.name,bggId:String(resolved.bggId||''),...(flag?{[flag]:true}:{})}]));return true;
}
