// 마이티 기록(mightyRounds)의 나의 기록 통계. entries: [{play, person}] — person은 그 경기의 내 플레이어.
// 주공 성공률은 내가 주공인 판, 프렌드 승률은 프렌드로 지목된 판, 야당 방어율은 야당일 때 주공 실패 비율이다.
export function mightyStats(entries){
 const list=entries.filter(({play,person})=>person&&Array.isArray(play?.mightyRounds)&&play.mightyRounds.length);
 const lead={tries:0,wins:0,bidSum:0,bestBid:null},friend={tries:0,wins:0},opponent={tries:0,defends:0},partners=new Map();
 let total=0,rounds=0;const games=[];
 const partner=(name,kind,won)=>{const key=kind+'\u0001'+name,row=partners.get(key)||{name,kind,count:0,wins:0};row.count++;if(won)row.wins++;partners.set(key,row);};
 for(const {play,person}of list){
  const me=person.id,nameOf=id=>play.players.find(p=>p.id===id)?.name||'';let mine=0,leadTries=0,leadWins=0;
  for(const round of play.mightyRounds){
   if(!(me in (round.points||{})))continue;rounds++;const points=Number(round.points[me])||0,success=round.result==='success';mine+=points;
   if(round.lead===me){lead.tries++;leadTries++;lead.bidSum+=round.bid;if(success){lead.wins++;leadWins++;lead.bestBid=Math.max(lead.bestBid??0,round.bid);}if(round.friend&&nameOf(round.friend))partner(nameOf(round.friend),'mine',success);}
   else if(round.friend===me){friend.tries++;if(success)friend.wins++;if(nameOf(round.lead))partner(nameOf(round.lead),'theirs',success);}
   else{opponent.tries++;if(!success)opponent.defends++;}
  }
  total+=mine;
  const scores=play.players.map(p=>p.score).filter(score=>typeof score==='number');
  games.push({play,rounds:play.mightyRounds.length,leadTries,leadWins,points:mine,rank:scores.filter(score=>score>(person.score??mine)).length+1});
 }
 const rate=(wins,tries)=>tries?wins/tries:null;
 games.sort((a,b)=>(b.play.date+(b.play.createdAt||'')).localeCompare(a.play.date+(a.play.createdAt||'')));
 return {plays:list.length,rounds,total,lead:{...lead,rate:rate(lead.wins,lead.tries),averageBid:lead.tries?lead.bidSum/lead.tries:null},friend:{...friend,rate:rate(friend.wins,friend.tries)},opponent:{...opponent,rate:rate(opponent.defends,opponent.tries)},recent:games.slice(0,3),partners:[...partners.values()].sort((a,b)=>b.count-a.count||b.wins-a.wins||a.name.localeCompare(b.name)).slice(0,5)};
}
