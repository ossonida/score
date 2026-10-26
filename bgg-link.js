import './records.js?v=169';
import {connectCloud,cloudConfigured} from './cloud-records.js?v=166';
import {bggLinkRequest} from './bgg-link-client.js?v=66';
import {planBggExport,sendBggExport} from './bgg-export.js?v=97';
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
 const now=api.context();if(now.key!==context.key||now.epoch!==context.epoch)throw Error('계정이 변경됐습니다. 다시 선택해주세요.');
 posting.add(key);notify();try{const result=await bggLinkRequest('link-post',{uid:owner,body:{play,expectedUsername,update:Boolean(state.uploads?.[play.id]?.bggPlayId)}});if(version!==epoch)return;state.uploads={...state.uploads,[play.id]:result};notify();return result;}catch(error){if(version===epoch&&error.code==='BGG_POST_UNCERTAIN'){state.uploads={...state.uploads,[play.id]:{...state.uploads?.[play.id],status:'unknown'}};notify();}if(version===epoch&&['BGG_LOGIN_REQUIRED','BGG_ACCOUNT_CHANGED'].includes(error.code)){state.connected=false;render();notify();}throw error;}finally{posting.delete(key);if(version===epoch)notify();}
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
 try{plan=await planBggExport(api.bggRecords(),state.uploads,20,state.username);}catch{$('bggLinkMessage').textContent='내보낼 기록을 확인하지 못했습니다. 다시 시도해주세요.';}finally{if(version===epoch){busy=false;render();}}
 if(!plan||version!==epoch||!user||!state.connected)return;const excluded=[];
 if(plan.already)excluded.push(`변경 없음 ${plan.already}개`);if(plan.scoreGame)excluded.push(`Score 자체 게임 ${plan.scoreGame}개`);if(plan.missingGame)excluded.push(`BGG 게임 정보 없음 ${plan.missingGame}개`);
 if(!plan.records.length){$('bggLinkMessage').textContent=plan.total?`내보낼 새 기록이나 수정된 기록이 없습니다.${excluded.length?' '+excluded.join(' · '):''}`:'Score에 저장된 기록이 없습니다.';if(plan.total){busy=true;render();const cleared=await clearAfterExport(context);busy=false;render();if(cleared&&version===epoch)$('bggLinkMessage').textContent+=' '+cleared;}return;}
 const review=plan.needsReview?` 이전 전송 결과가 불확실한 ${plan.needsReview}개는 BGG 등록 여부를 먼저 확인합니다.`:'';
 const suffix=excluded.length?' '+excluded.join(' · ')+'는 제외됩니다.':'';window.ScoreCounter.confirm('BGG로 기록 내보내기',`Score의 신규·수정 기록 ${plan.records.length}개를 BGG에 반영할까요? 한 번에 최대 20개를 전송합니다.${review}${suffix}`,async()=>{
  if(!user||!state.connected||busy)return;busy=true;render();$('bggExport').setAttribute('aria-busy','true');let result={sent:0,unchanged:0,failed:0,lastError:''};
  let cleared='';quiet=true;try{result=await sendBggExport(plan.records,play=>postPlay(play,context),(current,total)=>{$('bggLinkMessage').textContent=`BGG로 기록 내보내는 중 · ${current}/${total}`;});$('bggLinkMessage').textContent='BGG 하고 싶은 게임 확인 중…';cleared=await clearAfterExport(context);}
  finally{quiet=false;notify();busy=false;$('bggExport').setAttribute('aria-busy','false');render();const done=result.sent+result.unchanged,left=plan.remaining+plan.records.length-done,parts=[`BGG 기록 내보내기 완료 · ${result.sent}개`];if(result.unchanged)parts.push(`이미 등록된 동일 기록 ${result.unchanged}개`);if(cleared)parts.push(cleared);if(result.failed)parts.push(`실패 ${result.failed}개`);if(left)parts.push(`미전송 기록 ${left}개`);$('bggLinkMessage').textContent=parts.join(' · ')+(result.lastError?' · '+result.lastError:'')+(result.sent||cleared?' BGG가 자료를 새로 만든 뒤 내 정보 가져오기에 반영되며, 반영되면 이 화면에 새 정보 알림이 표시됩니다.':'');if(result.sent||cleared)window.ScoreBggAccount?.expectUpdates?.();}
 });
};
window.ScoreBggLink={state:snapshot,isPosting:id=>posting.has(user?.uid+':'+id),postPlay,clearWantToPlay:(context,ids)=>clearPlayedWantToPlay(context,ids).then(clearText)};
render();
if(cloudConfigured())connectCloud(async next=>{epoch++;user=next;busy=false;state={ready:false,connected:false,uploads:{}};closeLogin();$('bggLoginSubmit').disabled=false;$('bggLoginSubmit').setAttribute('aria-busy','false');$('bggLinkMessage').textContent='';render();notify();if(user)await refresh();}).catch(()=>{$('bggLinkMessage').textContent='Google 로그인 상태를 확인하지 못했습니다.';});
