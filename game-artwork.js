import {bggId} from './bgg-metadata.js?v=309';
import {gameImages} from './game-images.js?v=64';
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';
import {scoreGame} from './score-games.js?v=168';
export function safeGameImage(value){try{if(typeof value!=='string'||value.length>2048)return '';const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cf.geekdo-images.com'&&!u.username&&!u.password&&!u.port?u.href:'';}catch{return '';}}
const idKey=value=>/^[1-9][0-9]{0,9}$/.test(String(value||''))?String(value):'';
function savedImages(){return readStoredJson('score.bgg.covers.v1',{},value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{});}
export function rememberGameImages(images){const entries=Object.entries(images||{}).filter(([id,url])=>idKey(id)&&safeGameImage(url));if(!entries.length)return;const data={...savedImages(),...Object.fromEntries(entries)};writeStoredJson('score.bgg.covers.v1',Object.fromEntries(Object.entries(data).filter(([id,url])=>idKey(id)&&safeGameImage(url)).slice(-1000)));}
function scoreGameImage(game){return scoreGame(game)?.image||'';}
function imageCandidates(game){const own=scoreGameImage(game);if(own)return [own];const id=bggId(game);if(!id)return [];return [...new Set([COVER_OVERRIDES[id],game?.thumbnail,game?.image,gameImages[id],savedImages()[id]].map(safeGameImage).filter(Boolean))];}
export function gameImageUrl(game){return imageCandidates(game)[0]||'';}
// BGG 대표 이미지가 상자 앞·뒷면을 나란히 찍은 사진인 게임: 앞면 가로 구간(0~1)만 표지로 쓴다. 키는 BGG 이미지 파일 번호(pic…)라 썸네일·원본·공유 프록시 주소 모두에 맞는다.
const COVER_CROPS={pic5835749:[.03,.42,1],pic9319501:[.05,.85,.3]}; // 326054 차가운 그녀가 눈을 뜨기 전에(앞·뒷면) · 439215 마라케시 보석과 전문가(흰 배경 입체 상자 → 앞면만) // 326054 차가운 그녀가 눈을 뜨기 전에
// BGG 대표 이미지 대신 표지로 쓸 같은 게임 갤러리 이미지(BGG 주소만).
const COVER_OVERRIDES={'326054':'https://cf.geekdo-images.com/T9c6JZuHhieicJRwXiwaLA__medium/img/w1WK_2ohEPBdY-mPEDk53mRc-bc=/fit-in/500x500/filters:no_upscale():strip_icc()/pic5835750.png'}; // 차가운 그녀가 눈을 뜨기 전에: 일본판 앞면
export function coverCrop(url){const match=String(url||'').match(/pic\d+/);return match&&COVER_CROPS[match[0]]||null;}
function applyCrop(img,target){const crop=coverCrop(img.src);target.classList.toggle('cover-crop',!!crop);if(crop){const span=crop[1]-crop[0];img.style.width=`${100/span}%`;img.style.marginLeft=`${-crop[0]/span*100}%`;target.style.setProperty('--crop-y',String(crop[2]??0));}else{img.style.width='';img.style.marginLeft='';}}
export function renderGameArtwork(target,game){const urls=imageCandidates(game);target.replaceChildren();target.hidden=!urls.length;if(!urls.length)return;const img=document.createElement('img');let next=1;img.src=urls[0];img.alt=(game.name||'게임')+' 표지';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>{if(next<urls.length){img.src=urls[next++];applyCrop(img,target);}else target.hidden=true;};applyCrop(img,target);target.append(img);}
