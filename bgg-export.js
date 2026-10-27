import {bggPlayFingerprint} from './bgg-play-format.js?v=152';
import {isScoreGame} from './score-games.js?v=167';
const uncertain=new Set(['pending','unknown']);

// onBgg: BG Stats가 BGG에 이미 올린 경기(기록 ID → BGG 원본 번호, bgstats-link). 새로 올리지 않고 그 원본을 업데이트한다(adopt).
export async function planBggExport(records,uploads={},limit=20,username='',onBgg=new Set()){
 const ready=[],adopt=new Map();let already=0,missingGame=0,scoreGame=0,needsReview=0,fromBgStats=0;
 for(const play of Array.isArray(records)?records:[]){
  if(isScoreGame(play?.game)){scoreGame++;continue;}
  if(onBgg.has(play?.id)&&!uploads?.[play.id]?.bggPlayId){const original=onBgg.get?.(play.id);if(!original){fromBgStats++;continue;}adopt.set(play.id,String(original));ready.push(play);continue;}
  if(!play?.game?.bggId){missingGame++;continue;}
  const prior=uploads?.[play.id];
  if(uncertain.has(prior?.status))needsReview++;
  if(prior?.bggPlayId&&prior.fingerprint===await bggPlayFingerprint(play,username)){already++;continue;}
  ready.push(play);
 }
 const batch=ready.slice(0,Math.max(1,Number(limit)||20));
 return {records:batch,remaining:ready.length-batch.length,already,missingGame,scoreGame,needsReview,fromBgStats,adopt,adopting:batch.filter(p=>adopt.has(p.id)).length,total:Array.isArray(records)?records.length:0};
}

const stopCodes=new Set(['BGG_LOGIN_REQUIRED','BGG_ACCOUNT_CHANGED','BGG_POST_UNCERTAIN','BGG_LOGIN_RATE_LIMIT','BGG_LINK_UNAVAILABLE']);

export async function sendBggExport(records,send,onProgress=()=>{}){
 let sent=0,unchanged=0,failed=0,lastError='';
 for(const [index,play]of records.entries()){
  onProgress(index+1,records.length);
  try{const result=await send(play);if(result?.unchanged)unchanged++;else if(result)sent++;}
  catch(error){failed++;lastError=error.message;if(stopCodes.has(error.code))break;}
 }
 return {sent,unchanged,failed,lastError};
}
