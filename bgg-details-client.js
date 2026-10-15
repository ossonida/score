import {bggId,metadataFresh,rememberMetadata} from './bgg-metadata.js?v=43';
import {rememberGameImages,safeGameImage} from './game-artwork.js?v=43';
const attempts=new Map();
export async function enrichGames(games,{endpoint,token,fetcher=fetch,onUpdate=()=>{}}={}){
 if(!endpoint||!token)return;
 const ids=[...new Set(games.map(bggId).filter(Boolean))].filter(id=>!metadataFresh({id})&&Date.now()-(attempts.get(id)||0)>300000);
 for(let start=0;start<ids.length;start+=20){const batch=ids.slice(start,start+20);for(const id of batch)attempts.set(id,Date.now());
  try{const url=new URL(endpoint);url.searchParams.set('action','details');url.searchParams.set('ids',batch.join(','));const response=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!response.ok)break;const data=await response.json();if(!Array.isArray(data.games))break;const received=data.games.filter(g=>batch.includes(String(g.id)));rememberMetadata(received);rememberGameImages(Object.fromEntries(received.map(g=>[g.id,safeGameImage(g.thumbnail)||safeGameImage(g.image)])));onUpdate();}catch{break;}
 }
}
