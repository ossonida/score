import {bggPlayFingerprint} from './bgg-play-format.js?v=125';
import {isScoreGame} from './score-games.js?v=119';
const uncertain=new Set(['pending','unknown']);

export async function planBggExport(records,uploads={},limit=20,username=''){
 const ready=[];let already=0,missingGame=0,scoreGame=0,needsReview=0;
 for(const play of Array.isArray(records)?records:[]){
  if(isScoreGame(play?.game)){scoreGame++;continue;}
  if(!play?.game?.bggId){missingGame++;continue;}
  const prior=uploads?.[play.id];
  if(uncertain.has(prior?.status))needsReview++;
  if(prior?.bggPlayId&&prior.fingerprint===await bggPlayFingerprint(play,username)){already++;continue;}
  ready.push(play);
 }
 const batch=ready.slice(0,Math.max(1,Number(limit)||20));
 return {records:batch,remaining:ready.length-batch.length,already,missingGame,scoreGame,needsReview,total:Array.isArray(records)?records.length:0};
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
