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
// BG Stats 원본이 BGG에 있는데 Score가 같은 기록을 다시 올린 중복 플레이(BGG 플레이 ID 목록).
export function duplicateScoreUploads(records,bggPlays=[]){const links=bgStatsLinks(records,bggPlays);return bggPlays.filter(p=>p?.score?.id&&links.has(p.score.id)).map(p=>({bggPlayId:String(p.id),recordId:p.score.id,original:links.get(p.score.id),date:p.date,name:p.name}));}
