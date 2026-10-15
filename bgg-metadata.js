import {gameTypes} from './game-types.js?v=39';
import {starterGames,normalizeGameQuery} from './game-catalog.js?v=39';
const KEY='score.bgg.metadata.v1';
export const domainLabels={'Strategy Games':'전략','Family Games':'가족','Party Games':'파티','Abstract Games':'추상','Thematic Games':'테마','Wargames':'워게임',"Children’s Games":'어린이',"Children\'s Games":'어린이','Customizable Games':'커스터마이징'};
export function bggId(game){const id=game?.bggId||game?.id||starterGames.find(g=>[g.name,...g.aliases].some(n=>normalizeGameQuery(n)===normalizeGameQuery(game?.name||'')))?.id;return /^[1-9][0-9]{0,9}$/.test(String(id||''))?String(id):'';}
function saved(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
export function metadata(game){const id=bggId(game),cached=saved()[id],bundled=gameTypes[id],data=cached&&(!bundled||Number(cached.checkedAt)>Number(bundled.checkedAt||0))?cached:bundled||cached;if(!data)return null;return {...data,domains:Array.isArray(data.domains)?[...new Set(data.domains.filter(x=>Object.hasOwn(domainLabels,x)))]:[],cooperative:data.cooperative===true};}
export function rememberMetadata(games){const data=saved();for(const game of games){const id=bggId(game);if(!id||!Array.isArray(game.domains))continue;data[id]={domains:[...new Set(game.domains.filter(x=>Object.hasOwn(domainLabels,x)))],cooperative:game.cooperative===true,checkedAt:Date.now()};}localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(Object.entries(data).slice(-1500))));}
export function metadataFresh(game){const value=saved()[bggId(game)];return value&&Date.now()-value.checkedAt<7*86400000;}
