import {gameKey,winnerIds} from './records-core.js';
export const nameKey=name=>String(name||'').trim().normalize('NFKC').toLocaleLowerCase();
const numeric=value=>typeof value==='number'&&Number.isFinite(value);
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const better=(a,b,rule)=>rule==='lowest'?a<b:a>b;
const ordered=records=>[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
export function namesIn(records){return [...new Map(records.flatMap(p=>p.players.map(x=>[nameKey(x.name),x.name]))).entries()].sort((a,b)=>a[1].localeCompare(b[1]));}
export function readIdentity(scope){try{const p=JSON.parse(localStorage.getItem('score.identity.v1.'+scope)||'null');if(!p||typeof p.primary!=='string'||!Array.isArray(p.aliases))return null;return {primary:nameKey(p.primary),aliases:[...new Set(p.aliases.filter(x=>typeof x==='string').map(nameKey))].slice(0,100)};}catch{return null;}}
export function saveIdentity(scope,profile){localStorage.setItem('score.identity.v1.'+scope,JSON.stringify({primary:nameKey(profile.primary),aliases:[...new Set(profile.aliases.map(nameKey))].slice(0,100)}));}
export function meIn(play,profile){if(!profile)return null;const keys=new Set([profile.primary,...profile.aliases].map(nameKey)),people=play.players.filter(p=>keys.has(nameKey(p.name)));return people.length===1?people[0]:null;}
export function personalRank(play,person){
 if(play.rule==='cooperative')return null;
 if(Number.isInteger(person.rank)&&person.rank>0)return {value:person.rank,source:'기록 순위'};
 if(!play.players.every(p=>numeric(p.score)))return null;
 return {value:1+play.players.filter(p=>better(p.score,person.score,play.rule)).length,source:'점수 순위'};
}
export function personalGame(records,profile,rule){
 const all=ordered(records),keys=new Set(profile?[profile.primary,...profile.aliases].map(nameKey):[]),ambiguous=all.filter(p=>p.players.filter(x=>keys.has(nameKey(x.name))).length>1).length;
 const own=all.flatMap(play=>{const person=meIn(play,profile);return person?[{play,person}]:[];}),rules=[...new Set(own.map(x=>x.play.rule))];
 const active=rules.includes(rule)?rule:rules[0]||'highest',entries=own.filter(x=>x.play.rule===active).map(({play,person})=>{const wins=winnerIds(play);return {play,person,rank:personalRank(play,person),known:active!=='cooperative'&&wins.length>0,won:active!=='cooperative'&&wins.includes(person.id)};});
 const scored=entries.filter(x=>numeric(x.person.score)),scores=scored.map(x=>x.person.score),bestEntry=scored.reduce((best,x)=>!best||better(x.person.score,best.person.score,active)?x:best,null),known=entries.filter(x=>x.known),wins=known.filter(x=>x.won).length;
 const latest5=entries.slice(-5),previous5=entries.slice(-10,-5),recentScores=latest5.filter(x=>numeric(x.person.score)),previousScores=previous5.filter(x=>numeric(x.person.score));
 // Do not invent chronology from the IDs assigned to imported same-day records.
 const comparable=latest5.length===5&&previous5.length===5&&recentScores.length===5&&previousScores.length===5&&previous5.at(-1).play.date<latest5[0].play.date;
 const currentAverage=mean(recentScores.map(x=>x.person.score)),previousAverage=comparable?mean(previousScores.map(x=>x.person.score)):null;
 const sizes=new Map(),opponents=new Map();for(const entry of entries){const {play,person}=entry,size=play.players.length,row=sizes.get(size)||{size,count:0,known:0,wins:0};row.count++;if(entry.known){row.known++;if(entry.won)row.wins++;}sizes.set(size,row);
  // A normalized name repeated in the same game cannot identify a unique opponent.
  const seen=new Map();for(const p of play.players)seen.set(nameKey(p.name),(seen.get(nameKey(p.name))||0)+1);
  for(const opponent of play.players){const key=nameKey(opponent.name);if(opponent.id===person.id||keys.has(key)||seen.get(key)!==1)continue;
   const row=opponents.get(key)||{key,name:opponent.name,count:0,ahead:0,behind:0,tied:0,compared:0};row.count++;
   if(active!=='cooperative'){let result=null;if(Number.isInteger(person.rank)&&Number.isInteger(opponent.rank)){result=person.rank===opponent.rank?0:person.rank<opponent.rank?1:-1;}else if(numeric(person.score)&&numeric(opponent.score))result=person.score===opponent.score?0:better(person.score,opponent.score,active)?1:-1;
    if(result!==null){row.compared++;row[result===0?'tied':result>0?'ahead':'behind']++;}
   }opponents.set(key,row);
  }
 }
 return {rules,rule:active,ownCount:own.length,ambiguous,entries,total:entries.length,first:entries[0]?.play.date,last:entries.at(-1)?.play.date,wins,known:known.length,rate:known.length?wins/known.length:null,average:mean(scores),best:bestEntry,scoreCount:scores.length,currentAverage,previousAverage,comparable,delta:comparable?currentAverage-previousAverage:null,recent:entries.slice(-5).reverse(),sizes:[...sizes.values()].sort((a,b)=>a.size-b.size),opponents:[...opponents.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))};
}
export function matchInsight(records,play,profile){
 const person=meIn(play,profile);if(!person)return null;
 const same=records.filter(p=>gameKey(p.game)===gameKey(play.game)&&p.rule===play.rule),own=same.flatMap(p=>{const me=meIn(p,profile);return me?[{play:p,person:me}]:[];}),scored=own.filter(x=>numeric(x.person.score)),previous=scored.filter(x=>x.play.date<play.date),score=person.score;
 const bestBefore=previous.reduce((best,x)=>best===null||better(x.person.score,best,play.rule)?x.person.score:best,null),previousAverage=mean(previous.map(x=>x.person.score)),wins=winnerIds(play),winning=play.players.filter(p=>wins.includes(p.id));
 const consistent=play.players.every(p=>numeric(p.score))&&winning.length>0&&winning.every(p=>!play.players.some(other=>better(other.score,p.score,play.rule)));
 const others=play.players.filter(p=>p.id!==person.id),gap=play.rule!=='cooperative'&&consistent&&numeric(score)?wins.includes(person.id)?(others.length?Math.min(...others.map(x=>Math.abs(score-x.score))):null):Math.min(...winning.map(x=>Math.abs(score-x.score))):null;
 const meetings=others.map(p=>({name:p.name,count:own.filter(x=>x.play.players.some(o=>nameKey(o.name)===nameKey(p.name))).length}));
 return {person,rank:personalRank(play,person),won:wins.includes(person.id),known:play.rule!=='cooperative'&&wins.length>0,scoreRank:numeric(score)?1+scored.filter(x=>better(x.person.score,score,play.rule)).length:null,scoreTotal:scored.length,previousAverage,delta:numeric(score)&&previousAverage!==null?score-previousAverage:null,newBest:play.rule!=='cooperative'&&numeric(score)&&bestBefore!==null&&better(score,bestBefore,play.rule),bestBefore,gap,meetings,cooperative:play.rule==='cooperative'};
}
