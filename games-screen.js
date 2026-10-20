import './records.js?v=113';
import {searchLocalGames,bggSearchQuery,resolveGame} from './game-catalog.js?v=95';
import {gameKey} from './records-core.js?v=113';
import {readGameLibrary,libraryGames,addLibraryGame} from './game-library.js?v=95';
import {renderGameArtwork} from './game-artwork.js?v=95';
import {idToken} from './cloud-records.js?v=113';
import {bggSearchUrl} from './firebase-config.js?v=64';
const $=id=>document.getElementById(id),api=window.ScoreRecords;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let opened=null,timer,controller,serial=0,lastScope='';
const searchRecords=context=>[...context.records,...readGameLibrary(context.key).map(game=>({game}))];
const current=c=>{const n=api.context();return c.key===n.key&&c.epoch===n.epoch;};
function rows(){const c=api.context();return libraryGames(c.records,readGameLibrary(c.key));}
function artwork(game){const wrap=el('span',undefined,'library-art'),placeholder=el('span','◇','library-art-fallback'),art=el('span');wrap.setAttribute('aria-hidden','true');wrap.append(placeholder,art);renderGameArtwork(art,game);const image=art.querySelector('img');if(image)image.alt='';return wrap;}
function render(){const scope=api.context().key;if(scope!==lastScope){$('gamesMessage').textContent='';lastScope=scope;}const list=$('gamesList'),context=api.context();$('addLibraryGame').disabled=context.ready===false;if(context.ready===false){list.replaceChildren();$('gamesCount').textContent='계정 확인 중…';$('gamesEmpty').hidden=true;return;}const games=rows();list.replaceChildren();$('gamesCount').textContent=games.length+'개 게임';$('gamesEmpty').hidden=games.length>0;
 for(const {game,count}of games){const row=el('article',undefined,'library-row'),info=el('div',undefined,'library-copy');info.append(el('h2',game.name),el('p',count?'플레이 '+count+'회':'아직 플레이 기록이 없습니다.'));row.append(artwork(game),info);list.append(row);}
}
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
window.addEventListener('hashchange',()=>{if(location.hash!=='#games'&&opened)close();if(location.hash==='#games')render();});
window.addEventListener('storage',e=>{if(e.key?.startsWith('score.games.v1.'))render();});render();window.ScoreStartup?.ready('games');
