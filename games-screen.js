import './records.js?v=332';
import {searchLocalGames,gameResolver,searchableGameGroups,normalizeGameQuery} from './game-catalog.js?v=309';
import {hasHangul,readGameAliases,rememberGameAlias,withAliasMatches} from './game-aliases.js?v=309';
import {scoreGame} from './score-games.js?v=168';
import {gameKey} from './records-core.js?v=309';
import {readGameLibrary,libraryGames,addLibraryGame,removeLibraryGame,gameCollectionView} from './game-library.js?v=309';
import {renderGameArtwork,gameImageUrl,coverCrop} from './game-artwork.js?v=312';
import {idToken} from './cloud-records.js?v=332';
import {bggSearchUrl} from './firebase-config.js?v=64';
import {enrichGames} from './bgg-details-client.js?v=312';
import {gameNames} from './bgg-metadata.js?v=309';
import {indexEntries} from './game-index.js?v=2';
import {GAME_SEARCH_CONTEXTS,bggWebSearchUrl,searchBggGames,searchErrorText} from './game-search.js?v=309';
const $=id=>document.getElementById(id),api=window.ScoreRecords;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let opened=null,timer,controller,serial=0,lastScope='',view='all',enriching=false;
const views={all:'gamesAll',played:'gamesPlayed',wantToPlay:'gamesWantToPlay',owned:'gamesOwned',wishlist:'gamesWishlist',preordered:'gamesPreordered'},viewLabels={wantToPlay:'하고 싶은 게임',owned:'보유 게임',wishlist:'위시 리스트 게임',preordered:'펀딩 게임'};
const bggState=()=>window.ScoreBggAccount?.state()||{collection:[],plays:[]},bggCollection=()=>bggState().collection||[];
const playText=(count,bgg)=>[count?'플레이 '+count+'회':'',bgg?'BGG 플레이 '+bgg+'회':''].filter(Boolean).join(' · ')||'아직 플레이 기록이 없습니다.';
// BGG 게임 정보를 받아(로그인하지 않아도) 표지와 한글 이름을 보충합니다(7일 안에 받은 게임은 건너뜀).
let enrichAgain=false;
async function enrichArtwork(context,games){if(!bggSearchUrl)return;if(enriching){enrichAgain=true;return;}enriching=true;enrichAgain=false;try{const user=context.key.startsWith('score.plays.v1.user.'),token=user?await idToken(context.key.slice('score.plays.v1.user.'.length)):'';if(!current(context))return;await enrichGames(games.map(row=>row.game),{endpoint:bggSearchUrl,token,onUpdate:()=>{if(current(context))render();}});}catch{}finally{enriching=false;if(enrichAgain&&current(context))render();}}
const searchRecords=context=>[...context.records,...readGameLibrary(context.key).map(game=>({game}))];
const current=c=>{const n=api.context();return c.key===n.key&&c.epoch===n.epoch;};
function rows(){const c=api.context();return libraryGames(c.records,readGameLibrary(c.key));}
function artwork(game){const wrap=el('span',undefined,'library-art'),placeholder=el('span','◇','library-art-fallback'),art=el('span');wrap.setAttribute('aria-hidden','true');wrap.append(placeholder,art);renderGameArtwork(art,game);const image=art.querySelector('img');if(image)image.alt='';return wrap;}
// 게임 탭이 보이지 않을 때는 그리지 않고, 바뀐 내용이 있을 때만 게임 탭으로 이동하며 다시 그린다.
let stale=true,renderToken=0,showRow=()=>null;
function render(){if(location.hash!=='#games'){stale=true;return;}stale=false;const context=api.context(),scope=context.key;if(scope!==lastScope){$('gamesMessage').textContent='';lastScope=scope;}const list=$('gamesList');$('addLibraryGame').disabled=context.ready===false;if(context.ready===false){list.replaceChildren();renderIndex([]);$('gamesCount').textContent='계정 확인 중…';$('gamesEmpty').hidden=true;return;}const all=gameCollectionView(context.records,readGameLibrary(context.key),bggCollection(),view,bggState().plays||[]),query=$('gameSearch').value.trim(),q=normalizeGameQuery(query),aliasIds=q?new Set(readGameAliases(scope).filter(entry=>entry.aliases.some(alias=>normalizeGameQuery(alias).includes(q))).map(entry=>entry.id)):null,games=(query?all.filter(row=>searchableGameGroups([row],query).length||normalizeGameQuery(gameNames(row.game).ko).includes(q)||aliasIds.has(row.game.bggId)):[...all]).map(row=>({...row,label:gameNames(row.game).ko}));games.sort((a,b)=>a.label.localeCompare(b.label,'ko'));list.replaceChildren();$('gamesCount').textContent=all.length+'개';$('gamesEmpty').hidden=games.length>0;
 $('gamesEmpty').textContent=all.length?'검색 결과가 없습니다.':view==='all'?'아직 추가한 게임이 없습니다. ＋로 게임을 추가하세요.':view==='played'?'아직 플레이한 게임이 없습니다. 기록을 저장하거나 게임을 추가하세요.':bggCollection().length?'BGG 컬렉션에 '+viewLabels[view]+'이 없습니다.':viewLabels[view]+'을 등록하거나 BGG 컬렉션을 설정에서 불러올 수 있어요.';
 const token=++renderToken;list.classList.toggle('game-shelf',view==='owned');$('gameIndex').classList.toggle('on-shelf',view==='owned');if(view==='owned'){if(!all.length){renderShelfDemo(list);return;}renderShelf(list,games);return;}let rendered=0;const append=limit=>{const end=Math.min(games.length,limit);for(let index=rendered;index<end;index++){const {game,count,bggPlays,thumbnail,label}=games[index],item=el('div',undefined,'library-item'),behind=el('span','삭제','library-delete');behind.setAttribute('aria-hidden','true');const row=el('button',undefined,'library-row'),info=el('span',undefined,'library-copy');row.type='button';row.setAttribute('aria-label',label+' 게임별 통계 보기');info.append(el('strong',label),el('small',playText(count,bggPlays)));row.append(artwork(thumbnail?{...game,thumbnail}:game),info);row.onclick=()=>api.openGameStats(game);rowData.set(row,games[index]);item.append(behind,row);list.append(item);}rendered=Math.max(rendered,end);},addRows=()=>{if(token!==renderToken)return;append(rendered+(rendered?60:30));if(rendered<games.length)setTimeout(addRows,0);};
 // 색인 이동은 아직 나눠 붙이지 않은 줄까지 바로 그린 뒤 그 줄을 돌려준다.
 showRow=index=>{if(token!==renderToken)return null;append(index+1);return list.children[index]||null;};addRows();renderIndex(indexEntries(games.map(row=>row.label)));
 void enrichArtwork(context,all);
}
// 책장 표지: 빈 여백 없이 상자 비율 그대로. 같은 정사각 틀 안에 들어가게 가로가 길면 폭에, 세로가 길면 높이에 맞추고 선반 위에 세운다.
function fitShelfCover(art,image){if(!image.naturalWidth||!image.naturalHeight)return;const crop=coverCrop(image.src),ratio=image.naturalWidth*(crop?crop[1]-crop[0]:1)/image.naturalHeight;art.style.aspectRatio=String(ratio);art.style.width=ratio>=1?'100%':'auto';art.style.height=ratio>=1?'auto':'100%';art.classList.add('is-ready');}
// 보유 탭 '내 컬렉션 책장': 첫 글자 묶음마다 책장 한 칸(표지를 한 줄 3개·넓은 화면 5개씩, 줄마다 선반). 글자는 그 칸 첫 선반 앞면에 새긴다(data-key).
// 보유 게임이 없을 때: 등록하면 이렇게 꽂힌다는 흐린 예시 책장(실제 표지 없이 상자 실루엣만, 누를 수 없음). 빈 문구는 책장 위로 옮긴다.
function renderShelfDemo(list){const note=el('p',$('gamesEmpty').textContent,'record-note shelf-demo-note');$('gamesEmpty').hidden=true;const section=el('section',undefined,'shelf-group shelf-demo');section.setAttribute('aria-hidden','true');
 for(const ratios of [[.72,1,1.3],[1,.8,1.15]]){const row=el('div',undefined,'shelf-row');row.style.setProperty('--shelf-columns','3');for(const ratio of ratios){const book=el('span',undefined,'shelf-book'),box=el('span',undefined,'shelf-demo-box');box.style.aspectRatio=String(ratio);box.style[ratio>=1?'width':'height']='100%';book.append(box);row.append(book);}section.append(row);}
 list.append(note,section);renderIndex([]);}
function renderShelf(list,games){const entries=indexEntries(games.map(row=>row.label)),columns=list.clientWidth>=640?5:3;
 const groups=(entries.length?entries:[{key:'',index:0}]).map((entry,index,all)=>({key:entry.key,index:entry.index,items:games.slice(entry.index,all[index+1]?.index??games.length)})).filter(group=>group.items.length);
 for(const group of groups){const section=el('section',undefined,'shelf-group');section.dataset.shelfIndex=String(group.index);
  for(let start=0;start<group.items.length;start+=columns){const row=el('div',undefined,'shelf-row');row.style.setProperty('--shelf-columns',String(columns));if(!start&&group.key)row.dataset.key=group.key;
   for(const data of group.items.slice(start,start+columns)){const {game,thumbnail,label}=data,book=el('button',undefined,'shelf-book');book.type='button';book.title=label;book.setAttribute('aria-label',label+' 게임별 통계 보기');
    const fallback=el('span',label,'shelf-cover-name'),art=el('span',undefined,'shelf-cover-art');renderGameArtwork(art,thumbnail?{...game,thumbnail}:game);const image=art.querySelector('img');if(image){image.alt='';image.onload=()=>fitShelfCover(art,image);}
    book.append(fallback,art);book.onclick=()=>api.openGameStats(game);row.append(book);}
   section.append(row);}
  list.append(section);}
 // 색인은 그 글자 칸으로 이동한다.
 showRow=index=>list.querySelector(`.shelf-group[data-shelf-index="${index}"]`);renderIndex(entries);void enrichArtwork(api.context(),games);}
// 우측 초성·알파벳 색인: 누르거나 끌면 가리키는 글자의 첫 게임으로 즉시 스크롤한다.
let indexItems=[],indexKeyNow='';
// 게임 삭제: 줄을 왼쪽으로 밀거나 길게 누르면 확인 후 내 목록에서 지운다. 기록·BGG 정보가 있는 게임은 이유만 알린다.
const rowData=new WeakMap();let press=null,suppressClick=0;
function askDelete(data){if(!data)return;const context=api.context(),{key,label}=data;
 if(data.count>0){$('gamesMessage').textContent=label+' · 경기 기록이 있는 게임은 삭제할 수 없습니다.';return;}
 if(data.bggPlays||data.owned||data.wishlist||data.wantToPlay||data.preordered){$('gamesMessage').textContent=label+' · BGG에서 가져온 게임은 BGG 컬렉션에서 정리해주세요.';return;}
 window.ScoreCounter.confirm('게임 삭제',label+'을(를) 내 게임 목록에서 삭제할까요?',()=>{if(!current(context))return;let removed=false;try{removed=removeLibraryGame(context.key,key,context.records);}catch{}render();$('gamesMessage').textContent=removed?label+' · 삭제했습니다.':label+' · 삭제하지 못했습니다.';});}
function resetPress(){if(!press)return;clearTimeout(press.timer);press.item.classList.remove('library-swiping');press.row.style.transform='';press=null;}
$('gamesList').addEventListener('pointerdown',e=>{const row=e.target.closest?.('.library-row');if(!row||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;resetPress();press={row,item:row.parentElement,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};press.timer=setTimeout(()=>{const data=rowData.get(row);resetPress();suppressClick=Date.now()+600;askDelete(data);},600);});
$('gamesList').addEventListener('pointermove',e=>{if(!press||e.pointerId!==press.id)return;const dx=e.clientX-press.x,dy=e.clientY-press.y;if(Math.hypot(dx,dy)>8)clearTimeout(press.timer);if(!press.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.3){resetPress();return;}if(dx>-8||Math.abs(dx)<Math.abs(dy))return;press.horizontal=true;press.item.classList.add('library-swiping');press.row.setPointerCapture?.(e.pointerId);}if(e.cancelable)e.preventDefault();press.dx=Math.max(-120,Math.min(0,dx));press.row.style.transform=`translateX(${press.dx}px)`;});
const endPress=(e,cancelled)=>{if(!press||e.pointerId!==press.id)return;const {row,horizontal,dx}=press;resetPress();if(!horizontal)return;suppressClick=Date.now()+400;if(!cancelled&&dx<=-64)askDelete(rowData.get(row));};
$('gamesList').addEventListener('pointerup',e=>endPress(e,false));$('gamesList').addEventListener('pointercancel',e=>endPress(e,true));
$('gamesList').addEventListener('click',e=>{if(Date.now()<suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
$('gamesList').addEventListener('contextmenu',e=>{if(e.target.closest?.('.library-row'))e.preventDefault();});
$('gamesList').addEventListener('keydown',e=>{const row=e.target.closest?.('.library-row');if(row&&e.key==='Delete'){e.preventDefault();askDelete(rowData.get(row));}});
function renderIndex(entries){const nav=$('gameIndex');indexItems=entries.length>1?entries:[];nav.hidden=!indexItems.length;$('gamesList').classList.toggle('has-index',!nav.hidden);nav.replaceChildren(...indexItems.map(item=>{const button=el('button',item.key);button.type='button';button.setAttribute('aria-label',item.key+'(으)로 시작하는 게임으로 이동');button.onclick=()=>jumpTo(item);return button;}));}
function jumpTo(item){const row=showRow(item.index);if(!row)return;row.scrollIntoView({block:'start'});}
function indexAt(y){const nav=$('gameIndex'),box=nav.getBoundingClientRect();return indexItems[Math.max(0,Math.min(indexItems.length-1,Math.floor((y-box.top)/box.height*indexItems.length)))];}
function dragIndex(e){const item=indexItems.length&&indexAt(e.clientY);if(!item)return;const bubble=$('gameIndexBubble');bubble.textContent=item.key;bubble.hidden=false;if(item.key===indexKeyNow)return;indexKeyNow=item.key;jumpTo(item);}
function endIndexDrag(){indexKeyNow='';$('gameIndexBubble').hidden=true;}
$('gameIndex').addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();$('gameIndex').setPointerCapture?.(e.pointerId);dragIndex(e);});
$('gameIndex').addEventListener('pointermove',e=>{if($('gameIndex').hasPointerCapture?.(e.pointerId))dragIndex(e);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('gameIndex').addEventListener(name,endIndexDrag);
function selectView(next,focus){view=next;for(const [key,id] of Object.entries(views)){const tab=$(id),on=key===next;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;if(on&&focus)tab.focus();}render();}
for(const [key,id] of Object.entries(views))$(id).onclick=()=>selectView(key);
$('gameViewTabs').addEventListener('keydown',e=>{const keys=Object.keys(views),step={ArrowRight:1,ArrowLeft:-1}[e.key];if(!step)return;e.preventDefault();selectView(keys[(keys.indexOf(view)+step+keys.length)%keys.length],true);});
$('gameSearch').addEventListener('input',()=>render());
function cancel(){clearTimeout(timer);controller?.abort();serial++;$('librarySearchButton').disabled=false;$('librarySearchButton').setAttribute('aria-busy','false');}
function close(){cancel();$('addGameDialog').close();opened=null;}
function showResults(games,context){const box=$('librarySearchResults'),existing=new Set(gameCollectionView(context.records,readGameLibrary(context.key),bggCollection(),'all',bggState().plays||[]).map(r=>r.key)),resolve=gameResolver(context.records);box.replaceChildren();
 for(const g of games){if(!g||typeof g.name!=='string'||g.name.length>120||(g.id&&!/^[1-9][0-9]{0,9}$/.test(String(g.id))))continue;const game={name:g.name,bggId:String(g.id||'')},added=existing.has(gameKey(resolve(game))),row=el('div',undefined,'game-result-row'),button=el('button',undefined,'game-result-choice'),cover=el('span','♟','game-result-cover'),info=el('span',undefined,'game-result-info');button.type='button';button.disabled=added;button.setAttribute('aria-pressed',String(isPicked(game)));if(gameImageUrl({...g,...game}))renderGameArtwork(cover,{...g,...game});const names=gameNames(game);info.append(el('strong',names.ko),el('small',[added?'추가됨':'',names.en,g.year,g.id?'#'+g.id:'',g.scoreGame?'Score 자체 게임':g.source||'BGG'].filter(Boolean).join(' · ')));button.append(cover,info);
 button.onclick=()=>pick(g.scoreGame?{...game,scoreGame:true}:game,button);row.append(button);
 if(g.id){const link=el('a','ⓘ','game-result-detail');link.href='https://boardgamegeek.com/boardgame/'+g.id;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',names.ko+' BGG 상세 보기');row.append(link);}
 box.append(row);}
}
let picked=null;
function isPicked(game){return !!picked&&picked.name===game.name&&picked.bggId===game.bggId;}
// 한글 검색으로 못 찾은 게임을 다른 이름으로 찾아 고르면 그 검색어를 고쳐서 별칭으로 기억할 수 있게 한다(등록할 때 기억).
let aliasMiss='';
function offerAlias(game){const show=!!aliasMiss&&!!game?.bggId;$('libraryAliasField').hidden=!show;if(show){$('libraryRememberAlias').checked=true;$('libraryAliasName').value=aliasMiss;}}
// 자체 게임을 고르면 저장 창처럼 BGG 웹 검색을 숨긴다.
function pick(game,button){picked=game;offerAlias(game);$('libraryBggWebsite').hidden=!!game.scoreGame;$('librarySearch').value=game.name;$('libraryBggId').value=game.bggId;$('libraryAddError').textContent='';for(const item of $('librarySearchResults').querySelectorAll('.game-result-choice'))item.setAttribute('aria-pressed',String(item===button));}
// 등록: 고른 게임 또는 직접 입력한 이름(BGG 게임 ID는 선택)을 내 게임 목록에 추가한다.
function register(){const context=opened;if(!context||!current(context))return close();const name=$('librarySearch').value.trim(),bggId=$('libraryBggId').value.trim();if(!name){$('libraryAddError').textContent='게임명을 입력해주세요.';$('librarySearch').focus();return;}if(bggId&&!/^[1-9][0-9]{0,9}$/.test(bggId)){$('libraryAddError').textContent='BGG 게임 ID는 숫자로 입력해주세요.';$('libraryBggAdvanced').open=true;$('libraryBggId').focus();return;}if(picked&&bggId&&picked.bggId===bggId&&!$('libraryAliasField').hidden&&$('libraryRememberAlias').checked)try{rememberGameAlias(context.key,picked,$('libraryAliasName').value);}catch{}
 const game={name,bggId};try{const added=addLibraryGame(context.key,game,context.records);render();close();$('gamesMessage').textContent=added?gameNames(game).ko+' · 추가했습니다.':'이미 추가된 게임입니다.';}catch(error){$('libraryAddError').textContent=error.message;}}
async function search(query=$('librarySearch').value){cancel();const context=opened;if(!context||!current(context))return close();const q=query.trim(),local=withAliasMatches(searchLocalGames(q,searchRecords(context)),q,readGameAliases(context.key));showResults(local,context);if(!q){$('librarySearchStatus').textContent='한글 또는 영문 게임명을 입력해주세요.';return;}
 if(scoreGame(q)){$('librarySearchStatus').textContent=local.length+'개 결과 · Score 자체 게임은 BGG와 연동하지 않습니다.';return;}
 if(!bggSearchUrl){if(!local.length&&hasHangul(q))aliasMiss=q;$('librarySearchStatus').textContent=local.length?local.length+'개 결과':'결과가 없습니다. 영문명으로 검색해주세요.';return;}
 if(q.length<2){$('librarySearchStatus').textContent='두 글자 이상 입력해주세요.';return;}
 const own=++serial;controller=new AbortController();const button=$('librarySearchButton');button.disabled=true;button.setAttribute('aria-busy','true');$('librarySearchStatus').textContent='BGG 검색 중…';
 try{const guest=context.key.endsWith('.guest'),token=guest?'':await idToken(context.key.slice('score.plays.v1.user.'.length));if(own!==serial||!current(context))return;const games=await searchBggGames(bggSearchUrl,q,{local,token,aliases:readGameAliases(context.key),signal:controller.signal});if(own!==serial||!current(context))return;showResults(games,context);if(!games.length&&hasHangul(q))aliasMiss=q;$('librarySearchStatus').textContent=games.length?games.length+'개 결과':'결과가 없습니다. 영문명으로도 검색해보세요.';}
 catch(error){if(own===serial&&current(context)&&error.name!=='AbortError')$('librarySearchStatus').textContent=searchErrorText(error);}
 finally{if(own===serial){button.disabled=false;button.setAttribute('aria-busy','false');}}
}
$('addLibraryGame').onclick=()=>{if(api.context().ready===false)return;cancel();opened=api.context();aliasMiss='';$('addGameTitle').textContent=GAME_SEARCH_CONTEXTS.library.title;$('libraryBggWebsite').hidden=false;$('libraryAliasField').hidden=true;picked=null;$('librarySearch').value='';$('libraryBggId').value='';$('libraryBggAdvanced').open=false;$('libraryAddError').textContent='';$('librarySearchResults').replaceChildren();$('librarySearchStatus').textContent='한글 또는 영문 게임명을 입력해주세요.';$('addGameDialog').showModal();$('librarySearch').focus();};
$('closeAddGame').onclick=close;$('libraryBack').onclick=close;$('cancelAddGame').onclick=close;$('registerLibraryGame').onclick=register;
$('libraryBggWebsite').onclick=()=>{const query=$('librarySearch').value.trim();if(query)window.open(bggWebSearchUrl(query),'_blank','noopener,noreferrer');};
$('libraryBggId').addEventListener('input',()=>{$('libraryAddError').textContent='';});$('addGameDialog').addEventListener('close',()=>{cancel();opened=null;});
$('librarySearchForm').onsubmit=e=>{e.preventDefault();void search();};
$('librarySearch').addEventListener('input',()=>{cancel();if(picked&&picked.name!==$('librarySearch').value.trim()){picked=null;$('libraryBggId').value='';$('libraryBggWebsite').hidden=false;$('libraryAliasField').hidden=true;}$('libraryAddError').textContent='';if(!opened)return;const query=$('librarySearch').value;showResults(withAliasMatches(searchLocalGames(query,searchRecords(opened)),query,readGameAliases(opened.key)),opened);timer=setTimeout(()=>search(query),600);});
window.addEventListener('score-records:changed',()=>{if(opened&&!current(opened))close();render();});
window.addEventListener('score-bgg:changed',()=>render());
window.addEventListener('hashchange',()=>{if(location.hash!=='#games'&&opened)close();if(location.hash==='#games'&&stale)render();});
window.addEventListener('storage',e=>{if(e.key?.startsWith('score.games.v1.'))render();});render();window.ScoreStartup?.ready('games');
