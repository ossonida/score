// 개인 게임 티어(화면 이름 '취향 티어'): 내가 그 게임을 얼마나 좋아하는지(실력·랭킹 아님). 게임마다 하나(최애·S·A·B·C, 없으면 미분류)를 계정 범위별 기기 저장에 둔다(게임 키 → 티어 id).
// 내 게임 목록·기록 저장 형식은 건드리지 않는다. 클라우드 동기화·BGG 내보내기 대상이 아니다.
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';
export const GAME_TIERS=[{id:'fav',label:'최애',note:'가장 좋아하는 게임',color:'#ff7f7f'},{id:'s',label:'S',note:'아주 좋아요',color:'#ffbf7f'},{id:'a',label:'A',note:'좋아요',color:'#ffdf7f'},{id:'b',label:'B',note:'괜찮아요',color:'#7fdf7f'},{id:'c',label:'C',note:'손이 잘 안 가요',color:'#e48ae4'}];
export const UNRANKED={id:'',label:'미분류',color:'#5b6678'};
const ids=new Set(GAME_TIERS.map(tier=>tier.id));
const storageKey=scope=>'score.gameTiers.v1.'+scope;
const clean=value=>{if(!value||typeof value!=='object'||Array.isArray(value))return {};const out={};for(const [key,tier] of Object.entries(value))if(typeof key==='string'&&key.length<=200&&ids.has(tier))out[key]=tier;return out;};
export function readGameTiers(scope){return readStoredJson(storageKey(scope),{},clean);}
export function tierInfo(id){return GAME_TIERS.find(tier=>tier.id===id)||UNRANKED;}
// tier가 ''이면 지운다. 바뀌면 true를 돌려주고 score-tiers:changed를 알린다.
export function setGameTier(scope,key,tier){
 if(!key)return false;const next={...readGameTiers(scope)},value=ids.has(tier)?tier:'';
 if((next[key]||'')===value)return false;if(value)next[key]=value;else delete next[key];
 writeStoredJson(storageKey(scope),next);globalThis.dispatchEvent?.(new CustomEvent('score-tiers:changed',{detail:{scope,key,tier:value}}));return true;
}
// 티어 보기 묶음: 티어 순서대로, 게임이 있는 티어만(미분류는 마지막).
export function groupByTier(rows,tiers){
 const groups=new Map([...GAME_TIERS,UNRANKED].map(tier=>[tier.id,{...tier,items:[]}]));
 for(const row of rows)groups.get(ids.has(tiers[row.key])?tiers[row.key]:'').items.push(row);
 return [...groups.values()].filter(group=>group.items.length);
}
