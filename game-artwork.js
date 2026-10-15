import {bggId} from './bgg-metadata.js?v=45';
import {gameImages} from './game-images.js?v=45';
export function safeGameImage(value){try{if(typeof value!=='string'||value.length>2048)return '';const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cf.geekdo-images.com'&&!u.username&&!u.password&&!u.port?u.href:'';}catch{return '';}}
const idKey=value=>/^[1-9][0-9]{0,9}$/.test(String(value||''))?String(value):'';
function savedImages(){try{const value=JSON.parse(localStorage.getItem('score.bgg.covers.v1')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
export function rememberGameImages(images){const entries=Object.entries(images||{}).filter(([id,url])=>idKey(id)&&safeGameImage(url));if(!entries.length)return;const data={...savedImages(),...Object.fromEntries(entries)};localStorage.setItem('score.bgg.covers.v1',JSON.stringify(Object.fromEntries(Object.entries(data).filter(([id,url])=>idKey(id)&&safeGameImage(url)).slice(-1000))));}
function imageCandidates(game){const id=bggId(game);if(!id)return [];return [...new Set([game?.thumbnail,game?.image,gameImages[id],savedImages()[id]].map(safeGameImage).filter(Boolean))];}
export function gameImageUrl(game){return imageCandidates(game)[0]||'';}
export function renderGameArtwork(target,game){const urls=imageCandidates(game);target.replaceChildren();target.hidden=!urls.length;if(!urls.length)return;const img=document.createElement('img');let next=1;img.src=urls[0];img.alt=(game.name||'게임')+' 표지';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>{if(next<urls.length)img.src=urls[next++];else target.hidden=true;};target.append(img);}
