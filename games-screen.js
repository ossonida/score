import './records.js?v=160';
import {searchLocalGames,bggSearchQuery,resolveGame,searchableGameGroups,normalizeGameQuery} from './game-catalog.js?v=95';
import {gameKey} from './records-core.js?v=152';
import {readGameLibrary,libraryGames,addLibraryGame,gameCollectionView} from './game-library.js?v=99';
import {renderGameArtwork} from './game-artwork.js?v=95';
import {idToken} from './cloud-records.js?v=159';
import {bggSearchUrl} from './firebase-config.js?v=64';
import {enrichGames} from './bgg-details-client.js?v=65';
import {gameNames} from './bgg-metadata.js?v=161';
const $=id=>document.getElementById(id),api=window.ScoreRecords;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let opened=null,timer,controller,serial=0,lastScope='',view='all',enriching=false;
const views={all:'gamesAll',played:'gamesPlayed',wantToPlay:'gamesWantToPlay',owned:'gamesOwned',wishlist:'gamesWishlist'},viewLabels={wantToPlay:'하고 싶은 게임',owned:'보유 게임',wishlist:'위시 리스트 게임'};
const bggState=()=>window.ScoreBggAccount?.state()||{collection:[],plays:[]},bggCollection=()=>bggState().collection||[];
const playText=(count,bgg)=>[count?'플레이 '+count+'회':'',bgg?'BGG 플레이 '+bgg+'회':''].filter(Boolean).join(' · ')||'아직 플레이 기록이 없습니다.';
// 로그인 상태에서 BGG 게임 정보를 받아 표지와 한글 이름을 보충합니다(7일 안에 받은 게임은 건너뜀).
async function enrichArtwork(context,games){if(enriching||!bggSearchUrl||!context.key.startsWith('score.plays.v1.user.'))return;enriching=true;try{const token=await idToken(context.key.slice('score.plays.v1.user.'.length));if(!current(context))return;await enrichGames(games.map(row=>row.game),{endpoint:bggSearchUrl,token,onUpdate:()=>{if(current(context))render();}});}catch{}finally{enriching=false;}}
const searchRecords=context=>[...context.records,...readGameLibrary(context.key).map(game=>({game}))];
const current=c=>{const n=api.context();return c.key===n.key&&c.epoch===n.epoch;};
function rows(){const c=api.context();return libraryGames(c.records,readGameLibrary(c.key));}
function artwork(game){const wrap=el('span',undefined,'library-art'),placeholder=el('span','◇','library-art-fallback'),art=el('span');wrap.setAttribute('aria-hidden','true');wrap.append(placeholder,art);renderGameArtwork(art,game);const image=art.querySelector('img');if(image)image.alt='';return wrap;}
function render(){const scope=api.context().key;if(scope!==lastScope){$('gamesMessage').textContent='';lastScope=scope;}const list=$('gamesList'),context=api.context();$('addLibraryGame').disabled=context.ready===false;if(context.ready===false){list.replaceChildren();$('gamesCount').textContent='계정 확인 중…';$('gamesEmpty').hidden=true;return;}const all=gameCollectionView(context.records,readGameLibrary(context.key),bggCollection(),view,bggState().plays||[]),query=$('gameSearch').value.trim(),q=normalizeGameQuery(query),games=(query?all.filter(row=>searchableGameGroups([row],query).length||normalizeGameQuery(gameNames(row.game).ko).includes(q)):[...all]).map(row=>({...row,label:gameNames(row.game).ko}));if(view!=='played')games.sort((a,b)=>a.label.localeCompare(b.label,'ko'));list.replaceChildren();$('gamesCount').textContent=all.length+'개';$('gamesEmpty').hidden=games.length>0;
 $('gamesEmpty').textContent=all.length?'검색 결과가 없습니다.':view==='all'?'아직 추가한 게임이 없습니다. ＋로 게임을 추가하세요.':view==='played'?'아직 플레이한 게임이 없습니다. 기록을 저장하거나 BGG 정보를 가져오면 표시됩니다.':bggCollection().length?'BGG 컬렉션에 '+viewLabels[view]+'이 없습니다.':'설정에서 BGG 컬렉션을 가져오면 '+viewLabels[view]+'이 표시됩니다.';
 for(const {game,count,bggPlays,thumbnail,label}of games){const row=el('button',undefined,'library-row'),info=el('span',undefined,'library-copy');row.type='button';row.setAttribute('aria-label',label+' 게임별 통계 보기');info.append(el('strong',label),el('small',playText(count,bggPlays)));row.append(artwork(thumbnail?{...game,thumbnail}:game),info);row.onclick=()=>api.openGameStats(game);list.append(row);}
 void enrichArtwork(context,all);
}
function selectView(next,focus){view=next;for(const [key,id] of Object.entries(views)){const tab=$(id),on=key===next;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;if(on&&focus)tab.focus();}render();}
for(const [key,id] of Object.entries(views))$(id).onclick=()=>selectView(key);
$('gameViewTabs').addEventListener('keydown',e=>{const keys=Object.keys(views),step={ArrowRight:1,ArrowLeft:-1}[e.key];if(!step)return;e.preventDefault();selectView(keys[(keys.indexOf(view)+step+keys.length)%keys.length],true);});
$('gameSearch').addEventListener('input',()=>render());
function cancel(){clearTimeout(timer);controller?.abort();serial++;$('librarySearchButton').disabled=false;$('librarySearchButton').setAttribute('aria-busy','false');}
function close(){cancel();$('addGameDialog').close();opened=null;}
function showResults(games,context){const box=$('librarySearchResults'),existing=new Set(rows().map(r=>r.key));box.replaceChildren();
 for(const g of games){if(!g||typeof g.name!=='string'||g.name.length>120||(g.id&&!/^[1-9][0-9]{0,9}$/.test(String(g.id))))continue;const game={name:g.name,bggId:String(g.id||'')},added=existing.has(gameKey(resolveGame(game,context.records))),button=el('button',undefined,'library-choice'),info=el('span',undefined,'library-copy');button.type='button';button.disabled=added;info.append(el('strong',game.name),el('small',added?'추가됨':[g.year,g.scoreGame?'Score 자체 게임':g.id?'BGG #'+g.id:'저장 게임'].filter(Boolean).join(' · ')));button.append(artwork(game),info,el('span',added?'✓':'＋','library-choice-mark'));
 button.onclick=()=>{if(!current(context)){close();return;}try{const added=addLibraryGame(context.key,game,context.records);render();close();$('gamesMessage').textContent=added?game.name+' · 추가했습니다.':'이미 추가된 게임입니다.';}catch(error){$('librarySearchStatus').textContent=error.message;}};box.append(button);}
}
async function search(){cancel();const context=opened;if(!context||!current(context))return close();const q=$('librarySearch').value.trim(),local=searchLocalGames(q,searchRecords(context));showResults(local,context);if(!q){$('librarySearchStatus').textContent='한글 또는 영문 게임명을 입력해주세요.';return;}
 if(local.some(game=>game.scoreGame)){$('librarySearchStatus').textContent=local.length+'개 결과 · Score 자체 게임은 BGG와 연동하지 않습니다.';return;}
 if(!bggSearchUrl||context.key.endsWith('.guest')){$('librarySearchStatus').textContent=local.length?local.length+'개 결과': '결과가 없습니다. 영문명으로 검색하거나 Google 로그인 후 BGG 전체 검색을 이용해주세요.';return;}
 if(q.length<2){$('librarySearchStatus').textContent='두 글자 이상 입력해주세요.';return;}
 const own=++serial;controller=new AbortController();const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]),button=$('librarySearchButton');button.disabled=true;button.setAttribute('aria-busy','true');$('librarySearchStatus').textContent='BGG 검색 중…';
 try{const uid=context.key.slice('score.plays.v1.user.'.length),token=await idToken(uid);if(own!==serial||!current(context))return;const url=new URL(bggSearchUrl);url.searchParams.set('query',bggSearchQuery(q));const response=await fetch(url,{headers:{Authorization:'Bearer '+token},signal});if(response.status===202||!response.ok){const messages={202:'BGG가 결과를 준비 중입니다. 잠시 후 다시 검색해주세요.',401:'다시 로그인한 뒤 검색해주세요.',429:'검색 요청이 많습니다. 1분 뒤 다시 검색해주세요.',502:'BGG에서 결과를 받지 못했습니다. 잠시 후 다시 검색해주세요.',503:'BGG 검색 서버를 확인해야 합니다.'};throw Error(messages[response.status]||'검색 서버에 연결하지 못했습니다.');}const data=await response.json();if(own!==serial||!current(context))return;const merged=new Map(local.map(g=>[g.id?'bgg:'+g.id:'name:'+g.name,g]));for(const game of data.games||[])if(game&&typeof game.name==='string'&&/^[1-9][0-9]{0,9}$/.test(String(game.id)))merged.set('bgg:'+game.id,game);showResults([...merged.values()],context);$('librarySearchStatus').textContent=merged.size?merged.size+'개 결과':'결과가 없습니다. 영문명으로도 검색해보세요.';}
 catch(error){if(own===serial&&current(context)&&error.name!=='AbortError')$('librarySearchStatus').textContent=(error.name==='TimeoutError'?'검색 응답이 늦습니다. 다시 검색해주세요.':error.message)+' 기존 목록에서 선택할 수 있습니다.';}
 finally{if(own===serial){button.disabled=false;button.setAttribute('aria-busy','false');}}
}
$('addLibraryGame').onclick=()=>{if(api.context().ready===false)return;cancel();opened=api.context();$('librarySearch').value='';$('librarySearchResults').replaceChildren();$('librarySearchStatus').textContent='한글 또는 영문 게임명을 입력해주세요.';$('addGameDialog').showModal();$('librarySearch').focus();};
$('closeAddGame').onclick=close;$('addGameDialog').addEventListener('close',()=>{cancel();opened=null;});
$('librarySearchForm').onsubmit=e=>{e.preventDefault();void search();};
$('librarySearch').addEventListener('input',()=>{cancel();if(!opened)return;showResults(searchLocalGames($('librarySearch').value,searchRecords(opened)),opened);timer=setTimeout(search,600);});
window.addEventListener('score-records:changed',()=>{if(opened&&!current(opened))close();render();});
window.addEventListener('score-bgg:changed',()=>render());
window.addEventListener('hashchange',()=>{if(location.hash!=='#games'&&opened)close();if(location.hash==='#games')render();});
window.addEventListener('storage',e=>{if(e.key?.startsWith('score.games.v1.'))render();});render();window.ScoreStartup?.ready('games');
