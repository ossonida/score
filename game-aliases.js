// 내가 기억시킨 한글 검색 별칭: 계정별로 이 기기에만 저장하고 검색에만 쓴다(화면의 게임 이름은 바꾸지 않는다).
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';
import {normalizeGameQuery} from './game-catalog.js?v=166';
const MAX_GAMES=500,MAX_ALIASES=5,hangul=/[ㄱ-ㆎ가-힣]/;
const storageKey=scope=>'score.gameAliases.v1.'+scope;
const validId=id=>/^[1-9][0-9]{0,9}$/.test(String(id??''));
const validAlias=alias=>typeof alias==='string'&&alias.trim().length>0&&alias.trim().length<=40&&hangul.test(alias);
const check=value=>Array.isArray(value)?value.filter(entry=>entry&&validId(entry.id)&&typeof entry.name==='string'&&entry.name.trim()&&entry.name.length<=120&&Array.isArray(entry.aliases)).map(entry=>({id:String(entry.id),name:entry.name,aliases:entry.aliases.filter(validAlias).map(alias=>alias.trim()).slice(0,MAX_ALIASES)})).filter(entry=>entry.aliases.length).slice(0,MAX_GAMES):[];
export function hasHangul(text){return hangul.test(String(text??''));}
export function readGameAliases(scope){return readStoredJson(storageKey(scope),[],check);}
// 같은 게임에 같은 별칭이 이미 있으면 저장하지 않는다. 새 별칭이 앞에 온다.
export function rememberGameAlias(scope,game,alias){
 const id=String(game?.bggId||game?.id||''),text=String(alias??'').trim();
 if(!validId(id)||typeof game.name!=='string'||!game.name.trim()||!validAlias(text))return false;
 const list=readGameAliases(scope),entry=list.find(item=>item.id===id),q=normalizeGameQuery(text);
 if(entry?.aliases.some(item=>normalizeGameQuery(item)===q))return false;
 writeStoredJson(storageKey(scope),[{id,name:game.name.trim().slice(0,120),aliases:[text,...(entry?.aliases||[])].slice(0,MAX_ALIASES)},...list.filter(item=>item.id!==id)].slice(0,MAX_GAMES));
 return true;
}
// 검색 결과 앞에 내 별칭으로 찾은 게임을 붙인다. Score 자체 게임 결과는 그대로 둔다.
export function withAliasMatches(local,query,entries){
 const q=normalizeGameQuery(query);if(!q||!entries.length||local.some(game=>game.scoreGame))return local;
 const found=entries.filter(entry=>!local.some(game=>String(game.id)===entry.id)&&entry.aliases.some(alias=>normalizeGameQuery(alias).includes(q))).map(entry=>({id:entry.id,name:entry.name,source:'내 별칭'}));
 return found.length?[...found,...local].slice(0,40):local;
}
// 별칭과 정확히 같고 한 게임만 가리키면 BGG에는 그 게임의 영문명으로 검색한다.
export function aliasSearchName(query,entries){const q=normalizeGameQuery(query),hits=entries.filter(entry=>entry.aliases.some(alias=>normalizeGameQuery(alias)===q));return hits.length===1?hits[0].name:query;}
