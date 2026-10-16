import {resolveGame,matchGameRecords} from './game-catalog.js?v=60';
export function gameKey(game) {
  return game.bggId ? `bgg:${game.bggId}` : `name:${game.name.trim().normalize('NFKC').toLocaleLowerCase()}`;
}
export function winnerIds(play) {
  if (play.rule === 'cooperative') return [];
  if(play.players.some(p=>typeof p.winner==='boolean'))return play.players.filter(p=>p.winner===true).map(p=>p.id);
  if(!play.players.every(p=>typeof p.score==='number'&&Number.isFinite(p.score)))return [];
  const scored=play.players;
  if(!scored.length)return [];
  const best = (play.rule === 'lowest' ? Math.min : Math.max)(...scored.map(p => p.score));
  return scored.filter(p => p.score === best).map(p => p.id);
}
export function createPlay({game, date, rule, players}, id = crypto.randomUUID()) {
  if(!game||typeof game.name!=='string'||typeof id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(id))throw Error('기록 형식을 확인해주세요.');
  const name = game.name.trim();
  if (!name || name.length > 120) throw Error('게임명을 120자 이내로 입력해주세요.');
  game=resolveGame(game);
  const bggId = game.bggId ? String(game.bggId) : '';
  if (bggId && !/^[1-9][0-9]{0,9}$/.test(bggId)) throw Error('BGG 게임 ID는 양의 정수여야 합니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) throw Error('날짜를 확인해주세요.');
  if (!['highest','lowest','cooperative'].includes(rule)) throw Error('승리 조건을 선택해주세요.');
  if (!Array.isArray(players) || !players.length || players.length > 100 || players.some(p => !p||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>120 || !(p.score===null||typeof p.score==='number'&&Number.isFinite(p.score)&&Math.abs(p.score)<=Number.MAX_SAFE_INTEGER) || !/^#[0-9a-f]{6}$/i.test(p.color))) throw Error('플레이어와 점수를 확인해주세요.');
  return {id, game:{name, bggId}, date, rule, createdAt:new Date().toISOString(), players:players.map(p=>({id:p.id,name:p.name.trim(),color:p.color,score:p.score,...(typeof p.anonymous==='boolean'?{anonymous:p.anonymous}:{}),...(typeof p.isSelf==='boolean'?{isSelf:p.isSelf}:{}),...(typeof p.winner==='boolean'?{winner:p.winner}:{}),...(Number.isSafeInteger(p.rank)&&p.rank>0&&p.rank<=100?{rank:p.rank}:{})}))};
}
export function isPlay(p) {
  try { return typeof p.id==='string' && p.id.length<=100 && typeof p.createdAt==='string' && p.createdAt.length<=40 && Number.isFinite(Date.parse(p.createdAt)) && !!createPlay(p,p.id); } catch { return false; }
}
export function gameStats(plays) {
  plays=matchGameRecords(plays);
  const groups = new Map();
  for (const play of plays) {
    const key=gameKey(play.game);
    if (!groups.has(key)) groups.set(key,{key,game:play.game,count:0,competitive:0,cooperative:0,players:new Map()});
    const group=groups.get(key);group.count++;group[play.rule==='cooperative'?'cooperative':'competitive']++;
    const winners=winnerIds(play);
    for (const p of play.players) {
      if(p.anonymous===true&&p.isSelf!==true)continue;
      const identity=p.isSelf===true?'self:assigned':p.name.normalize('NFKC').toLocaleLowerCase();
      if (!group.players.has(identity)) group.players.set(identity,{name:p.isSelf===true?'나':p.name,count:0,competitive:0,known:0,wins:0,total:0,scoreCount:0,highest:null,lowest:null});
      const row=group.players.get(identity);row.count++;if(typeof p.score==='number'){row.total+=p.score;row.scoreCount++;row.highest=row.highest===null?p.score:Math.max(row.highest,p.score);row.lowest=row.lowest===null?p.score:Math.min(row.lowest,p.score);}
      if(play.rule!=='cooperative'){row.competitive++;if(winners.length)row.known++;if(winners.includes(p.id))row.wins++;}
    }
  }
  return [...groups.values()].map(g=>({...g,players:[...g.players.values()].map(p=>({...p,average:p.scoreCount?p.total/p.scoreCount:null,winRate:p.known?p.wins/p.known:null})).sort((a,b)=>b.wins-a.wins||b.average-a.average)})).sort((a,b)=>b.count-a.count||a.game.name.localeCompare(b.game.name));
}
