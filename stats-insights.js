import {gameKey,winnerIds} from './records-core.js?v=44';
const identity=name=>name.trim().normalize('NFKC').toLocaleLowerCase();
const scored=p=>p.players.length>=2&&p.players.every(x=>typeof x.score==='number'&&Number.isFinite(x.score));
export function summarizeStats(records,today){
 const ordered=[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 const todayPlays=ordered.filter(p=>p.date===today),day=todayPlays.length?today:ordered.at(-1)?.date||today,dayPlays=ordered.filter(p=>p.date===day);
 const players=new Set(dayPlays.flatMap(p=>p.players.filter(x=>x.anonymous!==true).map(x=>identity(x.name))));
 const wins=new Map();for(const p of dayPlays)for(const person of p.players.filter(x=>x.anonymous!==true&&winnerIds(p).includes(x.id))){const key=identity(person.name);const row=wins.get(key)||{name:person.name,wins:0};row.wins++;wins.set(key,row);}
 const leaders=[...wins.values()].sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name)).slice(0,3);
 const closeGames=dayPlays.filter(p=>p.rule!=='cooperative'&&scored(p)).flatMap(play=>{
  const sorted=[...play.players].sort((a,b)=>play.rule==='lowest'?a.score-b.score:b.score-a.score),winner=winnerIds(play);
  // Imported manual winners must agree with score order before describing a 1st/2nd score gap.
  if(!winner.includes(sorted[0].id)||winner.some(id=>!sorted.filter(x=>x.score===sorted[0].score).some(x=>x.id===id)))return [];
  const gap=Math.abs(sorted[0].score-sorted[1].score);return [{play,first:sorted[0],second:sorted[1],gap}];
 }).sort((a,b)=>a.gap-b.gap||b.play.createdAt.localeCompare(a.play.createdAt));
 const bests=new Map(),previousDays=new Map();for(const play of ordered){if(play.rule==='cooperative')continue;for(const person of play.players){if(person.anonymous===true||typeof person.score!=='number')continue;const key=JSON.stringify([gameKey(play.game),play.rule,identity(person.name)]),old=bests.get(key);if(!old||(play.rule==='lowest'?person.score<old.score:person.score>old.score))bests.set(key,{key,play,name:person.name,score:person.score});
  if(play.date<day){const previous=previousDays.get(key);if(previous===undefined||(play.rule==='lowest'?person.score<previous:person.score>previous))previousDays.set(key,person.score);}
 }}
 const personalBests=[...bests.values()].sort((a,b)=>b.play.date.localeCompare(a.play.date)||a.name.localeCompare(b.name));
 const improved=[];for(const entry of personalBests.filter(x=>x.play.date===day)){
  const before=previousDays.get(entry.key);if(before!==undefined&&(entry.play.rule==='lowest'?entry.score<before:entry.score>before))improved.push({...entry,previous:before,improvement:Math.abs(entry.score-before)});
 }
 const pairs=new Map();for(const p of ordered){if(p.rule==='cooperative'||p.players.length!==2||p.players.some(x=>x.anonymous===true))continue;const people=[...p.players].sort((a,b)=>identity(a.name).localeCompare(identity(b.name)));if(identity(people[0].name)===identity(people[1].name))continue;const winner=winnerIds(p);if(!winner.length)continue;
  const key=JSON.stringify([gameKey(p.game),...people.map(x=>identity(x.name))]);const pair=pairs.get(key)||{game:p.game,names:people.map(x=>x.name),wins:[0,0],draws:0,count:0,lastDate:p.date};pair.count++;pair.lastDate=p.date;
  const outcomes=people.map(x=>winner.includes(x.id));if(outcomes.every(Boolean))pair.draws++;else if(outcomes[0])pair.wins[0]++;else if(outcomes[1])pair.wins[1]++;pairs.set(key,pair);
 }
 const rivals=[...pairs.values()].filter(p=>p.count>=2).sort((a,b)=>b.count-a.count||b.lastDate.localeCompare(a.lastDate));
 return {total:records.length,todayCount:todayPlays.length,day,dayCount:dayPlays.length,gameCount:new Set(dayPlays.map(p=>gameKey(p.game))).size,playerCount:players.size,leaders,closest:closeGames[0]||null,improved:improved.slice(0,3),personalBests:personalBests.slice(0,3),rival:rivals[0]||null};
}

export function summarizeGame(records){
 const ordered=[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 const rows=new Map(),people=new Set();
 for(const play of ordered){const winners=winnerIds(play),known=play.rule!=='cooperative'&&winners.length>0;
  for(const p of play.players){if(p.anonymous===true)continue;const person=identity(p.name);people.add(person);const key=JSON.stringify([person,play.rule]);
   const row=rows.get(key)||{key,name:p.name,rule:play.rule,count:0,known:0,wins:0,scores:[],recent:[]};row.count++;if(known){row.known++;if(winners.includes(p.id))row.wins++;}
   if(typeof p.score==='number'&&Number.isFinite(p.score))row.scores.push(p.score);
   row.recent.push({id:play.id,date:play.date,score:p.score,won:known&&winners.includes(p.id),known});rows.set(key,row);
  }
 }
 return {game:ordered[0]?.game,total:ordered.length,people:people.size,days:new Set(ordered.map(p=>p.date)).size,first:ordered[0]?.date,last:ordered.at(-1)?.date,
  players:[...rows.values()].map(r=>({...r,average:r.scores.length?r.scores.reduce((a,b)=>a+b,0)/r.scores.length:null,best:r.scores.length?(r.rule==='lowest'?Math.min(...r.scores):Math.max(...r.scores)):null,rate:r.known?r.wins/r.known:null,recent:r.recent.slice(-8)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))};
}
