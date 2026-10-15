import {safeGameImage} from './game-artwork.js?v=39';
import {createPlay,isPlay} from './records-core.js?v=39';
export const MAX_IMPORT_BYTES=20*1024*1024,MAX_IMPORT_RECORDS=10000;
const colors=['#52c7ef','#ffcc00','#b44cdb','#45d9a0','#ff9461','#b19be6','#087fff','#ff2496'];
const yes=v=>v===true||v===1;
const text=v=>typeof v==='string'?v.trim():'';
const ref=v=>typeof v==='string'||Number.isSafeInteger(v)?String(v):'';
async function hash(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function date(value){const s=String(value||'');const match=s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);if(!match)throw Error('날짜 없음');const d=`${match[1]}-${match[2]}-${match[3]}`;if(new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d)throw Error('잘못된 날짜');return d;}
function number(value){if(value===null||value===undefined||value===''||typeof value==='string'&&!value.trim())return null;if(typeof value!=='number'&&typeof value!=='string')throw Error('잘못된 점수');if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))throw Error('잘못된 점수');const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER)throw Error('점수 범위 초과');return n;}
export function mergeImported(existing,incoming){const map=new Map(existing.map(p=>[p.id,p]));let duplicates=0;const added=[];for(const play of incoming){if(map.has(play.id)){duplicates++;continue;}map.set(play.id,play);added.push(play);}return {records:[...map.values()],added,duplicates};}
export async function parseImport(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_IMPORT_BYTES)throw Error('20MB 이하의 JSON 파일을 선택해주세요.');
 let data;try{data=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw Error('JSON 파일을 읽을 수 없습니다. 압축을 풀고 JSON 파일을 선택해주세요.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('지원하는 백업 파일이 아닙니다.');
 const score=data.format==='score-backup'&&data.version===1;
 const bg=Array.isArray(data.games)&&Array.isArray(data.players)&&Array.isArray(data.plays);
 if(!score&&!bg)throw Error('Score 백업 또는 Board Game Stats JSON 파일을 선택해주세요.');
 const source=score?data.records:data.plays;if(!Array.isArray(source)||source.length>MAX_IMPORT_RECORDS)throw Error('한 번에 기록 10,000개까지 가져올 수 있습니다.');
 const gameImages={},records=[],reasons=new Map(),occurrences=new Map();let skipped=0;
 const reject=reason=>{skipped++;reasons.set(reason,(reasons.get(reason)||0)+1);};
 if(score){for(const p of source){if(!isPlay(p)){reject('잘못된 Score 기록');continue;}records.push({...createPlay(p,p.id),createdAt:p.createdAt});}}
 else{
  if(data.games.length>50000||data.players.length>50000)throw Error('게임 또는 플레이어 목록이 너무 큽니다.');
  const games=new Map(data.games.filter(g=>g&&ref(g.id)).map(g=>[ref(g.id),g]));
  const people=new Map(data.players.filter(p=>p&&ref(p.id)).map(p=>[ref(p.id),p]));
  for(const [index,p] of source.entries()){
   try{
    if(!p||typeof p!=='object')throw Error('잘못된 플레이 기록');
    if(yes(p.ignored))throw Error('통계 제외 표시된 기록');
    const g=games.get(ref(p.gameRefId));if(!g)throw Error('게임 정보 없음');
    const name=text(g.name)||text(g.bggName);if(!name||name.length>120)throw Error('게임명 없음 또는 길이 초과');
    const bggId=Number(g.bggId)>0?String(g.bggId):'';const image=[g.bggImageUrl,g.bggThumbnailUrl,g.imageUrl,g.thumbnailUrl,g.urlImage,g.image,g.thumbnail].map(safeGameImage).find(Boolean);if(image&&/^[1-9][0-9]{0,9}$/.test(bggId))gameImages[bggId]=image;
    const scores=p.playerScores;if(!Array.isArray(scores)||!scores.length||scores.length>100)throw Error('플레이어 정보 없음 또는 인원 초과');
    const players=scores.map((s,i)=>{
     const person=people.get(ref(s?.playerRefId));if(!person)throw Error('플레이어 참조 없음');
     const name=text(person.name)||'익명 플레이어';if(name.length>120)throw Error('플레이어 이름 길이 초과');
     const row={id:`bgp-${i}-${ref(s.playerRefId).replace(/[^A-Za-z0-9_.:-]/g,'').slice(0,64)}`,name,color:colors[i%colors.length],score:number(s.score)};
     // Explicit BG Stats winners take precedence over any inferred scoring rule.
     if(s.winner!==undefined)row.winner=yes(s.winner);
     if(Number.isSafeInteger(Number(s.rank))&&Number(s.rank)>0&&Number(s.rank)<=100)row.rank=Number(s.rank);
     return row;
    });
    if(!players.every(row=>typeof row.winner==='boolean'))for(const row of players)row.winner=false;
    const when=date(p.playDate||p.playDateYmd),cooperative=p.cooperative===undefined?yes(g.cooperative):yes(p.cooperative);
    const highest=p.highestWins??p.highestScoreWins??g.highestWins;
    const rule=cooperative?'cooperative':highest===false||highest===0?'lowest':'highest';
    const fingerprint=JSON.stringify([bggId||name,p.playDate||p.playDateYmd,players.map(x=>[x.name,x.score,x.winner,x.rank||0]),p.durationMin||0]);
    const occurrence=occurrences.get(fingerprint)||0;occurrences.set(fingerprint,occurrence+1);
    const identity=text(p.uuid)?'uuid:'+text(p.uuid).toLowerCase():fingerprint+'#'+occurrence;
    const id='bgstats:'+(await hash(identity)).slice(0,48);
    const record=createPlay({game:{name,bggId},date:when,rule,players},id);record.createdAt=when+'T12:00:00.000Z';records.push(record);
    if(index%200===199)await new Promise(resolve=>setTimeout(resolve,0));
   }catch(error){reject(error.message||'읽을 수 없는 기록');}
  }
 }
 return {format:score?'Score':'Board Game Stats',gameImages,records,total:source.length,skipped,reasons:[...reasons].map(([reason,count])=>({reason,count})),scope:score?'Score 게임 기록':'게임명·날짜·플레이어·점수·승자 (메모·장소·사진·컬렉션·도전과제 제외)'};
}
export function exportBackup(records){if(records.some(p=>!isPlay(p)))throw Error('백업할 기록을 확인해주세요.');return JSON.stringify({format:'score-backup',version:1,exportedAt:new Date().toISOString(),records:records.map(p=>({...createPlay(p,p.id),createdAt:p.createdAt}))},null,2);}
