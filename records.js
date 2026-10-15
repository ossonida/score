import {isAutomatic,savingPlayers,withSelf,fillSelfSelect,rememberRoster,rememberIdentity} from './player-memory.js';
import {readIdentity} from './personal-stats.js';
import {renderMatchInsight} from './personal-dashboard.js';
import {renderStatsDashboard} from './stats-dashboard.js';
import {mergeImported} from './data-transfer.js';
import {searchLocalGames} from './game-catalog.js';
import {createPlay,isPlay,gameKey,winnerIds,gameStats} from './records-core.js?v=20';
import {cloudConfigured,connectCloud,login,logout,loadCloud,saveCloud,deleteCloud,idToken} from './cloud-records.js?v=20';
import {bggSearchUrl} from './firebase-config.js';
const $=id=>document.getElementById(id), api=window.ScoreCounter;
let currentUser=null,records=[],pending=new Set(),mode='history',accountEpoch=0,searchController=null,searchSerial=0,snapshot=[],snapshotScope='',syncing=false,searchTimer=null;
const guestKey='score.plays.v1.guest';
function key(){return currentUser?`score.plays.v1.user.${currentUser.uid}`:guestKey;}
function read(keyName){try{const data=JSON.parse(localStorage.getItem(keyName)||'{}');return {records:Array.isArray(data.records)?data.records.filter(isPlay):[],pending:Array.isArray(data.pending)?data.pending:[]};}catch{return {records:[],pending:[]};}}
function persist(){localStorage.setItem(key(),JSON.stringify({records,pending:[...pending]}));window.dispatchEvent?.(new Event('score-records:changed'));}
function loadLocal(){const data=read(key());records=data.records;pending=new Set(data.pending);window.dispatchEvent?.(new Event('score-records:changed'));}
function notify(text){$('recordMessage').textContent=text;$('accountStatus').textContent=text;}
function message(id,error){$(id).textContent=typeof error==='string'?error:(error?.message||'처리하지 못했습니다. 다시 시도해주세요.');}
function friendly(error){if(error?.code==='auth/popup-blocked')return '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 로그인해주세요.';if(error?.code==='auth/popup-closed-by-user')return '로그인이 취소됐습니다.';return error?.message||'연결하지 못했습니다. 기록은 이 브라우저에 보관됩니다.';}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function close(id){$(id).close();}
function show(id){$(id).showModal();}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function updateButtons(){ $('savePlay').hidden=!currentUser;$('recordLoginHint').hidden=!!currentUser; $('savePlay').disabled=!api.getPlayers().length;$('accountName').textContent=currentUser?(currentUser.displayName||currentUser.email||'로그인됨'):'Google 로그인으로 다른 기기에서도 기록을 확인하세요.';$('accountLogin').hidden=!!currentUser;$('accountLogout').hidden=!currentUser;$('guestUpload').hidden=!currentUser||!read(guestKey).records.length;$('cloudSync').hidden=!currentUser;$('accountStorage').textContent=currentUser?(pending.size?`${pending.size}개 기록이 클라우드 저장 대기 중입니다.`:'이 계정의 기록을 클라우드에 저장합니다.'):'현재 기록은 이 브라우저에 저장됩니다.';}
function updateGameOptions(){const groups=gameStats(records);$('savedGames').replaceChildren(...groups.map(g=>{const o=node('option');o.value=g.game.name;return o;}));}
function draftKey(){return `score.playDraft.v1.${currentUser?.uid||'guest'}`;}
function readDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'{}');return d&&typeof d.name==='string'&&d.name.length<=120?d:{};}catch{return {};}}
function rememberGame(){try{localStorage.setItem(draftKey(),JSON.stringify({name:$('playGame').value.trim(),bggId:$('playBggId').value.trim(),rule:$('playRule').value}));}catch{}}
function chooseGame(game){$('searchBgg').disabled=false;$('playGame').value=game.name;$('playBggId').value=String(game.bggId||game.id||'');$('selectedGameInfo').textContent='선택됨: '+game.name;$('bggResults').replaceChildren();$('gameSearchStatus').textContent='현재 플레이어와 점수로 기록합니다.';rememberGame();}
function renderRecentGames(){const games=new Map();for(const play of [...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){const key=gameKey(play.game);if(!games.has(key))games.set(key,play.game);if(games.size===5)break;}$('recentGames').replaceChildren(...[...games.values()].map(game=>{const button=node('button',game.name,'recent-game');button.type='button';button.onclick=()=>{searchController?.abort();clearTimeout(searchTimer);searchSerial++;chooseGame(game);};return button;}));$('recentGamesSection').hidden=!games.size;}
function renderSnapshot(){const rule=$('playRule').value,ranked=[...snapshot].sort((a,b)=>rule==='lowest'?a.score-b.score:b.score-a.score),wins=winnerIds({rule,players:snapshot});$('playSnapshot').replaceChildren(...ranked.map(person=>{const row=node('div',undefined,'finish-player');row.append(node('span',isAutomatic(person)?'익명의 플레이어 ('+person.name+')':person.name,'finish-name'),node('strong',person.score.toLocaleString('ko-KR')+'점','finish-score'),node('span',wins.includes(person.id)?'승리':'','finish-winner'));return row;}));}
function openSave(){snapshot=api.getPlayers();snapshotScope=key();fillSelfSelect($('playSelf'),snapshot,key());if(!snapshot.length){notify('먼저 플레이어를 추가해주세요.');return;}const draft=readDraft();$('playGame').value=draft.name||'';$('playBggId').value=/^[1-9][0-9]{0,9}$/.test(draft.bggId||'')?draft.bggId:'';$('playDate').value=today();$('playRule').value=['highest','lowest','cooperative'].includes(draft.rule)?draft.rule:'highest';$('playError').textContent='';$('bggResults').replaceChildren();$('selectedGameInfo').textContent=draft.name?'선택됨: '+draft.name:'';$('gameSearchStatus').textContent=bggSearchUrl?'게임명을 입력하거나 최근 게임을 선택하세요.':'한글·영문으로 기본 목록 검색 · 목록에 없으면 직접 입력해 저장할 수 있어요.';renderRecentGames();renderSnapshot();updateGameOptions();show('savePlayDialog');}
$('playSelf').onchange=renderSnapshot;
$('playRule').addEventListener('change',()=>{renderSnapshot();rememberGame();});
function selectedGame(){const name=$('playGame').value.trim();const known=records.find(p=>p.game.name.normalize('NFKC').toLocaleLowerCase()===name.normalize('NFKC').toLocaleLowerCase());return {name,bggId:$('playBggId').value.trim()||known?.game.bggId||''};}
$('playGame').addEventListener('input',()=>{$('playBggId').value='';$('selectedGameInfo').textContent='';searchSerial++;searchController?.abort();clearTimeout(searchTimer);$('searchBgg').disabled=false;rememberGame();renderGameResults(searchLocalGames($('playGame').value,records));if(bggSearchUrl)searchTimer=setTimeout(searchGames,500);});
$('savePlayForm').onsubmit=async event=>{event.preventDefault();const button=$('commitPlay');button.disabled=true;try{
 if(snapshotScope!==key())throw Error('계정이 변경됐습니다. 저장 창을 다시 열어주세요.');
 const selfId=$('playSelf').value;const play=createPlay({game:selectedGame(),date:$('playDate').value,rule:$('playRule').value,players:savingPlayers(snapshot,selfId)});
 rememberGame();const before=records;const oldPending=new Set(pending);records=[play,...records];if(currentUser)pending.add(play.id);
 try{persist();}catch(e){records=before;pending=oldPending;throw Error('브라우저 저장 공간을 사용할 수 없습니다. 기록을 저장하지 못했어요.');}
 let rosterWarning='';try{rememberRoster(key(),snapshot.map(p=>({...p,isSelf:p.id===selfId})));rememberIdentity(key(),snapshot.find(p=>p.id===selfId));api.setSelf?.(selfId,key());}catch{rosterWarning=' 최근 인원 설정은 저장하지 못했습니다.';}
 close('savePlayDialog');notify(`${play.game.name} 기록을 ${currentUser?'이 기기에 저장했습니다. 클라우드에 동기화합니다.':'이 브라우저에 저장했습니다.'}${rosterWarning}`);updateButtons();renderHistory();if(currentUser)void sync();
}catch(error){message('playError',error);}finally{button.disabled=false;}};
function renderGameResults(games){
 const box=$('bggResults');box.replaceChildren();
 for(const game of games){
 if(typeof game.name!=='string'||(game.id&&!/^[1-9][0-9]{0,9}$/.test(String(game.id))))continue;
 const row=node('div',undefined,'game-result-row'),button=node('button',undefined,'game-result-choice');button.type='button';
 button.append(node('span','♟','game-result-cover'));
 const info=node('span',undefined,'game-result-info');info.append(node('strong',game.name),node('small',[game.year,game.id?'#'+game.id:'',game.source||'BGG'].filter(Boolean).join(' · ')));button.append(info);
 button.onclick=()=>{searchController?.abort();clearTimeout(searchTimer);searchSerial++;$('searchBgg').disabled=false;$('playGame').value=game.name;$('playBggId').value=String(game.id||'');$('selectedGameInfo').textContent='선택됨: '+game.name+(game.id?' · BGG #'+game.id:'');box.replaceChildren();$('playError').textContent='';$('gameSearchStatus').textContent='선택한 게임으로 현재 이름과 점수를 저장합니다.';rememberGame();};
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
function renderRecordSelf(container,play){const context={key:key(),epoch:accountEpoch},select=node('select'),label=node('label','이 경기에서 나는'),button=node('button','내 플레이어 지정','secondary'),feedback=node('p');select.setAttribute('aria-label','저장된 경기의 내 플레이어');fillSelfSelect(select,play.players,key());label.append(select);button.type='button';button.onclick=()=>{try{window.ScoreRecords.assignSelf(play.id,select.value,context);}catch(error){feedback.textContent=error.message;}};container.replaceChildren(label,button,feedback);}
function renderHistory(){const groups=gameStats(records),select=$('recordFilter'),selected=select.value;select.replaceChildren(node('option','모든 게임'));select.firstChild.value='';for(const g of groups){const o=node('option',`${g.game.name} (${g.count}회)`);o.value=g.key;select.append(o);}if(groups.some(g=>g.key===selected))select.value=selected;
const filtered=records.filter(p=>!select.value||gameKey(p.game)===select.value).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));renderStatsDashboard($('statsInsights'),filtered,today(),id=>{$('statsDetails').open=true;mode='history';renderHistory();document.getElementById('record-'+id)?.scrollIntoView?.({behavior:'smooth',block:'center'});},Boolean(select.value),{scope:key(),allRecords:records,onIdentityChange:()=>window.dispatchEvent?.(new Event('score-identity:changed'))});$('statsDetailCount').textContent=`${filtered.length}개 기록`;const box=$('recordList');box.replaceChildren();$('historyTab').classList.toggle('active',mode==='history');$('statsTab').classList.toggle('active',mode==='stats');
if(!filtered.length){box.append(node('p','저장된 기록이 없습니다. 점수를 입력한 뒤 게임 기록 저장을 눌러주세요.','record-note'));return;}
if(mode==='stats'){for(const g of gameStats(filtered)){const article=node('article',undefined,'record-item');article.append(node('h3',g.game.name),node('p',`${g.count}회 플레이 · 경쟁 ${g.competitive}회 · 협력 ${g.cooperative}회`));const wrap=node('div',undefined,'record-table-wrap'),table=node('table',undefined,'record-table'),head=node('thead'),row=node('tr');for(const label of ['플레이어','횟수','승리','승률','평균','최고','최저'])row.append(node('th',label));head.append(row);table.append(head);const body=node('tbody');for(const p of g.players){const tr=node('tr');for(const v of [p.name,p.count,p.wins,p.winRate===null?'—':`${Math.round(p.winRate*100)}%`,p.average===null?'—':p.average.toLocaleString('ko-KR',{maximumFractionDigits:1}),p.highest??'—',p.lowest??'—'])tr.append(node('td',String(v)));body.append(tr);}table.append(body);wrap.append(table);article.append(wrap,node('p','직접 기록한 동점은 공동 승리로, 가져온 기록은 원본 승자로 집계합니다. 승률은 승자가 확인된 경쟁 경기만 기준으로 하며 내 플레이어로 지정한 기록은 나로 합산하며, 그 외에는 같은 이름을 같은 플레이어로 집계합니다.'));box.append(article);}return;}
for(const p of filtered){const article=node('article',undefined,'record-item');article.id='record-'+p.id;article.append(node('h3',p.game.name),node('p',`${p.date} · ${p.id.startsWith('bgstats:')?(p.rule==='cooperative'?'BG Stats · 협력 게임':'BG Stats · 원본 승자 기준'):(p.rule==='highest'?'높은 점수 승리':p.rule==='lowest'?'낮은 점수 승리':'협력 게임')}${currentUser&&pending.has(p.id)?' · 저장 대기':''}`));const wins=winnerIds(p),list=node('ul');for(const person of [...p.players].sort((a,b)=>p.rule==='lowest'?a.score-b.score:b.score-a.score))list.append(node('li',`${person.name} · ${person.score===null?'점수 없음':person.score.toLocaleString('ko-KR')+'점'}${wins.includes(person.id)?' · 승리':''}`));article.append(list);const analysis=node('details',undefined,'record-analysis'),analysisBody=node('div');analysis.append(node('summary','내 경기 분석'),analysisBody);analysis.ontoggle=()=>{if(analysis.open)renderMatchInsight(analysisBody,records,p,readIdentity(key()));};article.append(analysis);const selfEditor=node('details',undefined,'record-self-editor'),selfBody=node('div');selfEditor.append(node('summary','이 경기에서 내 플레이어 지정'),selfBody);selfEditor.ontoggle=()=>{if(selfEditor.open)renderRecordSelf(selfBody,p);};article.append(selfEditor);const actions=node('div',undefined,'record-actions'),restore=node('button','점수 불러오기','secondary'),remove=node('button','기록 삭제','record-danger');restore.type=remove.type='button';restore.disabled=p.players.some(person=>!Number.isSafeInteger(person.score));if(restore.disabled)restore.title='점수가 없거나 소수인 기록은 현재 점수판에 불러올 수 없습니다.';restore.onclick=()=>api.confirm('점수 불러오기','현재 플레이어와 점수를 이 기록으로 바꿀까요?',()=>{api.restorePlayers(p.players.map(person=>({...person,selfScope:key()})));location.hash='home';notify('기록의 플레이어와 점수를 불러왔습니다.');});remove.onclick=()=>api.confirm('기록 삭제',`${p.game.name}의 ${p.date} 기록을 삭제할까요?`,async()=>{remove.disabled=true;const epoch=accountEpoch;try{if(currentUser)await deleteCloud(p.id,currentUser.uid);if(epoch!==accountEpoch)return;const old=records,oldPending=new Set(pending);records=records.filter(r=>r.id!==p.id);pending.delete(p.id);try{persist();}catch(e){records=old;pending=oldPending;throw e;}renderHistory();updateButtons();notify('기록을 삭제했습니다.');}catch(error){notify('기록을 삭제하지 못했습니다. '+friendly(error));remove.disabled=false;}});actions.append(restore,remove);article.append(actions);box.append(article);}}
$('recordFilter').onchange=renderHistory;$('historyTab').onclick=()=>{mode='history';renderHistory();};$('statsTab').onclick=()=>{mode='stats';renderHistory();};
$('savePlay').onclick=openSave;
async function sync(){if(!currentUser||syncing)return;syncing=true;const uid=currentUser.uid,epoch=accountEpoch;try{while(pending.size){const id=[...pending][0];if(epoch!==accountEpoch)return;const play=records.find(p=>p.id===id);if(play)await saveCloud(play,uid);if(epoch!==accountEpoch)return;if(records.find(p=>p.id===id)!==play)continue;pending.delete(id);persist();}notify('기록을 클라우드에 저장했습니다.');}catch(error){if(epoch===accountEpoch)notify('클라우드 저장 대기 중입니다. '+friendly(error));}finally{syncing=false;updateButtons();}}
async function refreshCloud(){if(!currentUser)return;const uid=currentUser.uid,epoch=accountEpoch;try{const remote=(await loadCloud(uid)).filter(isPlay);if(epoch!==accountEpoch)return;const map=new Map(remote.map(p=>[p.id,p]));for(const p of records)if(pending.has(p.id))map.set(p.id,p);records=[...map.values()];persist();await sync();if(epoch===accountEpoch)renderHistory();}catch(error){if(epoch===accountEpoch)notify('클라우드 기록을 불러오지 못했습니다. 기기 기록은 유지됩니다. '+friendly(error));}updateButtons();}
$('accountLogin').onclick=async()=>{const button=$('accountLogin');button.disabled=true;$('accountError').textContent='';try{if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 잠시 후 다시 시도해주세요.');await login();}catch(e){message('accountError',friendly(e));}finally{button.disabled=false;}};
$('accountLogout').onclick=async()=>{try{await logout();$('accountError').textContent='';notify('로그아웃했습니다.');}catch(e){message('accountError',friendly(e));}};
$('cloudSync').onclick=refreshCloud;
$('guestUpload').onclick=()=>api.confirm('기기 기록을 계정에 저장','비로그인 상태에서 저장한 이 기기의 기록을 현재 계정에 복사할까요?',async()=>{const guest=read(guestKey).records;const old=records,oldPending=new Set(pending);try{const known=new Set(records.map(p=>p.id));for(const p of guest)if(!known.has(p.id)){records.push(p);pending.add(p.id);}persist();updateButtons();await sync();renderHistory();}catch(e){records=old;pending=oldPending;message('accountError',e);}});
window.ScoreRecords={
 renderHistory,
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
if(cloudConfigured())connectCloud(async user=>{accountEpoch++;searchSerial++;searchController?.abort();clearTimeout(searchTimer);currentUser=user;if(!user){close('savePlayDialog');}loadLocal();updateButtons();renderHistory();if(user)await refreshCloud();}).catch(error=>notify('로그인 서비스를 연결하지 못했습니다. '+friendly(error)));
