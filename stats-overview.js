import {gameKey,winnerIds} from './records-core.js?v=23';
import {meIn} from './personal-stats.js?v=23';
import {starterGames,normalizeGameQuery} from './game-catalog.js?v=23';
import {gameTypes} from './game-types.js?v=23';
export const typeLabels={strategy:'전략',cooperative:'협동','family-party':'가족·파티',other:'기타',unknown:'미분류'};
export function readGameTypes(scope){try{const data=JSON.parse(localStorage.getItem('score.gameTypes.v1.'+scope)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?Object.fromEntries(Object.entries(data).filter(([k,v])=>k.length<=160&&Object.hasOwn(typeLabels,v)&&v!=='unknown')):{};}catch{return {};}}
export function saveGameType(scope,game,type){if(type!=='auto'&&(!Object.hasOwn(typeLabels,type)||type==='unknown'))throw Error('게임 분류를 확인해주세요.');const data=readGameTypes(scope),key=gameKey(game);if(type==='auto')delete data[key];else data[key]=type;localStorage.setItem('score.gameTypes.v1.'+scope,JSON.stringify(data));}
export function gameType(play,overrides={}){
 const override=overrides[gameKey(play.game)];if(Object.hasOwn(typeLabels,override)&&override!=='unknown')return override;
 if(play.rule==='cooperative')return 'cooperative';
 const id=play.game.bggId||starterGames.find(g=>[g.name,...g.aliases].some(n=>normalizeGameQuery(n)===normalizeGameQuery(play.game.name)))?.id;
 const data=gameTypes[id];if(!data)return 'unknown';if(data.cooperative)return 'cooperative';if(data.domains.includes('Strategy Games'))return 'strategy';if(data.domains.some(d=>['Family Games','Party Games'].includes(d)))return 'family-party';return data.domains.length?'other':'unknown';
}
export function latestPlayDate(records){return records.reduce((date,p)=>p.date>date?p.date:date,'');}
export function overviewStats(records,profile,overrides={}){
 const types=Object.fromEntries(Object.keys(typeLabels).map(k=>[k,0])),games=new Map();let myCount=0,myCompetitive=0,wins=0,known=0,unassigned=0;
 for(const play of records){const type=gameType(play,overrides);types[type]++;const key=gameKey(play.game),row=games.get(key)||{key,game:play.game,count:0,latest:play.date,types:new Set()};row.count++;if(play.date>row.latest)row.latest=play.date;row.types.add(type);games.set(key,row);const me=meIn(play,profile);if(!me){unassigned++;continue;}myCount++;if(type==='cooperative'||play.rule==='cooperative')continue;myCompetitive++;const winners=winnerIds(play);if(winners.length){known++;if(winners.includes(me.id))wins++;}}
 return {total:records.length,gameCount:games.size,wins:myCount?(known||!myCompetitive?wins:null):null,myCount,known,unassigned,types,games:[...games.values()].sort((a,b)=>b.count-a.count||b.latest.localeCompare(a.latest)||a.game.name.localeCompare(b.game.name)),latest:latestPlayDate(records)};
}
