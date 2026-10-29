import './records.js?v=217';
import {connectCloud,cloudConfigured} from './cloud-records.js?v=174';
import {bggLinkRequest} from './bgg-link-client.js?v=71';
import {planBggExport,sendBggExport} from './bgg-export.js?v=100';
import {bgStatsLinks,bgStatsDuplicates,orphanPlayLinks} from './bgstats-link.js?v=5';
const $=id=>document.getElementById(id),api=window.ScoreRecords;
let user=null,epoch=0,busy=false,state={ready:false,connected:false,uploads:{}};const posting=new Set();
const snapshot=()=>({...state,uploads:{...(state.uploads||{})}});
// 일괄 내보내기 중에는 기록마다 화면 전체를 다시 그리지 않고 끝날 때 한 번만 그립니다.
let quiet=false;
function notify(){if(quiet)return;window.dispatchEvent(new Event('score-bgg:changed'));if(location.hash==='#stats')api.renderHistory();}
function render(){
 const connected=Boolean(user&&state.connected);$('bggAccountSection').setAttribute('data-connected',String(connected));
 $('bggLinkedStatus').setAttribute('aria-busy',String(busy));$('bggLinkLogin').disabled=!user||busy||!state.ready;$('bggLinkLogin').textContent=connected?'계정 변경':'BGG 로그인';$('bggLinkLogout').hidden=!connected;$('bggLinkLogout').disabled=busy;
 $('bggSyncActions').hidden=!connected;$('bggImport').hidden=!connected;$('bggImport').disabled=busy;$('bggExport').hidden=!connected;$('bggExport').disabled=busy;
 $('bggLinkSetup').hidden=!user||state.ready||busy;
 if(connected)$('bggLinkedStatus').textContent=state.username+' · 연결됨';else if(!busy)$('bggLinkedStatus').textContent='BGG에 로그인하면 BGG에 등록된 내 정보를 가져오거나 플레이 기록을 내보낼 수 있습니다.';
}
async function refresh({silent=false}={}){const owner=user?.uid,version=epoch;if(!owner)return;busy=true;if(!silent)$('bggLinkMessage').textContent='';$('bggLinkedStatus').textContent='BGG 연결 확인 중…';render();try{const result=await bggLinkRequest('link-status',{uid:owner});if(version!==epoch)return;state={...result,uploads:result.uploads||{}};if(state.connected)$('bggUsername').value=state.username;notify();}catch(error){if(version===epoch){state={ready:false,connected:false,uploads:{}};$('bggLinkMessage').textContent=error.message;notify();}}finally{if(version===epoch){busy=false;render();}}}
function closeLogin(){$('bggLoginPassword').value='';$('bggLoginDialog').close();}
$('bggLinkLogin').onclick=()=>{if(!state.ready||!user||busy)return;$('bggLoginUsername').value=state.username||$('bggUsername').value||'';$('bggLoginPassword').value='';$('bggLoginError').textContent='';$('bggLoginDialog').showModal();($( 'bggLoginUsername').value?$('bggLoginPassword'):$('bggLoginUsername')).focus();};
window.addEventListener('pagehide',closeLogin);window.addEventListener('hashchange',()=>{if(location.hash!=='#settings')closeLogin();});
$('bggLoginClose').onclick=closeLogin;$('bggLoginDialog').addEventListener('close',()=>{$('bggLoginPassword').value='';});
$('bggLoginForm').onsubmit=async event=>{event.preventDefault();if(!user||busy||!state.ready)return;const owner=user.uid,version=epoch,credentials={username:$('bggLoginUsername').value.trim(),password:$('bggLoginPassword').value};$('bggLoginPassword').value='';if(!credentials.username||!credentials.password){$('bggLoginError').textContent='사용자명과 비밀번호를 입력해주세요.';return;}busy=true;$('bggLoginSubmit').disabled=true;$('bggLoginSubmit').setAttribute('aria-busy','true');render();try{const result=await bggLinkRequest('link-login',{uid:owner,body:credentials});if(version!==epoch)return;if(!result.connected)throw Error('BGG 로그인 상태를 확인하지 못했습니다.');state={...result,uploads:result.uploads||{}};$('bggUsername').value=result.username;closeLogin();window.dispatchEvent(new CustomEvent('score-bgg:linked',{detail:{username:result.username}}));$('bggLinkMessage').textContent='BGG에 연결했습니다. 내 정보 가져오기를 눌러주세요.';notify();}catch(error){if(version===epoch)$('bggLoginError').textContent=error.message;}finally{credentials.password='';if(version===epoch){busy=false;$('bggLoginSubmit').disabled=false;$('bggLoginSubmit').setAttribute('aria-busy','false');render();if(state.connected)void refresh({silent:true});}}};
$('bggLinkLogout').onclick=async()=>{if(!user||busy)return;const owner=user.uid,version=epoch;busy=true;render();try{await bggLinkRequest('link-logout',{uid:owner,body:{}});if(version!==epoch)return;state={ready:true,connected:false,uploads:{}};$('bggLinkMessage').textContent='이 앱의 BGG 연결을 해제했습니다.';notify();}catch(error){if(version===epoch)$('bggLinkMessage').textContent=error.message;}finally{if(version===epoch){busy=false;render();}}};
async function postPlay(play,context){
 if(!user||!state.connected)throw Error('설정에서 BGG에 먼저 로그인해주세요.');const owner=user.uid,version=epoch,key=owner+':'+play.id,expectedUsername=state.username;if(posting.has(key))return;
 const now=api.scope();if(now.key!==context.key||now.epoch!==context.epoch)throw Error('계정이 변경됐습니다. 다시 선택해주세요.');
 posting.add(key);notify();try{let result;try{const mapped=Boolean(state.uploads?.[play.id]?.bggPlayId),adoptPlayId=mapped?'':adoptPlays.get(play.id)||'';result=await bggLinkRequest('link-post',{uid:owner,body:{play,expectedUsername,update:mapped||Boolean(adoptPlayId),...(adoptPlayId?{adoptPlayId}:{}),...(mapped&&verifyPlays.has(play.id)?{verify:true}:{})}});}catch(error){if(error.code!=='BGG_PLAY_GONE')throw error;
  // BGG에서 지워진 플레이를 업데이트하려던 경우: 연결을 비우고 새 플레이로 한 번 다시 올린다.
  const next={...state.uploads};delete next[play.id];state.uploads=next;result=await bggLinkRequest('link-post',{uid:owner,body:{play,expectedUsername,update:false}});}if(version!==epoch)return;state.uploads={...state.uploads,[play.id]:result};notify();return result;}catch(error){if(version===epoch&&error.code==='BGG_POST_UNCERTAIN'){state.uploads={...state.uploads,[play.id]:{...state.uploads?.[play.id],status:'unknown'}};notify();}if(version===epoch&&['BGG_LOGIN_REQUIRED','BGG_ACCOUNT_CHANGED'].includes(error.code)){state.connected=false;render();notify();}throw error;}finally{posting.delete(key);if(version===epoch)notify();}
}
// BGG에 보낸 기록이 있는 게임 중 가져온 BGG 컬렉션에서 아직 하고 싶은 게임인 것을 BGG에서 해제합니다(한 번에 최대 20개).
async function clearPlayedWantToPlay(context,only){
 const account=window.ScoreBggAccount,collection=account?.state().collection||[],sent=new Set(api.bggRecords().filter(p=>state.uploads?.[p.id]?.status==='sent'&&p.game?.bggId).map(p=>String(p.game.bggId)));
 const targets=collection.filter(item=>item.wantToPlay&&sent.has(item.id)&&(!only||only.includes(item.id))).map(item=>item.id).slice(0,20);
 if(!targets.length||!user||!state.connected)return null;const owner=user.uid,version=epoch;
 const result=await bggLinkRequest('link-clear-want',{uid:owner,body:{expectedUsername:state.username,bggIds:targets}});
 const now=api.context();if(version!==epoch||now.key!==context.key||now.epoch!==context.epoch)return null;
 if(result.cleared?.length)account?.clearWantToPlay?.(result.cleared);return result;
}
const clearText=result=>!result?'':result.unavailable?'BGG가 컬렉션을 준비 중이라 하고 싶은 게임 해제는 다음 내보내기 때 다시 시도합니다':[result.cleared?.length?`BGG 하고 싶은 게임에서 ${result.cleared.length}개 해제`:'',result.failed?.length?`하고 싶은 게임 해제 실패 ${result.failed.length}개`:''].filter(Boolean).join(' · ');
async function clearAfterExport(context){try{return clearText(await clearPlayedWantToPlay(context));}catch{return '하고 싶은 게임 해제를 확인하지 못했습니다';}}
$('bggExport').onclick=async()=>{
 if(!user||!state.connected||busy)return;const context=api.context(),version=epoch;busy=true;render();let plan;
 let duplicates=[];try{const records=api.bggRecords(),remote=window.ScoreBggAccount?.state()||{},plays=remote.plays||[],links=bgStatsLinks(records,plays);duplicates=bgStatsDuplicates(records,links,plays,state.uploads);const dupIds=new Set(duplicates.map(d=>d.recordId)),kept=records.filter(r=>!dupIds.has(r.id));plan=await planBggExport(kept,state.uploads,20,state.username,orphanPlayLinks(kept,plays,state.uploads,links),{plays,fullAt:plays.some(p=>String(p?.username||'').toLowerCase()===String(state.username||'').toLowerCase())?remote.playsFullAt:0});}catch{$('bggLinkMessage').textContent='내보낼 기록을 확인하지 못했습니다. 다시 시도해주세요.';}finally{if(version===epoch){busy=false;render();}}
 if(!plan||version!==epoch||!user||!state.connected)return;const excluded=[];
 if(plan.already)excluded.push(`변경 없음 ${plan.already}개`);if(plan.fromBgStats)excluded.push(`BG Stats가 이미 BGG에 올림 ${plan.fromBgStats}개`);adoptPlays=plan.adopt||new Map();verifyPlays=plan.verify||new Set();if(plan.scoreGame)excluded.push(`Score 자체 게임 ${plan.scoreGame}개`);if(plan.missingGame)excluded.push(`BGG 게임 정보 없음 ${plan.missingGame}개`);
 if(!plan.records.length&&!duplicates.length){$('bggLinkMessage').textContent=plan.total?`내보낼 새 기록이나 수정된 기록이 없습니다.${excluded.length?' '+excluded.join(' · '):''}`:'Score에 저장된 기록이 없습니다.';const message=$('bggLinkMessage').textContent;busy=true;render();const cleared=plan.total?await clearAfterExport(context):'',edited=await sendCollectionEdits(context).catch(()=>'컬렉션 반영을 확인하지 못했습니다');busy=false;render();if(version===epoch){$('bggLinkMessage').textContent=[message,cleared,edited].filter(Boolean).join(' ');if(cleared||edited)window.ScoreBggAccount?.expectUpdates?.();}return;}
 const review=plan.needsReview?` 이전 전송 결과가 불확실한 ${plan.needsReview}개는 BGG 등록 여부를 먼저 확인합니다.`:'';
 const suffix=excluded.length?' '+excluded.join(' · ')+'는 제외됩니다.':'',adoptText=(plan.adopting?` 이번 ${plan.records.length}개 중 ${plan.adopting}개는 BGG에 이미 있는 같은 경기를 새로 올리지 않고 Score 기록 내용(원래 장소 포함)으로 업데이트합니다.`:'')+(plan.missing?` BGG에서 지워진 것으로 보이는 ${plan.missing}개는 BGG에서 다시 확인한 뒤 없으면 새로 올립니다.`:''),dupText=duplicates.length?` BG Stats 원본이 BGG에 있는데 Score가 다시 올린 중복 ${duplicates.length}개는 BGG에서 삭제합니다.`:'';window.ScoreCounter.confirm('BGG로 기록 내보내기',`${plan.remaining?`Score의 신규·수정 기록 ${plan.records.length+plan.remaining}개 중 ${plan.records.length}개를 이번에 BGG에 반영할까요? 한 번에 20개씩 보내므로 나머지 ${plan.remaining}개는 다시 누르면 보냅니다.`:`Score의 신규·수정 기록 ${plan.records.length}개를 BGG에 반영할까요?`}${adoptText}${dupText}${review}${suffix}`,async()=>{
  if(!user||!state.connected||busy)return;busy=true;render();$('bggExport').setAttribute('aria-busy','true');let result={sent:0,unchanged:0,failed:0,lastError:''};
  let cleared='',edited='',removed={deleted:0,failed:0};quiet=true;try{if(duplicates.length)removed=await deleteDuplicates(duplicates,context);result=await sendBggExport(plan.records,play=>rateLimited(()=>postPlay(play,context)),(current,total)=>{$('bggLinkMessage').textContent=`BGG로 기록 내보내는 중 · ${current}/${total}`;});$('bggLinkMessage').textContent='BGG 하고 싶은 게임 확인 중…';cleared=await clearAfterExport(context);edited=await sendCollectionEdits(context).catch(()=>'컬렉션 반영을 확인하지 못했습니다');}
  finally{quiet=false;notify();busy=false;$('bggExport').setAttribute('aria-busy','false');render();const done=result.sent+result.unchanged,left=plan.remaining+plan.records.length-done,parts=[`BGG 기록 내보내기 완료 · ${result.sent}개`];if(removed.deleted)parts.push(`중복 삭제 ${removed.deleted}개`);if(removed.failed)parts.push(`중복 삭제 실패 ${removed.failed}개`);if(result.unchanged)parts.push(`이미 등록된 동일 기록 ${result.unchanged}개`);if(cleared)parts.push(cleared);if(edited)parts.push(edited);if(result.failed)parts.push(`실패 ${result.failed}개`);if(left)parts.push(`미전송 기록 ${left}개`);$('bggLinkMessage').textContent=parts.join(' · ')+(result.lastError?' · '+result.lastError:'')+(result.sent||cleared||edited?' BGG가 자료를 새로 만든 뒤 내 정보 가져오기에 반영되며, 반영되면 이 화면에 새 정보 알림이 표시됩니다.':'');if(result.sent||cleared||edited||removed.deleted)window.ScoreBggAccount?.expectUpdates?.();}
 });
};
// 이번 내보내기에서 BGG에 이미 있는 같은 경기를 업데이트할 기록(기록 ID → BGG 플레이 번호)과, BGG에서 지워졌는지 워커가 다시 확인할 기록.
let adoptPlays=new Map(),verifyPlays=new Set();
// 워커는 계정당 1분에 30회까지 받는다. 요청 제한에 걸리면 1분 기다렸다가 같은 요청을 다시 보낸다(최대 3번).
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function rateLimited(run){for(let attempt=0;;attempt++){try{return await run();}catch(error){if(error.code!=='BGG_LOGIN_RATE_LIMIT'||attempt>=3)throw error;$('bggLinkMessage').textContent='BGG 요청이 많아 1분 기다린 뒤 이어서 진행합니다…';await wait(61000);}}}
// BG Stats 원본이 있는 Score 중복 업로드를 BGG에서 지운다(이 앱이 올린 플레이만, 하나씩 2초 간격).
async function deleteDuplicates(list,context){let deleted=0,failed=0;const owner=user.uid,version=epoch,expectedUsername=state.username;for(const [index,item]of list.entries()){$('bggLinkMessage').textContent=`BG Stats 중복 삭제 중 · ${index+1}/${list.length}`;const now=api.scope();if(now.key!==context.key||now.epoch!==context.epoch||version!==epoch)break;if(index)await wait(2100);try{await rateLimited(()=>bggLinkRequest('link-delete-play',{uid:owner,body:{playId:item.playId,recordId:item.recordId,date:item.date,expectedUsername}}));const next={...state.uploads};delete next[item.recordId];state.uploads=next;deleted++;}catch(error){failed++;if(['BGG_LOGIN_REQUIRED','BGG_ACCOUNT_CHANGED','BGG_LOGIN_RATE_LIMIT'].includes(error.code))break;}}notify();return {deleted,failed};}
// 기록 내보내기 때 게임별 통계의 컬렉션 관리 메뉴에서 바꾼 대기 변경(보유·하고 싶은·위시리스트·펀딩)을 BGG 컬렉션에 반영합니다(한 번에 최대 20개).
async function sendCollectionEdits(context){
 const account=window.ScoreBggAccount,edits=account?.collectionEdits?.()||{},ids=Object.keys(edits).filter(id=>/^[1-9][0-9]{0,9}$/.test(id)).slice(0,20);if(!ids.length||!user||!state.connected)return '';
 const owner=user.uid,version=epoch,done=[];let failed=0,lastError='';
 for(const [index,id] of ids.entries()){$('bggLinkMessage').textContent=`BGG 컬렉션 반영 중 · ${index+1}/${ids.length}`;const {owned,wantToPlay,wishlist,preordered}=edits[id];
  try{await bggLinkRequest('link-collection',{uid:owner,body:{expectedUsername:state.username,bggId:id,status:{owned:owned===true,wantToPlay:wantToPlay===true,wishlist:wishlist===true,preordered:preordered===true}}});done.push(id);}
  catch(error){failed++;lastError=error.message||'';if(['BGG_LOGIN_REQUIRED','BGG_ACCOUNT_CHANGED'].includes(error.code)){if(version===epoch){state.connected=false;render();}break;}}
  const now=api.context();if(version!==epoch||now.key!==context.key||now.epoch!==context.epoch)return '';
 }
 account.clearCollectionEdits?.(done,edits);
 return [done.length?`BGG 컬렉션 반영 ${done.length}개`:'',failed?`컬렉션 반영 실패 ${failed}개${lastError?' ('+lastError+')':''}`:''].filter(Boolean).join(' · ');
}
window.ScoreBggLink={state:snapshot,isPosting:id=>posting.has(user?.uid+':'+id),postPlay,clearWantToPlay:(context,ids)=>clearPlayedWantToPlay(context,ids).then(clearText)};
render();
if(cloudConfigured())connectCloud(async next=>{epoch++;user=next;busy=false;state={ready:false,connected:false,uploads:{}};closeLogin();$('bggLoginSubmit').disabled=false;$('bggLoginSubmit').setAttribute('aria-busy','false');$('bggLinkMessage').textContent='';render();notify();if(user)await refresh();}).catch(()=>{$('bggLinkMessage').textContent='Google 로그인 상태를 확인하지 못했습니다.';});
