import {editRecordedPlayer,removeRecordedPlayer} from './record-edit.js?v=34';
import {enrichGames} from './bgg-details-client.js?v=34';
import {renderOverview} from './overview-dashboard.js?v=34';
import {latestPlayDate} from './stats-overview.js?v=34';
import {gameImageUrl,renderGameArtwork,rememberGameImages} from './game-artwork.js?v=34';
import {isAutomatic,savingPlayers,withSelf,fillSelfSelect,rememberIdentity} from './player-memory.js?v=34';
import {readIdentity,meIn,personalRecordIds,nameKey} from './personal-stats.js?v=34';
import {renderStatsDashboard} from './stats-dashboard.js?v=34';
import {mergeImported} from './data-transfer.js?v=34';
import {searchLocalGames} from './game-catalog.js?v=34';
import {createPlay,isPlay,gameKey,winnerIds,gameStats} from './records-core.js?v=34';
import {cloudConfigured,connectCloud,login,logout,loadCloud,saveCloud,deleteCloud,idToken} from './cloud-records.js?v=34';
import {bggSearchUrl} from './firebase-config.js?v=34';
const $=id=>document.getElementById(id), api=window.ScoreCounter;
let currentUser=null,records=[],pending=new Set(),mode='history',statsView='recent',accountEpoch=0,searchController=null,searchSerial=0,snapshot=[],snapshotScope='',syncing=false,searchTimer=null;
let recordRevision=0;
let recordLoginPending=false,recordDraftVersion=0;
const guestKey='score.plays.v1.guest';
function key(){return currentUser?`score.plays.v1.user.${currentUser.uid}`:guestKey;}
function read(keyName){try{const data=JSON.parse(localStorage.getItem(keyName)||'{}');return {records:Array.isArray(data.records)?data.records.filter(isPlay):[],pending:Array.isArray(data.pending)?data.pending:[]};}catch{return {records:[],pending:[]};}}
function persist(){localStorage.setItem(key(),JSON.stringify({records,pending:[...pending]}));recordRevision++;window.dispatchEvent?.(new Event('score-records:changed'));}
function loadLocal(){const data=read(key());records=data.records;pending=new Set(data.pending);window.dispatchEvent?.(new Event('score-records:changed'));}
function notify(text){$('recordMessage').textContent=text;if(location.hash==='#settings')$('accountStatus').textContent=text;if(location.hash==='#stats')$('statsStatus').textContent=text;}
function message(id,error){$(id).textContent=typeof error==='string'?error:(error?.message||'처리하지 못했습니다. 다시 시도해주세요.');}
function friendly(error){if(error?.code==='auth/popup-blocked')return '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 로그인해주세요.';if(error?.code==='auth/popup-closed-by-user')return '로그인이 취소됐습니다.';return error?.message||'연결하지 못했습니다. 기록은 이 브라우저에 보관됩니다.';}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function close(id){$(id).close();}
function show(id){$(id).showModal();}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function updateButtons(){ $('savePlay').hidden=!api.getPlayers().length;$('recordLoginHint').hidden=!!currentUser||!api.getPlayers().length; $('savePlay').disabled=false;$('accountName').textContent=currentUser?(currentUser.displayName||currentUser.email||'로그인됨'):'Google 로그인으로 다른 기기에서도 기록을 확인하세요.';$('accountLogin').hidden=!!currentUser;$('accountLogout').hidden=!currentUser;$('guestUpload').hidden=!currentUser||!read(guestKey).records.length;$('cloudSync').hidden=!currentUser;$('accountStorage').textContent=currentUser?(pending.size?`${pending.size}개 기록이 클라우드 저장 대기 중입니다.`:'이 계정의 기록을 클라우드에 저장합니다.'):'현재 기록은 이 브라우저에 저장됩니다.';}
function updateGameOptions(){const groups=gameStats(records);$('savedGames').replaceChildren(...groups.map(g=>{const o=node('option');o.value=g.game.name;return o;}));}
function draftKey(){return `score.playDraft.v1.${currentUser?.uid||'guest'}`;}
function readDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'{}');return d&&typeof d.name==='string'&&d.name.length<=120?d:{};}catch{return {};}}
function rememberGame(){try{localStorage.setItem(draftKey(),JSON.stringify({name:$('playGame').value.trim(),bggId:$('playBggId').value.trim(),rule:$('playRule').value}));}catch{}}
function showSelectedGame(name,bggId,image){if(image&&bggId)try{rememberGameImages({[bggId]:image});}catch{}const box=$('selectedGameInfo');box.replaceChildren();if(!name)return;const art=node('span',undefined,'selected-game-art');renderGameArtwork(art,{name,bggId});box.append(art,node('span',name));}
function chooseGame(game){$('searchBgg').disabled=false;$('playGame').value=game.name;$('playBggId').value=String(game.bggId||game.id||'');showSelectedGame(game.name,game.bggId||game.id,gameImageUrl(game));$('bggResults').replaceChildren();$('gameSearchStatus').textContent='게임을 선택했습니다. 참여자와 결과를 확인하세요.';rememberGame();}
function renderRecentGames(){const games=new Map();for(const play of [...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){const key=gameKey(play.game);if(!games.has(key))games.set(key,play.game);if(games.size===5)break;}$('recentGames').replaceChildren(...[...games.values()].map(game=>{const button=node('button',game.name,'recent-game');button.type='button';button.onclick=()=>{searchController?.abort();clearTimeout(searchTimer);searchSerial++;chooseGame(game);};return button;}));$('recentGamesSection').hidden=!games.size;}
function recentRecordParticipants(){const people=new Map();for(const play of [...records].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)))for(const person of play.players){const name=nameKey(person.name);if(!name||isAutomatic(person)||/^(?:익명(?:의)?플레이어|anonymous(?:player)?)(?:[0-9]+|\([0-9]+\))?$/.test(name.replace(/\s+/g,'')))continue;if(!people.has(name))people.set(name,person);}return [...people.values()].slice(0,12);}
function refreshSnapshotPeople(){const selected=$('playSelf').value;fillSelfSelect($('playSelf'),snapshot,key());if(snapshot.some(p=>p.id===selected))$('playSelf').value=selected;renderSnapshot();renderParticipantChoices();}
function addRecordPerson(person){if(snapshot.length>=100)throw Error('참여자는 최대 100명까지 추가할 수 있습니다.');const name=String(person.name||'').trim();if(!name||name.length>120)throw Error('이름을 1~120자로 입력해주세요.');if(snapshot.some(p=>nameKey(p.name)===nameKey(name)))throw Error('이미 추가한 이름입니다.');const colors=['#52c7ef','#ffcc00','#b44cdb','#45d9a0','#ff9461','#b19be6'];snapshot.push({id:crypto.randomUUID(),name,color:/^#[0-9a-f]{6}$/i.test(person.color||'')?person.color:colors[snapshot.length%colors.length],score:null});refreshSnapshotPeople();}
function renderParticipantChoices(){const box=$('recentParticipants');box.replaceChildren();const people=recentRecordParticipants();$('recordParticipantsHint').textContent=people.length?'최근 함께한 사람 · 눌러서 선택':'함께한 사람을 추가하세요. 혼자 했다면 내 이름을 입력하세요.';for(const person of people){const button=node('button',person.name,'recent-game participant-choice'),selected=snapshot.some(p=>nameKey(p.name)===nameKey(person.name));button.type='button';button.setAttribute('aria-pressed',String(selected));button.onclick=()=>{try{if(selected){snapshot=snapshot.filter(p=>nameKey(p.name)!==nameKey(person.name));refreshSnapshotPeople();}else addRecordPerson(person);$('playError').textContent='';}catch(e){message('playError',e);}};box.append(button);}}
function renderSnapshot(){$('recordAnonymousHint').hidden=!snapshot.some(isAutomatic);const noScores=$('playWithoutScores').checked,rule=$('playRule').value,wins=noScores?[]:winnerIds({rule,players:snapshot});$('playSnapshot').replaceChildren();const badges=new Map(),ranked=noScores?snapshot:[...snapshot].sort((a,b)=>!Number.isFinite(a.score)?1:!Number.isFinite(b.score)?-1:rule==='lowest'?a.score-b.score:b.score-a.score);for(const person of ranked){const row=node('div',undefined,'finish-player record-participant'),name=node('span',isAutomatic(person)?'익명의 플레이어 ('+person.name+')':person.name,'finish-name'),remove=node('button','×','record-participant-remove');remove.type='button';remove.setAttribute('aria-label',person.name+' 참여자 제외');remove.onclick=()=>{snapshot=snapshot.filter(p=>p.id!==person.id);refreshSnapshotPeople();};row.append(name);if(noScores)row.append(node('span','점수 없음','record-note'));else{const input=node('input');input.type='text';input.inputMode='decimal';input.value=Number.isFinite(person.score)?String(person.score):'';input.placeholder='점수';input.maxLength=24;input.setAttribute('aria-label',person.name+' 기록 점수');input.oninput=()=>{const raw=input.value.trim();person.score=raw===''?null:/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)?Number(raw):NaN;const current=winnerIds({rule,players:snapshot});for(const [id,badge]of badges)badge.textContent=current.includes(id)?'승리':'';};row.append(input);}const badge=node('span',wins.includes(person.id)?'승리':'','finish-winner');badges.set(person.id,badge);row.append(badge,remove);$('playSnapshot').append(row);}if(!snapshot.length)$('playSnapshot').append(node('p','참여자를 추가하면 여기에 표시됩니다.','record-note'));}
function updateRecordStorage(){$('recordStorageHint').textContent=currentUser?'현재 로그인한 계정에 기록을 저장합니다.':'로그인 없이 이 기기에 저장할 수 있습니다. 로그인하면 다른 기기에서도 기록을 확인할 수 있습니다.';$('recordLogin').hidden=!!currentUser;$('commitPlay').textContent=currentUser?'기록 저장':'이 기기에 저장';}
function openSave(){recordDraftVersion++;recordLoginPending=false;snapshot=api.getPlayers();snapshotScope=key();fillSelfSelect($('playSelf'),snapshot,key());$('playWithoutScores').checked=!snapshot.length;$('recordParticipantName').value='';const draft=readDraft();$('playGame').value=draft.name||'';$('playBggId').value=/^[1-9][0-9]{0,9}$/.test(draft.bggId||'')?draft.bggId:'';$('playDate').value=today();$('playRule').value=['highest','lowest','cooperative'].includes(draft.rule)?draft.rule:'highest';$('playError').textContent='';$('bggResults').replaceChildren();showSelectedGame(draft.name,draft.bggId);$('gameSearchStatus').textContent=bggSearchUrl?'게임명을 입력하거나 최근 게임을 선택하세요.':'한글·영문으로 기본 목록 검색 · 목록에 없으면 직접 입력할 수 있어요.';renderRecentGames();renderSnapshot();renderParticipantChoices();updateRecordStorage();updateGameOptions();show('savePlayDialog');}
$('playWithoutScores').onchange=renderSnapshot;
$('addRecordParticipant').onclick=()=>{try{addRecordPerson({name:$('recordParticipantName').value});$('recordParticipantName').value='';$('playError').textContent='';}catch(e){message('playError',e);}};
$('recordParticipantName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('addRecordParticipant').onclick();}});
$('recordLogin').onclick=async()=>{if($('savePlayForm').reportValidity?.()===false)return;if(!snapshot.length){message('playError','함께한 사람을 한 명 이상 추가해주세요.');return;}const button=$('recordLogin');button.disabled=true;recordLoginPending=true;try{if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 이 기기에 먼저 저장할 수 있습니다.');await login();}catch(error){recordLoginPending=false;message('playError',friendly(error));}finally{button.disabled=false;}};
$('savePlayDialog').addEventListener('close',()=>{recordLoginPending=false;});
$('playSelf').onchange=renderSnapshot;
$('playRule').addEventListener('change',()=>{renderSnapshot();rememberGame();});
function selectedGame(){const name=$('playGame').value.trim();const known=records.find(p=>p.game.name.normalize('NFKC').toLocaleLowerCase()===name.normalize('NFKC').toLocaleLowerCase());return {name,bggId:$('playBggId').value.trim()||known?.game.bggId||''};}
$('playGame').addEventListener('input',()=>{$('playBggId').value='';$('selectedGameInfo').textContent='';searchSerial++;searchController?.abort();clearTimeout(searchTimer);$('searchBgg').disabled=false;rememberGame();renderGameResults(searchLocalGames($('playGame').value,records));if(bggSearchUrl)searchTimer=setTimeout(searchGames,500);});
$('savePlayForm').onsubmit=async event=>{event.preventDefault();const button=$('commitPlay');button.disabled=true;try{
 if(snapshotScope!==key())throw Error('계정이 변경됐습니다. 저장 창을 다시 열어주세요.');
 if(!snapshot.length)throw Error('함께한 사람을 한 명 이상 추가해주세요.');const noScores=$('playWithoutScores').checked;const selfId=$('playSelf').value;const savedPlayers=snapshot.map(p=>{const next={...p};if(noScores){next.score=null;delete next.winner;delete next.rank;}return next;});const play=createPlay({game:selectedGame(),date:$('playDate').value,rule:$('playRule').value,players:savingPlayers(savedPlayers,selfId)});
 rememberGame();const before=records;const oldPending=new Set(pending);records=[play,...records];if(currentUser)pending.add(play.id);
 try{persist();}catch(e){records=before;pending=oldPending;throw Error('브라우저 저장 공간을 사용할 수 없습니다. 기록을 저장하지 못했어요.');}
 try{rememberIdentity(key(),snapshot.find(p=>p.id===selfId));if(api.getPlayers().some(p=>p.id===selfId))api.setSelf?.(selfId,key());}catch{}
 close('savePlayDialog');notify(`${play.game.name} 기록을 ${currentUser?'이 기기에 저장했습니다. 클라우드에 동기화합니다.':'이 브라우저에 저장했습니다.'}`);updateButtons();renderHistory();if(currentUser)void sync();
}catch(error){message('playError',error);}finally{button.disabled=false;}};
function renderGameResults(games){
 const box=$('bggResults');box.replaceChildren();
 for(const game of games){
 if(typeof game.name!=='string'||(game.id&&!/^[1-9][0-9]{0,9}$/.test(String(game.id))))continue;
 const row=node('div',undefined,'game-result-row'),button=node('button',undefined,'game-result-choice');button.type='button';
 const cover=node('span','♟','game-result-cover');if(gameImageUrl(game))renderGameArtwork(cover,game);button.append(cover);
 const info=node('span',undefined,'game-result-info');info.append(node('strong',game.name),node('small',[game.year,game.id?'#'+game.id:'',game.source||'BGG'].filter(Boolean).join(' · ')));button.append(info);
 button.onclick=()=>{searchController?.abort();clearTimeout(searchTimer);searchSerial++;$('searchBgg').disabled=false;$('playGame').value=game.name;$('playBggId').value=String(game.id||'');showSelectedGame(game.name,game.id,gameImageUrl(game));box.replaceChildren();$('playError').textContent='';$('gameSearchStatus').textContent='게임을 선택했습니다. 참여자와 결과를 확인하세요.';rememberGame();};
 row.append(button);
 if(game.id){const link=node('a','ⓘ','game-result-detail');link.href='https://boardgamegeek.com/boardgame/'+game.id;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',game.name+' BGG 상세 보기');row.append(link);}
 box.append(row);
 }
}
async function searchGames(){
 clearTimeout(searchTimer);
 const query=$('playGame').value.trim();if(!query){$('bggResults').replaceChildren();$('gameSearchStatus').textContent='검색할 게임명을 입력해주세요.';return;}
 $('playError').textContent='';const local=searchLocalGames(query,records);renderGameResults(local);
 if(!bggSearchUrl){$('gameSearchStatus').textContent=local.length?local.length+'개 결과 · 저장 게임 / 기본 목록':'기본 목록에 없는 게임입니다. 이름을 직접 입력해 저장하거나 BGG 웹 검색을 이용해주세요.';return;}
 searchController?.abort();searchController=new AbortController();const controller=searchController,serial=++searchSerial,button=$('searchBgg');button.disabled=true;$('gameSearchStatus').textContent='BGG 검색 중…';
 try{
 const token=await idToken(currentUser?.uid);if(serial!==searchSerial)return;const url=new URL(bggSearchUrl);url.searchParams.set('query',query);const response=await fetch(url,{signal:controller.signal,headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw Error(response.status===202||response.status===429?'BGG가 검색을 준비 중입니다. 잠시 후 다시 검색해주세요.':'BGG에 연결하지 못했습니다. 아래 결과를 선택하거나 게임명을 직접 입력할 수 있어요.');
 const data=await response.json();if(serial!==searchSerial)return;const merged=new Map(local.map(g=>[g.id?'bgg:'+g.id:'name:'+g.name,g]));
 for(const game of Array.isArray(data.games)?data.games:[])if(/^[1-9][0-9]{0,9}$/.test(String(game.id))&&typeof game.name==='string')merged.set('bgg:'+game.id,{...game,source:'BGG'});
 const games=[...merged.values()];renderGameResults(games);$('gameSearchStatus').textContent=games.length?games.length+'개 결과 · 원하는 게임을 선택해주세요.':'결과가 없습니다. 게임명을 직접 입력해 저장할 수 있어요.';
 }catch(error){if(error.name!=='AbortError'&&serial===searchSerial)$('gameSearchStatus').textContent=error.message;}
 finally{if(serial===searchSerial)button.disabled=false;}
}
$('openBggWebsite').onclick=()=>{const query=$('playGame').value.trim();if(query)window.open('https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q='+encodeURIComponent(query),'_blank','noopener,noreferrer');};
$('searchBgg').onclick=searchGames;


let recordEditing=null;
function openRecordEditor(play,person,field){
 recordEditing={playId:play.id,personId:person.id,field,original:play,context:{key:key(),epoch:accountEpoch}};
 const input=$('recordEditValue');$('recordEditTitle').textContent=field==='name'?'플레이어 이름 수정':'기록 점수 수정';$('recordEditLabel').textContent=field==='name'?'이름':person.name+' · 점수';
 $('recordDeletePlayer').hidden=field!=='name';$('recordDeletePlayer').disabled=play.players.length<=1;
 input.type='text';input.inputMode=field==='score'?'decimal':'text';input.maxLength=field==='name'?120:24;input.value=person[field]===null?'':String(person[field]);$('recordEditHint').textContent=field==='score'?'새 점수로 순위·승자를 다시 계산합니다. 비워두면 점수 없음으로 저장됩니다.':(play.players.length<=1?'마지막 플레이어입니다. 경기 전체 삭제는 기록 삭제를 이용해주세요.':'이 경기에 저장된 이름을 수정하거나 플레이어를 삭제합니다.');$('recordEditError').textContent='';show('recordEditDialog');input.focus({preventScroll:true});input.select?.();
}
function checkRecordContext(context){if(context.key!==key()||context.epoch!==accountEpoch)throw Error('계정이 변경됐습니다. 기록을 다시 열어주세요.');}
function updateRecordedPlayer(playId,personId,field,value,context,expected){
 checkRecordContext(context);const original=records.find(p=>p.id===playId);if(!original)throw Error('기록을 찾을 수 없습니다.');if(expected&&expected!==original)throw Error('기록이 변경됐습니다. 다시 열어서 수정해주세요.');
 let updated=editRecordedPlayer(original,personId,field,value);if(updated===original)return updated;if(field==='name'&&meIn(original,readIdentity(key()))?.id===personId)updated={...updated,players:updated.players.map(p=>({...p,isSelf:p.id===personId}))};const old=records,oldPending=new Set(pending);records=records.map(p=>p.id===playId?updated:p);if(currentUser)pending.add(playId);
 try{persist();}catch{records=old;pending=oldPending;throw Error('저장하지 못했습니다. 기기 저장 공간을 확인해주세요.');}
 renderHistory();updateButtons();notify('기록을 수정했습니다.');if(currentUser)void sync();return updated;
}
function deleteRecordedPlay(playId,context){
 checkRecordContext(context);if(!records.some(p=>p.id===playId))throw Error('기록을 찾을 수 없습니다.');const old=records,oldPending=new Set(pending);records=records.filter(p=>p.id!==playId);if(currentUser)pending.add(playId);else pending.delete(playId);
 try{persist();}catch{records=old;pending=oldPending;throw Error('삭제하지 못했습니다. 기기 저장 공간을 확인해주세요.');}
 renderHistory();updateButtons();notify(currentUser?'기록을 삭제했습니다. 계정에 동기화합니다.':'기록을 삭제했습니다.');if(currentUser)void sync();
}

function deleteRecordedPlayer(playId,personId,context,expected){
 checkRecordContext(context);const original=records.find(p=>p.id===playId);if(!original)throw Error('기록을 찾을 수 없습니다.');if(expected&&expected!==original)throw Error('기록이 변경됐습니다. 다시 열어주세요.');
 const updated=removeRecordedPlayer(original,personId),old=records,oldPending=new Set(pending);records=records.map(p=>p.id===playId?updated:p);if(currentUser)pending.add(playId);
 try{persist();}catch{records=old;pending=oldPending;throw Error('플레이어를 삭제하지 못했습니다. 기기 저장 공간을 확인해주세요.');}
 renderHistory();updateButtons();notify('기록에서 플레이어를 삭제했습니다.');if(currentUser)void sync();return updated;
}
$('recordDeletePlayer').onclick=()=>{if(!recordEditing)return;const editing=recordEditing,person=editing.original.players.find(p=>p.id===editing.personId);$('recordEditValue').blur?.();api.confirm('플레이어 삭제',person.name+'을(를) 이 경기 기록에서 삭제할까요?',()=>{try{deleteRecordedPlayer(editing.playId,editing.personId,editing.context,editing.original);recordEditing=null;close('recordEditDialog');}catch(error){message('recordEditError',error);}});};

$('recordEditForm').onsubmit=event=>{event.preventDefault();if(!recordEditing)return;const {playId,personId,field,context,original}=recordEditing;try{updateRecordedPlayer(playId,personId,field,$('recordEditValue').value,context,original);recordEditing=null;close('recordEditDialog');}catch(error){message('recordEditError',error);}};

function openStatsRecord(id){$('statsDetails').open=true;mode='history';renderHistory();document.getElementById('record-'+id)?.scrollIntoView?.({behavior:'smooth',block:'center'});}
function chooseStatsGame(game){statsView='games';mode='stats';$('recordFilter').value=game;$('statsDetails').open=false;renderHistory();$('statsViewTabs').scrollIntoView?.({behavior:'smooth',block:'start'});}
let enriching=false;
async function enrichRecordGames(){if(enriching||!currentUser||!bggSearchUrl)return;enriching=true;const uid=currentUser.uid,epoch=accountEpoch;try{const token=await idToken(uid);if(epoch!==accountEpoch)return;await enrichGames(records.map(p=>p.game),{endpoint:bggSearchUrl,token,onUpdate:()=>{if(epoch===accountEpoch)renderHistory();}});}catch{}finally{enriching=false;}}
function renderHistory(){
 void enrichRecordGames();
 const groups=gameStats(records),select=$('recordFilter'),selected=select.value;
 select.replaceChildren(node('option','게임 선택'));select.firstChild.textContent='게임 선택';select.firstChild.value='';select.firstChild.disabled=groups.length>0;
 for(const g of groups){const o=node('option',`${g.game.name} (${g.count}회)`);o.value=g.key;select.append(o);}
 select.value=groups.some(g=>g.key===selected)?selected:(statsView==='games'?groups[0]?.key||'':'');
 const recentDate=latestPlayDate(records);
 const filtered=records.filter(p=>statsView==='recent'?p.date===recentDate:statsView==='games'?gameKey(p.game)===select.value:true).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 for(const [view,id]of [['recent','statsRecent'],['all','statsAll'],['games','statsGames']]){$(id).setAttribute('aria-selected',String(statsView===view));$(id).setAttribute('tabindex',statsView===view?'0':'-1');}
 $('statsPanel').setAttribute('aria-labelledby',statsView==='recent'?'statsRecent':statsView==='all'?'statsAll':'statsGames');
 $('gameFilterSection').hidden=statsView!=='games';$('gameDetailTabs').hidden=statsView!=='games';
 $('statsDetailsTitle').textContent=statsView==='recent'?'이날의 기록 보기':statsView==='all'?'전체 기록 보기':'이 게임의 플레이어 성적 · 기록';
 if(statsView==='games'){
  if(filtered.length)renderStatsDashboard($('statsInsights'),filtered,today(),openStatsRecord,true,{scope:key(),allRecords:records,onIdentityChange:()=>window.dispatchEvent?.(new Event('score-identity:changed'))});
  else $('statsInsights').replaceChildren(node('p','저장된 게임 기록이 없습니다.','record-note'));
 }else renderOverview($('statsInsights'),records,{scope:key(),view:statsView,onGame:chooseStatsGame,onRecord:openStatsRecord});
 $('statsDetailCount').textContent=`${filtered.length}개 기록`;const profile=readIdentity(key()),personalBests=personalRecordIds(records,profile);const box=$('recordList');box.replaceChildren();$('historyTab').classList.toggle('active',mode==='history');$('statsTab').classList.toggle('active',mode==='stats');
if(!filtered.length){box.append(node('p','저장된 기록이 없습니다. 점수를 입력한 뒤 게임 기록 저장을 눌러주세요.','record-note'));return;}
if(statsView==='games'&&mode==='stats'){for(const g of gameStats(filtered)){const article=node('article',undefined,'record-item');article.append(node('h3',g.game.name),node('p',`${g.count}회 플레이 · 경쟁 ${g.competitive}회 · 협력 ${g.cooperative}회`));const wrap=node('div',undefined,'record-table-wrap'),table=node('table',undefined,'record-table'),head=node('thead'),row=node('tr');for(const label of ['플레이어','횟수','승리','승률','평균','최고','최저'])row.append(node('th',label));head.append(row);table.append(head);const body=node('tbody');for(const p of g.players){const tr=node('tr');for(const v of [p.name,p.count,p.wins,p.winRate===null?'—':`${Math.round(p.winRate*100)}%`,p.average===null?'—':p.average.toLocaleString('ko-KR',{maximumFractionDigits:1}),p.highest??'—',p.lowest??'—'])tr.append(node('td',String(v)));body.append(tr);}table.append(body);wrap.append(table);article.append(wrap,node('p','직접 기록한 동점은 공동 승리로, 가져온 기록은 원본 승자로 집계합니다. 승률은 승자가 확인된 경쟁 경기만 기준으로 하며 내 플레이어로 지정한 기록은 나로 합산하며, 그 외에는 같은 이름을 같은 플레이어로 집계합니다.'));box.append(article);}return;}
for(const p of filtered){const article=node('article',undefined,'record-item');article.id='record-'+p.id;article.append(node('h3',p.game.name),node('p',`${p.date} · ${p.players.length}인${p.rule==='lowest'?' · 낮은 점수 승리':p.rule==='cooperative'?' · 협력':''}${currentUser&&pending.has(p.id)?' · 저장 대기':''}`));const wins=winnerIds(p),me=meIn(p,profile),list=node('ul',undefined,'record-scores');for(const person of [...p.players].sort((a,b)=>a.score===null?(b.score===null?0:1):b.score===null?-1:p.rule==='lowest'?a.score-b.score:b.score-a.score)){const row=node('li'),name=node('button',person.name+(person.id===me?.id?' · 나':''),'record-edit-name'),score=node('button',person.score===null?'점수 없음':person.score.toLocaleString('ko-KR')+'점','record-edit-score'),result=node('span',wins.includes(person.id)?'우승':'','record-win');name.type=score.type='button';name.setAttribute('aria-label',person.name+' 이름 수정');score.setAttribute('aria-label',person.name+' 점수 수정');name.onclick=()=>openRecordEditor(p,person,'name');score.onclick=()=>openRecordEditor(p,person,'score');row.append(name,score,result);list.append(row);}article.append(list);const actions=node('div',undefined,'record-delete-row'),remove=node('button','기록 삭제','record-danger');remove.type='button';remove.setAttribute('aria-label',p.game.name+' '+p.date+' 기록 삭제');remove.onclick=()=>{const context={key:key(),epoch:accountEpoch};api.confirm('기록 삭제',p.game.name+'의 '+p.date+' 기록을 삭제할까요?',()=>{try{deleteRecordedPlay(p.id,context);}catch(error){notify(error.message);}});};actions.append(remove);article.append(actions);if(personalBests.has(p.id))article.append(node('p','개인 기록 갱신','record-best-badge'));box.append(article);}}
$('recordFilter').onchange=()=>{mode='stats';renderHistory();};
for(const [view,id]of [['recent','statsRecent'],['all','statsAll'],['games','statsGames']])$(id).onclick=()=>{statsView=view;mode=view==='games'?'stats':'history';$('statsDetails').open=false;renderHistory();};
$('statsViewTabs').addEventListener('keydown',event=>{const ids=['statsRecent','statsAll','statsGames'],index=ids.indexOf(event.target.id);if(index<0)return;let next=index;if(event.key==='ArrowRight')next=(index+1)%3;else if(event.key==='ArrowLeft')next=(index+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();$(ids[next]).onclick();$(ids[next]).focus();});$('historyTab').onclick=()=>{mode='history';renderHistory();};$('statsTab').onclick=()=>{mode='stats';renderHistory();};
$('savePlay').onclick=openSave;
async function sync(){if(!currentUser||syncing)return;syncing=true;const uid=currentUser.uid,epoch=accountEpoch;try{while(pending.size){const id=[...pending][0];if(epoch!==accountEpoch)return;const play=records.find(p=>p.id===id);if(play)await saveCloud(play,uid);else await deleteCloud(id,uid);if(epoch!==accountEpoch)return;if(records.find(p=>p.id===id)!==play)continue;pending.delete(id);persist();}notify('기록을 클라우드에 저장했습니다.');}catch(error){if(epoch===accountEpoch)notify('클라우드 저장 대기 중입니다. '+friendly(error));}finally{syncing=false;updateButtons();}}
async function refreshCloud(){if(!currentUser)return;const uid=currentUser.uid,epoch=accountEpoch,revision=recordRevision;try{const remote=(await loadCloud(uid)).filter(isPlay);if(epoch!==accountEpoch||revision!==recordRevision)return;const map=new Map(remote.map(p=>[p.id,p]));for(const p of records)if(pending.has(p.id))map.set(p.id,p);for(const id of pending)if(!records.some(p=>p.id===id))map.delete(id);records=[...map.values()];persist();await sync();if(epoch===accountEpoch)renderHistory();}catch(error){if(epoch===accountEpoch)notify('클라우드 기록을 불러오지 못했습니다. 기기 기록은 유지됩니다. '+friendly(error));}updateButtons();}
$('accountLogin').onclick=async()=>{const button=$('accountLogin');button.disabled=true;$('accountError').textContent='';try{if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 잠시 후 다시 시도해주세요.');await login();}catch(e){message('accountError',friendly(e));}finally{button.disabled=false;}};
$('accountLogout').onclick=async()=>{try{await logout();$('accountError').textContent='';notify('로그아웃했습니다.');}catch(e){message('accountError',friendly(e));}};
$('cloudSync').onclick=refreshCloud;
$('guestUpload').onclick=()=>api.confirm('기기 기록을 계정에 저장','비로그인 상태에서 저장한 이 기기의 기록을 현재 계정에 복사할까요?',async()=>{const guest=read(guestKey).records;const old=records,oldPending=new Set(pending);try{const known=new Set(records.map(p=>p.id));for(const p of guest)if(!known.has(p.id)){records.push(p);pending.add(p.id);}persist();updateButtons();await sync();renderHistory();}catch(e){records=old;pending=oldPending;message('accountError',e);}});
window.ScoreRecords={
 renderHistory,
 openSave,
 updatePlayer:updateRecordedPlayer,
 deletePlay:deleteRecordedPlay,
 deletePlayer:deleteRecordedPlayer,
 assignSelf:(playId,playerId,context)=>{
  if(context.key!==key()||context.epoch!==accountEpoch)throw Error('계정이 변경됐습니다. 다시 선택해주세요.');
  const original=records.find(p=>p.id===playId);if(!original)throw Error('기록을 찾을 수 없습니다.');const updated=withSelf(original,playerId),old=records,oldPending=new Set(pending);records=records.map(p=>p.id===playId?updated:p);if(currentUser)pending.add(playId);
  try{persist();}catch{records=old;pending=oldPending;throw Error('저장 공간이 부족해 지정하지 못했습니다.');}
  try{rememberIdentity(key(),updated.players.find(p=>p.isSelf));}catch{}
  renderHistory();updateButtons();notify('이 경기의 내 플레이어 지정을 저장했습니다.');if(currentUser)void sync();return updated;
 },
 context:()=>({key:key(),epoch:accountEpoch,records:records.map(p=>({...p,game:{...p.game},players:p.players.map(person=>({...person}))}))}),
 merge:(incoming,context)=>{
  if(context.key!==key()||context.epoch!==accountEpoch)throw Error('계정이 변경됐습니다. 파일을 다시 선택해주세요.');
  if(!Array.isArray(incoming)||incoming.some(p=>!isPlay(p)))throw Error('기록 형식을 확인해주세요.');
  const result=mergeImported(records,incoming),old=records,oldPending=new Set(pending);records=result.records;
  if(currentUser)for(const p of result.added)pending.add(p.id);
  try{persist();}catch(error){records=old;pending=oldPending;throw Error('기기 저장 공간이 부족해 가져오지 못했습니다. 기존 기록은 유지됩니다.');}
  updateButtons();renderHistory();if(currentUser&&result.added.length)void sync();return {added:result.added.length,duplicates:result.duplicates};
 }
};
for(const button of document.querySelectorAll('[data-record-close]'))button.onclick=()=>close(button.dataset.recordClose);
window.addEventListener('scorecounter:changed',updateButtons);window.addEventListener('online',()=>{if(currentUser)refreshCloud();});
loadLocal();updateButtons();
if(cloudConfigured())connectCloud(async user=>{accountEpoch++;recordEditing=null;close('recordEditDialog');searchSerial++;searchController?.abort();clearTimeout(searchTimer);currentUser=user;const finishDraft=Boolean(recordLoginPending&&user&&$('savePlayDialog').open),draftVersion=recordDraftVersion;if($('savePlayDialog').open){if(recordLoginPending&&user){snapshotScope=key();recordLoginPending=false;updateRecordStorage();}else close('savePlayDialog');}loadLocal();updateButtons();renderHistory();if(user)await refreshCloud();if(finishDraft&&draftVersion===recordDraftVersion&&currentUser?.uid===user.uid&&$('savePlayDialog').open)await $('savePlayForm').onsubmit({preventDefault(){}});}).catch(error=>notify('로그인 서비스를 연결하지 못했습니다. '+friendly(error)));
