import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';
import {bgStatsLinks} from './bgstats-link.js?v=2';
// 장소 관리: 기록과 BGG 플레이의 장소를 모으고, 계정별 기본·숨김 설정(이 기기 저장)으로 추천 목록을 만든다.
export const defaultPlaces=['집','보드게임 카페','모임 장소','온라인'];
const prefKey=scope=>'score.places.v1.'+scope;
const cleanPrefs=value=>({primary:typeof value?.primary==='string'?value.primary.slice(0,120):'',hidden:Array.isArray(value?.hidden)?[...new Set(value.hidden.filter(x=>typeof x==='string'&&x&&x.length<=120))].slice(0,500):[]});
export function readPlacePrefs(scope){return readStoredJson(prefKey(scope),cleanPrefs(null),cleanPrefs);}
export function savePlacePrefs(scope,prefs){writeStoredJson(prefKey(scope),cleanPrefs(prefs));}
const placeOf=value=>typeof value==='string'?value.trim():'';
// Score에서 내보낸 BGG 플레이와 BG Stats가 올린 같은 경기(bgstats-link)는 기록과 한 번만 센다.
export function placeStats(records,bggPlays=[]){
 const ids=new Set(records.map(p=>p.id)),linked=new Set(bgStatsLinks(records,bggPlays).values()),found=new Map(),add=(place,date,source,count=1)=>{if(!place)return;const item=found.get(place)||{place,count:0,records:0,bgg:0,last:''};item.count+=count;item[source]+=count;if(date>item.last)item.last=date;found.set(place,item);};
 for(const p of records)add(placeOf(p.location),p.date||'','records');
 for(const p of bggPlays){if(p?.score?.id&&ids.has(p.score.id)||linked.has(String(p?.id)))continue;add(placeOf(p?.location??p?.score?.location),p?.date||'','bgg',Number.isSafeInteger(p?.quantity)&&p.quantity>0?p.quantity:1);}
 return [...found.values()].sort((a,b)=>b.count-a.count||b.last.localeCompare(a.last)||a.place.localeCompare(b.place));
}
// 저장 화면 추천: 기본 장소 → 많이 쓴 장소(숨김 제외, 최대 30개) → 아직 안 쓴 기본 추천.
export function placeSuggestions(records,bggPlays,prefs){
 const hidden=new Set(prefs.hidden),used=placeStats(records,bggPlays),list=used.map(x=>x.place).filter(place=>!hidden.has(place)).slice(0,30);
 if(prefs.primary&&!hidden.has(prefs.primary)){const at=list.indexOf(prefs.primary);if(at>=0)list.splice(at,1);list.unshift(prefs.primary);}
 for(const place of defaultPlaces)if(!hidden.has(place)&&!used.some(x=>x.place===place)&&!list.includes(place))list.push(place);
 return list;
}
