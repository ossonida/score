// BG Stats에서 가져온 기록(id가 bgstats:)과 BG Stats가 BGG에 직접 올린 플레이(#bgstats, Score 표시 없음)를 연결한다.
// BGG 응답에는 BG Stats 식별자가 없으므로 게임 BGG ID·날짜·참가자 이름과 점수가 모두 같으면 같은 경기로 본다.
const nameKey=name=>String(name||'').trim().normalize('NFKC').toLocaleLowerCase();
const scoreKey=score=>typeof score==='number'&&Number.isFinite(score)?String(score):'';
const playersKey=players=>(Array.isArray(players)?players:[]).map(p=>nameKey(p?.name)+':'+scoreKey(p?.score)).sort().join('|');
const keyOf=(gameId,date,players)=>gameId&&date?[gameId,date,playersKey(players)].join('#'):'';
// 반환: 기록 ID → 연결된 BGG 플레이 ID. 같은 열쇠의 경기가 여러 번이면 순서대로 하나씩 짝짓는다.
export function bgStatsLinks(records,bggPlays=[]){
 const pool=new Map();for(const p of bggPlays){if(!p||p.score?.id)continue;const k=keyOf(p.gameId,p.date,p.players);if(!k)continue;if(!pool.has(k))pool.set(k,[]);pool.get(k).push(String(p.id));}
 // 기록에 BGG 플레이 번호가 있으면 그 번호로 바로 연결하고, 없는 기록만 내용으로 맞춘다.
 const links=new Map();for(const r of records){if(typeof r?.bggPlayId==='string'&&r.bggPlayId){links.set(r.id,r.bggPlayId);continue;}if(typeof r?.id!=='string'||!r.id.startsWith('bgstats:'))continue;const list=pool.get(keyOf(r.game?.bggId,r.date,r.players));if(list?.length)links.set(r.id,list.shift());}
 return links;
}
// 다른 기록 ID로 BGG에 올라간 같은 경기: BGG에 보낸 번호가 없는 기록을 같은 게임·날짜·참가자 이름·점수의 BGG 플레이 중
// 어떤 기록과도 연결되지 않은 것(Score 표시가 있으면 그 기록이 이 기기에 없는 것)과 하나씩 짝짓는다. links에 더해 돌려준다.
export function orphanPlayLinks(records,bggPlays=[],uploads={},links=new Map()){
 const ids=new Set(records.map(r=>r?.id)),used=new Set([...links.values(),...Object.values(uploads||{}).map(u=>u?.bggPlayId)].filter(Boolean).map(String)),pool=new Map();
 for(const p of bggPlays){if(!p||used.has(String(p.id))||p.score?.id&&ids.has(p.score.id))continue;const k=keyOf(p.gameId,p.date,p.players);if(!k)continue;if(!pool.has(k))pool.set(k,[]);pool.get(k).push(String(p.id));}
 const next=new Map(links);for(const r of records){if(!r?.id||next.has(r.id)||uploads?.[r.id]?.bggPlayId)continue;const list=pool.get(keyOf(r.game?.bggId,r.date,r.players));if(list?.length)next.set(r.id,list.shift());}
 return next;
}
// BG Stats 원본이 BGG에 있는데 Score가 같은 기록을 다시 올린 중복 플레이(BGG 플레이 ID 목록).
export function duplicateScoreUploads(records,bggPlays=[]){const links=bgStatsLinks(records,bggPlays);return bggPlays.filter(p=>p?.score?.id&&links.has(p.score.id)).map(p=>({bggPlayId:String(p.id),recordId:p.score.id,original:links.get(p.score.id),date:p.date,name:p.name}));}
// 내보내기 정리 대상: BG Stats 원본(links의 값)이 지금 BGG에 있는데 이 앱이 따로 올린 플레이가 있는 기록.
// 원본이 BGG에 없으면(이미 지운 경우) 이 앱이 올린 플레이가 유일한 기록이므로 남긴다.
export function bgStatsDuplicates(records,links,bggPlays=[],uploads={}){const present=new Set(bggPlays.map(p=>String(p?.id)));return records.flatMap(r=>{const original=links.get(r.id),mine=String(uploads?.[r.id]?.bggPlayId||'');return original&&mine&&mine!==String(original)&&present.has(String(original))?[{recordId:r.id,playId:mine,original:String(original),date:r.date}]:[];});}
