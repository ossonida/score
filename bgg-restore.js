// BGG 경기 중 Score Counter가 내보낸 것([ScoreCounter:기록ID] 표시가 있는 경기)을 Score 기록 형태로 되살립니다.
// BGG 형식에 없는 정보(팀·순위 방식, 공동 점수, 협력 결과·시나리오·난이도·미션 세부, 시나리오 레벨, 확장)는 복원하지 않습니다.
const recordId=/^[A-Za-z0-9_.:-]{1,100}$/,hex=/^#[0-9a-f]{6}$/i;
const palette=['#52c7ef','#ffcc00','#ff6b6b','#7ed957','#b48cff','#ff9f40','#4dd0c8','#f78fb3'];
export function restorablePlay(row,username=''){
 const source=row?.score;if(!source||typeof source.id!=='string'||!recordId.test(source.id)||!Array.isArray(row.players)||!row.players.length)return null;
 const note=String(source.note||''),coop=/^(Scenario \d+|Difficulty .+|Missions \d+.*)$/m.test(note),self=String(username||'').toLowerCase();
 const players=row.players.map((person,index)=>({id:'p'+(index+1),name:String(person.name||'').trim().slice(0,120)||'플레이어 '+(index+1),color:hex.test(person.color||'')?person.color.toLowerCase():palette[index%palette.length],score:coop||!Number.isFinite(person.score)?null:person.score,...(self&&String(person.username||'').toLowerCase()===self?{isSelf:true}:{})}));
 const play={id:source.id,game:{name:row.name,bggId:row.gameId},date:row.date,...(typeof source.location==='string'&&source.location.trim()?{location:source.location.trim().slice(0,120)}:{}),players};
 if(coop)return {...play,rule:'cooperative'};
 const winners=row.players.map(person=>person.win===true),scored=players.every(person=>person.score!==null);
 if(source.known&&winners.some(Boolean)){
  // 점수가 모두 있으면 승자 점수가 최고점인지 최저점인지로 승리 조건을 정하고, 아니면 승패만 되살립니다.
  if(scored){const scores=players.map(person=>person.score),best=Math.max(...scores),worst=Math.min(...scores),top=players.filter((person,index)=>winners[index]).map(person=>person.score);if(top.every(score=>score===best))return {...play,rule:'highest'};if(top.every(score=>score===worst))return {...play,rule:'lowest'};}
  return {...play,rule:'highest',players:players.map((person,index)=>({...person,score:null,winner:winners[index]}))};
 }
 return {...play,rule:'highest'};
}
