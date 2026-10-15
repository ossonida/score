import {enhanceGamePicker} from './game-picker.js?v=48';
import {editRecordedPlayer,removeRecordedPlayer} from './record-edit.js?v=48';
import {enrichGames} from './bgg-details-client.js?v=48';
import {renderOverview} from './overview-dashboard.js?v=48';
import {latestPlayDate} from './stats-overview.js?v=48';
import {gameImageUrl,renderGameArtwork,rememberGameImages} from './game-artwork.js?v=48';
import {isAutomatic,savingPlayers,withSelf,selectedSelf,rememberIdentity} from './player-memory.js?v=48';
import {readIdentity,meIn,personalRecordIds} from './personal-stats.js?v=48';
import {renderStatsDashboard} from './stats-dashboard.js?v=48';
import {mergeImported} from './data-transfer.js?v=48';
import {searchLocalGames,resolveGame,matchGameRecords,searchableGameGroups} from './game-catalog.js?v=48';
import {createPlay,isPlay,gameKey,winnerIds,gameStats} from './records-core.js?v=48';
import {cloudConfigured,connectCloud,login,logout,loadCloud,saveCloud,deleteCloud,idToken} from './cloud-records.js?v=48';
import {bggSearchUrl} from './firebase-config.js?v=48';
const $=id=>document.getElementById(id), api=window.ScoreCounter;
let currentUser=null,records=[],pending=new Set(),mode='history',statsView='recent',accountEpoch=0,searchController=null,searchSerial=0,snapshot=[],snapshotScope='',syncing=null,searchTimer=null;
let statsGameTarget='';
let recordRevision=0,cloudState='idle',cloudError='',authReady=!cloudConfigured();
function recoveryKey(){return key()+'.recovery';}
function recoveryRecords(){return read(recoveryKey()).records.filter(p=>!records.some(r=>r.id===p.id)&&!pending.has(p.id));}
function syncFailure(error){cloudState='error';cloudError=friendly(error);message('accountError','클라우드 동기화 실패: '+cloudError);}
let recordLoginPending=false,recordDraftVersion=0,recordFlow='setup',pendingGame=null;
const sessionKey='score.activeGame.v1';
function checkedGame(config){const checked=createPlay({...config,players:[{id:'check',name:'check',score:0,color:'#ffffff'}]});return {game:checked.game,date:checked.date,rule:checked.rule,noScores:config.noScores===true};}
function readSession(){try{const saved=JSON.parse(localStorage.getItem(sessionKey)||'null');if(!saved||!/^[-a-zA-Z0-9_.:]{1,100}$/.test(saved.recordId))return null;return {...checkedGame(saved),recordId:saved.recordId};}catch{return null;}}
let activeSession=readSession();
const guestKey='score.plays.v1.guest';
function key(){return currentUser?`score.plays.v1.user.${currentUser.uid}`:guestKey;}
function read(keyName){try{const data=JSON.parse(localStorage.getItem(keyName)||'{}');return {records:Array.isArray(data.records)?matchGameRecords(data.records.filter(isPlay)):[],pending:Array.isArray(data.pending)?data.pending:[]};}catch{return {records:[],pending:[]};}}
function persist(){localStorage.setItem(key(),JSON.stringify({records,pending:[...pending]}));recordRevision++;window.dispatchEvent?.(new Event('score-records:changed'));}
function loadLocal(){const data=read(key());records=data.records;pending=new Set(data.pending);window.dispatchEvent?.(new Event('score-records:changed'));}
function notify(text){$('recordMessage').textContent=text;if(location.hash==='#settings')$('accountStatus').textContent=text;if(location.hash==='#stats')$('statsStatus').textContent=text;}
function message(id,error){$(id).textContent=typeof error==='string'?error:(error?.message||'처리하지 못했습니다. 다시 시도해주세요.');}
function friendly(error){if(error?.code==='permission-denied')return 'Firebase 기록 접근 권한을 확인해야 합니다. 이 기기의 기록은 유지됩니다.';if(error?.code==='unavailable')return '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 동기화해주세요.';if(error?.code==='auth/popup-blocked')return '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 로그인해주세요.';if(error?.code==='auth/popup-closed-by-user')return '로그인이 취소됐습니다.';return error?.message||'연결하지 못했습니다. 기록은 이 브라우저에 보관됩니다.';}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function close(id){$(id).close();}
function show(id){$(id).showModal();}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function updateButtons(){
 $('authChecking').hidden=authReady;$('accountName').hidden=!authReady;$('accountStorage').hidden=!authReady;
 const working=!!currentUser&&['loading','saving'].includes(cloudState),progress=cloudState==='saving'?'기록 동기화 중…':'기록 불러오는 중…';
 $('cloudProgress').hidden=!working;$('cloudProgress').textContent=working?progress:'';
 $('accountStorage').setAttribute('aria-busy',String(working));$('cloudSync').setAttribute('aria-busy',String(working));$('cloudSync').disabled=working;$('cloudSync').textContent=working?progress:'클라우드 동기화';
 const onBoard=api.getPlayers().length>0;if(!onBoard&&activeSession){activeSession=null;try{localStorage.setItem(sessionKey,'null');}catch{}}
 $('boardCaption').textContent='점수는 이 기기에 자동 저장됩니다.';$('recordingStatus').hidden=!onBoard||!activeSession;$('recordingStatus').textContent=onBoard&&activeSession?activeSession.game.name+' 점수 기록을 시작했습니다.':'';$('recordingStatus').title=$('recordingStatus').textContent;
 $('savePlay').textContent='게임 종료';
 $('savePlay').hidden=!onBoard;$('recordLoginHint').hidden=!authReady||!!currentUser||!api.getPlayers().length; $('savePlay').disabled=false;$('accountName').textContent=currentUser?(currentUser.displayName||currentUser.email||'로그인됨'):'Google 로그인으로 다른 기기에서도 기록을 확인하세요.';$('accountLogin').hidden=!authReady||!!currentUser;$('accountLogout').hidden=!currentUser;$('guestUpload').hidden=!currentUser||!read(guestKey).records.length;$('cloudSync').hidden=!currentUser;$('recoverRecords').hidden=!currentUser||!recoveryRecords().length;$('accountStorage').textContent=currentUser?(cloudState==='error'?'동기화에 실패했습니다. 다른 기기에 기록이 표시되지 않을 수 있습니다.':cloudState==='loading'?'계정의 기록을 불러오는 중입니다.':cloudState==='saving'?'기록을 클라우드에 저장하는 중입니다.':pending.size?`${pending.size}개 기록이 클라우드 저장 대기 중입니다.`:cloudState==='ready'?`클라우드와 동기화됨 · ${records.length}개 기록`:'클라우드 연결을 확인하고 있습니다.'):'현재 기록은 이 브라우저에 저장됩니다.';}
function updateGameOptions(){const groups=gameStats(records);$('savedGames').replaceChildren(...groups.map(g=>{const o=node('option');o.value=g.game.name;return o;}));}
function draftKey(){return `score.playDraft.v1.${currentUser?.uid||'guest'}`;}
function readDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'{}');return d&&typeof d.name==='string'&&d.name.length<=120?d:{};}catch{return {};}}
function rememberGame(){try{localStorage.setItem(draftKey(),JSON.stringify({name:$('playGame').value.trim(),bggId:$('playBggId').value.trim(),rule:$('playRule').value}));}catch{}}
function showSelectedGame(name,bggId,image){if(image&&bggId)try{rememberGameImages({[bggId]:image});}catch{}const box=$('selectedGameInfo');box.replaceChildren();if(!name)return;const art=node('span',undefined,'selected-game-art');renderGameArtwork(art,{name,bggId});box.append(art,node('span',name));}
function chooseGame(game){$('searchBgg').disabled=false;$('playGame').value=game.name;$('playBggId').value=String(game.bggId||game.id||'');showSelectedGame(game.name,game.bggId||game.id,gameImageUrl(game));$('bggResults').replaceChildren();$('gameSearchStatus').textContent='게임을 선택했습니다. 참여자와 결과를 확인하세요.';rememberGame();}
function renderRecentGames(){const games=new Map();for(const play of [...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){const key=gameKey(play.game);if(!games.has(key))games.set(key,play.game);if(games.size===5)break;}$('recentGames').replaceChildren(...[...games.values()].map(game=>{const button=node('button',game.name,'recent-game');button.type='button';button.onclick=()=>{searchController?.abort();clearTimeout(searchTimer);searchSerial++;chooseGame(game);};return button;}));$('recentGamesSection').hidden=!games.size;}
function renderSnapshot(){
 const visible=recordFlow==='finish';$('playSnapshot').hidden=!visible;$('recordAnonymousHint').hidden=!visible||!snapshot.some(isAutomatic);$('playSnapshot').replaceChildren();
 if(!visible)return;
 const noScores=$('playWithoutScores').checked,rule=$('playRule').value,wins=noScores?[]:winnerIds({rule,players:snapshot});
 for(const person of [...snapshot].sort((a,b)=>noScores?0:rule==='lowest'?a.score-b.score:b.score-a.score)){const row=node('div',undefined,'finish-player'),name=node('span',isAutomatic(person)?'익명의 플레이어 ('+person.name+')':person.name,'finish-name');row.append(name,node('strong',noScores?'점수 없음':person.score.toLocaleString('ko-KR')+'점'),node('span',wins.includes(person.id)?'승리':'','finish-winner'));$('playSnapshot').append(row);}
}
function updateRecordStorage(){
 $('recordResultHeading').textContent=recordFlow==='setup'?'플레이 설정':'참여자 · 결과';
 $('recordFormTitle').textContent=recordFlow==='setup'?'게임 기록하기':'경기 기록 저장';
 $('recordFormHint').textContent=recordFlow==='setup'?'게임과 날짜, 승리 조건을 선택한 뒤 플레이어를 추가하세요.':'점수판의 이름과 점수를 저장합니다. 이름·점수 수정은 점수판에서 할 수 있습니다.';
 $('recordStorageHint').hidden=recordFlow==='setup';$('recordStorageHint').textContent=currentUser?'현재 로그인한 계정에 기록을 저장합니다.':'이 기기에 저장됩니다. 로그인하면 다른 기기에서도 기록을 확인할 수 있습니다.';
 $('recordLogin').hidden=recordFlow==='setup'||!!currentUser;$('commitPlay').textContent=recordFlow==='setup'?'플레이어 추가':currentUser?'기록 저장':'이 기기에 저장';
}
function openSave({finish=false,showDialog=true}={}){
 recordFlow=finish?'finish':'setup';$('recentGamesSection').open=false;recordDraftVersion++;recordLoginPending=false;snapshot=api.getPlayers();snapshotScope=key();
 const config=finish?activeSession:null;const draft=readDraft();$('playWithoutScores').checked=config?config.noScores:false;$('playGame').value=config?config.game.name:'';$('playBggId').value=config?config.game.bggId:'';$('playDate').value=config?config.date:today();$('playRule').value=config?config.rule:['highest','lowest','cooperative'].includes(draft.rule)?draft.rule:'highest';$('playError').textContent='';$('bggResults').replaceChildren();showSelectedGame(config?.game.name,config?.game.bggId);$('gameSearchStatus').textContent=bggSearchUrl?'게임명을 입력하거나 최근 게임을 선택하세요.':'한글·영문으로 기본 목록 검색 · 목록에 없으면 직접 입력할 수 있어요.';renderRecentGames();renderSnapshot();updateRecordStorage();updateGameOptions();if(showDialog)show('savePlayDialog');
}
$('playWithoutScores').onchange=renderSnapshot;
$('recordLogin').onclick=async()=>{if($('savePlayForm').reportValidity?.()===false)return;if(!snapshot.length){message('playError','플레이어를 먼저 추가해주세요.');return;}const button=$('recordLogin');button.disabled=true;button.setAttribute('aria-busy','true');recordLoginPending=true;try{if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 이 기기에 먼저 저장할 수 있습니다.');await login();}catch(error){recordLoginPending=false;message('playError',friendly(error));}finally{button.disabled=false;button.setAttribute('aria-busy','false');}};
$('savePlayDialog').addEventListener('close',()=>{recordLoginPending=false;});
$('playRule').addEventListener('change',()=>{renderSnapshot();rememberGame();});
$('gamePlayersForm').onsubmit=event=>{
 event.preventDefault();const raw=$('gamePlayerCount').value,count=Number(raw),config=pendingGame,context=snapshotScope;
 if(!config||context!==key()){message('gamePlayersError','계정이 변경됐습니다. 게임을 다시 선택해주세요.');return;}
 if(!/^[0-9]+$/.test(raw)||!Number.isInteger(count)||count<1||count>100){message('gamePlayersError','플레이어는 1~100명으로 지정해주세요.');return;}
 const start=()=>{try{if(context!==key())throw Error('계정이 변경됐습니다. 게임을 다시 선택해주세요.');const previous=activeSession,next={...config,recordId:crypto.randomUUID()};localStorage.setItem(sessionKey,JSON.stringify(next));activeSession=next;try{api.startPlayers(count);}catch(error){activeSession=previous;localStorage.setItem(sessionKey,JSON.stringify(previous));throw error;}pendingGame=null;close('gamePlayersDialog');location.hash='home';updateButtons();$('recordMessage').textContent='';}catch(error){message('gamePlayersError',error);show('gamePlayersDialog');}};
 if(api.getPlayers().length){close('gamePlayersDialog');api.confirm('새 게임 시작','현재 점수판을 새 플레이어와 0점으로 바꿀까요? 저장한 경기 기록은 유지됩니다.',start);}else start();
};
function selectedGame(){return resolveGame({name:$('playGame').value.trim(),bggId:$('playBggId').value.trim()},records);}
$('playGame').addEventListener('input',()=>{$('playBggId').value='';$('selectedGameInfo').textContent='';searchSerial++;searchController?.abort();clearTimeout(searchTimer);$('searchBgg').disabled=false;rememberGame();renderGameResults(searchLocalGames($('playGame').value,records));if(bggSearchUrl)searchTimer=setTimeout(searchGames,500);});
$('savePlayForm').onsubmit=async event=>{event.preventDefault();const button=$('commitPlay');button.disabled=true;button.setAttribute('aria-busy','true');try{
 if(snapshotScope!==key())throw Error('계정이 변경됐습니다. 저장 창을 다시 열어주세요.');
 if(recordFlow==='setup'){pendingGame=checkedGame({game:selectedGame(),date:$('playDate').value,rule:$('playRule').value,noScores:$('playWithoutScores').checked});rememberGame();close('savePlayDialog');$('gamePlayerCount').value=String(api.getPlayers().length||2);$('gamePlayersError').textContent='';show('gamePlayersDialog');$('gamePlayerCount').focus();return;}

 if(!snapshot.length)throw Error('함께한 사람을 한 명 이상 추가해주세요.');const noScores=$('playWithoutScores').checked;const selfId=selectedSelf(snapshot,key());const savedPlayers=snapshot.map(p=>{const next={...p};if(noScores){next.score=null;delete next.winner;delete next.rank;}return next;});const play=createPlay({game:selectedGame(),date:$('playDate').value,rule:$('playRule').value,players:savingPlayers(savedPlayers,selfId)},activeSession?.recordId);
 rememberGame();const before=records;const oldPending=new Set(pending);const previous=records.find(p=>p.id===play.id);if(previous)play.createdAt=previous.createdAt;records=[play,...records.filter(p=>p.id!==play.id)];if(currentUser)pending.add(play.id);
 try{persist();}catch(e){records=before;pending=oldPending;throw Error('브라우저 저장 공간을 사용할 수 없습니다. 기록을 저장하지 못했어요.');}
 try{rememberIdentity(key(),snapshot.find(p=>p.id===selfId));if(api.getPlayers().some(p=>p.id===selfId))api.setSelf?.(selfId,key());}catch{}
 close('savePlayDialog');savedNotice();updateButtons();renderHistory();if(currentUser)void sync({silent:true});return true;
}catch(error){message('playError',error);return false;}finally{button.disabled=false;button.setAttribute('aria-busy','false');}};
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
 searchController?.abort();searchController=new AbortController();const controller=searchController,serial=++searchSerial,button=$('searchBgg');button.disabled=true;button.setAttribute('aria-busy','true');$('gameSearchStatus').textContent='BGG 검색 중…';
 try{
 const token=await idToken(currentUser?.uid);if(serial!==searchSerial)return;const url=new URL(bggSearchUrl);url.searchParams.set('query',query);const response=await fetch(url,{signal:controller.signal,headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw Error(response.status===202||response.status===429?'BGG가 검색을 준비 중입니다. 잠시 후 다시 검색해주세요.':'BGG에 연결하지 못했습니다. 아래 결과를 선택하거나 게임명을 직접 입력할 수 있어요.');
 const data=await response.json();if(serial!==searchSerial)return;const merged=new Map(local.map(g=>[g.id?'bgg:'+g.id:'name:'+g.name,g]));
 for(const game of Array.isArray(data.games)?data.games:[])if(/^[1-9][0-9]{0,9}$/.test(String(game.id))&&typeof game.name==='string')merged.set('bgg:'+game.id,{...game,source:'BGG'});
 const games=[...merged.values()];renderGameResults(games);$('gameSearchStatus').textContent=games.length?games.length+'개 결과 · 원하는 게임을 선택해주세요.':'결과가 없습니다. 게임명을 직접 입력해 저장할 수 있어요.';
 }catch(error){if(error.name!=='AbortError'&&serial===searchSerial)$('gameSearchStatus').textContent=error.message;}
 finally{if(serial===searchSerial){button.disabled=false;button.setAttribute('aria-busy','false');}}
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
function chooseStatsGame(game){statsView='games';mode='stats';statsGameTarget=game;$('statsDetails').open=false;renderHistory();$('statsViewTabs').scrollIntoView?.({behavior:'smooth',block:'start'});}
let enriching=false;
async function enrichRecordGames(){if(enriching||!currentUser||!bggSearchUrl)return;enriching=true;const uid=currentUser.uid,epoch=accountEpoch;try{const token=await idToken(uid);if(epoch!==accountEpoch)return;await enrichGames(records.map(p=>p.game),{endpoint:bggSearchUrl,token,onUpdate:()=>{if(epoch===accountEpoch)renderHistory();}});}catch{}finally{enriching=false;}}
function renderHistory(){
 records=matchGameRecords(records);
 void enrichRecordGames();
 const allGroups=gameStats(records),groups=searchableGameGroups(allGroups),select=$('recordFilter'),selected=statsGameTarget||select.value;statsGameTarget='';
 select.replaceChildren(node('option','게임 선택'));select.firstChild.textContent='게임 선택';select.firstChild.value='';select.firstChild.disabled=groups.length>0;
 for(const g of groups){const o=node('option',`${g.game.name} (${g.count}회)`);o.value=g.key;select.append(o);}
 select.value=groups.some(g=>g.key===selected)?selected:(statsView==='games'?allGroups[0]?.key||'':'');
 enhanceGamePicker(select,groups);
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
let savedNoticeTimer;
function savedNotice(){notify('점수가 기록되었습니다.');$('recordSavedNotice').textContent='점수가 기록되었습니다.';$('recordSavedNotice').hidden=false;clearTimeout(savedNoticeTimer);savedNoticeTimer=setTimeout(()=>{$('recordSavedNotice').hidden=true;},3500);}
$('savePlay').onclick=()=>{message('endGameError','');$('endGameName').textContent=activeSession?.game.name||'현재 점수판';show('endGameDialog');};
$('endGameSave').onclick=async()=>{const button=$('endGameSave');button.disabled=true;button.setAttribute('aria-busy','true');try{if(!activeSession){close('endGameDialog');openSave({finish:true});return;}openSave({finish:true,showDialog:false});const saved=await $('savePlayForm').onsubmit({preventDefault(){}});if(saved)close('endGameDialog');else message('endGameError',$('playError').textContent);}catch(error){message('endGameError',error);}finally{button.disabled=false;button.setAttribute('aria-busy','false');}};
$('endGameHome').onclick=()=>{try{api.clearPlayers();pendingGame=null;close('endGameDialog');location.hash='home';$('recordMessage').textContent='';$('recordSavedNotice').hidden=true;updateButtons();window.scrollTo?.({top:0,behavior:'instant'});}catch(error){message('endGameError','초기화하지 못했습니다. '+friendly(error));}};

async function sync({silent=false}={}){
 if(!currentUser||syncing===accountEpoch)return;
 const uid=currentUser.uid,epoch=accountEpoch;syncing=epoch;cloudState='saving';updateButtons();
 try{while(pending.size){const id=[...pending][0];if(epoch!==accountEpoch)return;const play=records.find(p=>p.id===id);if(play)await saveCloud(play,uid);else await deleteCloud(id,uid);if(epoch!==accountEpoch)return;if(records.find(p=>p.id===id)!==play)continue;pending.delete(id);persist();}
 if(epoch===accountEpoch){cloudState='ready';cloudError='';message('accountError','');if(!silent)notify('기록을 클라우드에 저장했습니다.');}
 }catch(error){if(epoch===accountEpoch){syncFailure(error);notify('클라우드 저장 대기 중입니다. '+friendly(error));}}
 finally{if(syncing===epoch)syncing=null;updateButtons();}
}
async function refreshCloud(){
 if(!currentUser||['loading','saving'].includes(cloudState))return;
 const uid=currentUser.uid,epoch=accountEpoch,revision=recordRevision;cloudState='loading';updateButtons();
 try{const remote=await loadCloud(uid);if(epoch!==accountEpoch)return;
 if(!Array.isArray(remote)||remote.some(p=>!isPlay(p)))throw Error('클라우드 기록 형식을 확인하지 못했습니다. 기기 기록을 유지합니다.');
 if(revision!==recordRevision){await sync();return;}
 const matchedRemote=matchGameRecords(remote);const map=new Map(matchedRemote.map(p=>[p.id,p]));for(const p of records)if(pending.has(p.id))map.set(p.id,p);for(const id of pending)if(!records.some(p=>p.id===id))map.delete(id);
 // Keep a separate, account-scoped recovery copy before accepting remote removals.
 // Never automatically resurrect games intentionally deleted on another device.
 const missing=records.filter(p=>!map.has(p.id)&&!pending.has(p.id));
 if(missing.length){const backup=new Map(read(recoveryKey()).records.map(p=>[p.id,p]));for(const p of missing)backup.set(p.id,p);localStorage.setItem(recoveryKey(),JSON.stringify({records:[...backup.values()],pending:[]}));}
 const previous=records;records=[...map.values()];try{persist();}catch(error){records=previous;throw error;}
 await sync();if(epoch===accountEpoch)renderHistory();
 }catch(error){if(epoch===accountEpoch){syncFailure(error);notify('클라우드 기록을 불러오지 못했습니다. 기기 기록은 유지됩니다. '+friendly(error));}}
 finally{if(epoch===accountEpoch)updateButtons();}
}
$('accountLogin').onclick=async()=>{const button=$('accountLogin');button.disabled=true;button.setAttribute('aria-busy','true');$('accountError').textContent='';try{if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 잠시 후 다시 시도해주세요.');await login();}catch(e){message('accountError',friendly(e));}finally{button.disabled=false;button.setAttribute('aria-busy','false');}};
$('accountLogout').onclick=async()=>{try{await logout();$('accountError').textContent='';notify('로그아웃했습니다.');}catch(e){message('accountError',friendly(e));}};
$('cloudSync').onclick=refreshCloud;
$('recoverRecords').onclick=()=>{const context={key:key(),epoch:accountEpoch},items=recoveryRecords();api.confirm('기기 기록 복구',items.length+'개 기록을 계정에 다시 저장할까요? 다른 기기에서 삭제한 기록도 포함될 수 있습니다.',async()=>{try{checkRecordContext(context);const old=records,oldPending=new Set(pending);const restored=recoveryRecords();records=[...records,...restored];for(const p of restored)pending.add(p.id);try{persist();}catch(error){records=old;pending=oldPending;throw error;}renderHistory();updateButtons();await sync();}catch(error){message('accountError',error);}});};
$('guestUpload').onclick=()=>api.confirm('기기 기록을 계정에 저장','비로그인 상태에서 저장한 이 기기의 기록을 현재 계정에 복사할까요?',async()=>{const guest=read(guestKey).records;const old=records,oldPending=new Set(pending);try{const known=new Set(records.map(p=>p.id));for(const p of guest)if(!known.has(p.id)){records.push(p);pending.add(p.id);}persist();updateButtons();await sync();renderHistory();}catch(e){records=old;pending=oldPending;message('accountError',e);}});
window.ScoreRecords={
 renderHistory,
 openSave,
 openFinish:()=>openSave({finish:true}),
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
if(cloudConfigured())connectCloud(async user=>{authReady=true;accountEpoch++;pendingGame=null;close('gamePlayersDialog');close('endGameDialog');recordEditing=null;close('recordEditDialog');searchSerial++;searchController?.abort();clearTimeout(searchTimer);currentUser=user;cloudState='idle';cloudError='';message('accountError','');const finishDraft=Boolean(recordLoginPending&&user&&$('savePlayDialog').open),draftVersion=recordDraftVersion;if($('savePlayDialog').open){if(recordLoginPending&&user){snapshotScope=key();recordLoginPending=false;updateRecordStorage();}else close('savePlayDialog');}loadLocal();updateButtons();renderHistory();if(user)await refreshCloud();if(finishDraft&&draftVersion===recordDraftVersion&&currentUser?.uid===user.uid&&$('savePlayDialog').open)await $('savePlayForm').onsubmit({preventDefault(){}});}).catch(error=>{authReady=true;updateButtons();message('accountError','로그인 상태를 확인하지 못했습니다. '+friendly(error));notify('로그인 서비스를 연결하지 못했습니다. '+friendly(error));});
