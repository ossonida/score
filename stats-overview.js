import {metadata} from './bgg-metadata.js?v=64';
import {gameKey,winnerIds} from './records-core.js?v=128';
import {meIn,nameKey} from './personal-stats.js?v=114';
import {scoreGameType} from './score-games.js?v=119';
export const typeLabels={strategy:'전략',sports:'스포츠',family:'가족',party:'파티',abstract:'추상',thematic:'테마',war:'워게임',children:'어린이',customizable:'커스터마이징',cooperative:'협동',unknown:'미분류'};
const domainKeys={'Strategy Games':'strategy','Family Games':'family','Party Games':'party','Abstract Games':'abstract','Thematic Games':'thematic','Wargames':'war',"Children's Games":'children',"Children’s Games":'children','Customizable Games':'customizable'};
export function gameTypeList(play){const ownType=scoreGameType(play.game);if(ownType)return [ownType];const data=metadata(play.game);if(!data)return ['unknown'];const types=[...new Set(data.domains.map(x=>domainKeys[x]).filter(Boolean))];if(data.cooperative)types.push('cooperative');return types.length?types:['unknown'];}
export function gameType(play){return gameTypeList(play)[0];}
export function latestPlayDate(records){return records.reduce((date,p)=>p.date>date?p.date:date,'');}
export function overviewStats(records,profile){
 const types=Object.fromEntries(Object.keys(typeLabels).map(k=>[k,0])),games=new Map();let myCount=0,myCompetitive=0,wins=0,known=0,unassigned=0;
 for(const play of records){const categories=gameTypeList(play);for(const type of categories)types[type]++;const key=gameKey(play.game),row=games.get(key)||{key,game:play.game,count:0,latest:play.date,types:new Set()};row.count++;if(play.date>row.latest)row.latest=play.date;for(const type of categories)row.types.add(type);games.set(key,row);const me=meIn(play,profile);if(!me){unassigned++;continue;}myCount++;if(categories.includes('cooperative')||play.rule==='cooperative')continue;myCompetitive++;const winners=winnerIds(play);if(winners.length||me.draw===true){known++;if(winners.includes(me.id))wins++;}}
 return {total:records.length,gameCount:games.size,wins:myCount?(known||!myCompetitive?wins:null):null,myCount,known,unassigned,types,games:[...games.values()].sort((a,b)=>b.count-a.count||b.latest.localeCompare(a.latest)||a.game.name.localeCompare(b.game.name)),latest:latestPlayDate(records)};
}

export function attendanceCount(records,profile){const named=new Set();let anonymous=0;for(const play of records){const me=meIn(play,profile);let unknown=0;for(const person of play.players){if(person.id===me?.id)named.add('self');else if(person.anonymous)unknown++;else named.add('name:'+nameKey(person.name));}anonymous=Math.max(anonymous,unknown);}return named.size+anonymous;}
