import {cloudConfigured,connectCloud} from './cloud-records.js?v=113';
import {createAnalyticsGate} from './analytics-policy.js?v=64';
import {createFeatureAnalytics} from './analytics-events.js?v=114';
// Keep the site's existing GA property; never pass email, email hashes or Firebase UID to GA.
const measurementId='G-NFEYJ27K5H',disableKey='ga-disable-'+measurementId;
window[disableKey]=true;
const analytics=createFeatureAnalytics({
 storage:sessionStorage,
 send:(name,params)=>{if(window[disableKey]||typeof window.gtag!=='function')return;window.gtag('event',name,params);}
});
window.ScoreAnalytics=analytics;

function activeMode(){const mode=window.ScoreCounter?.getResultEntry?.()?.mode;return mode==='coop'?'cooperative':mode||'score';}
function currentRecords(){try{return window.ScoreRecords?.context?.().records||null;}catch{return null;}}
function recordStamp(play){return JSON.stringify({rule:play.rule,cooperativeResult:play.cooperativeResult,sharedScore:play.sharedScore,players:play.players?.map(person=>({id:person.id,name:person.name,score:person.score,winner:person.winner,draw:person.draw,rank:person.rank}))});}
function installFeatureListeners(){
 let lastSession;try{lastSession=JSON.parse(localStorage.getItem('score.activeGame.v1')||'null')?.recordId||'';}catch{lastSession='';}
 let records=null,pendingRecord='',pendingEnd=false,pendingImport=false,pendingAccount='',pendingBgg='';
 const setPending=(kind)=>{pendingRecord=kind;setTimeout(()=>{if(pendingRecord===kind)pendingRecord='';},30000);};
 const onClick=event=>{
  const target=event.target.closest?.('button,a');if(!target||target.disabled)return;const id=target.id;
  if(id==='navStats')analytics.track('statistics_viewed',{entry_point:'navigation'});
  else if(id==='historyTab')analytics.track('history_viewed',{entry_point:'statistics'});
  else if(id==='statsTab')analytics.track('statistics_viewed',{entry_point:'record'});
  else if(['statsRecent','statsAll','statsGames','recordFilter'].includes(id))analytics.track('feature_used',{feature:'statistics',action:'filter_changed'});
  else if(id==='recordModeChange'){analytics.setup('scoreless_setup');analytics.track('feature_used',{feature:'record_mode',action:'mode_selected'});}
  else if(['scorelessSoloWinMode','scorelessTeamWinMode','scorelessRankMode','scorelessCoopMode'].includes(id))queueMicrotask(()=>{const entry=window.ScoreCounter?.getResultEntry?.();if(!entry)return;const mode=entry.mode==='coop'?'cooperative':entry.mode;analytics.playerAdded('scoreless_setup',entry.players.length);analytics.gameStarted(mode,entry.players.length);analytics.track('feature_used',{feature:'record_mode',action:'mode_selected'});});
  else if(id==='savePlay'||id==='saveScorelessPlay'){analytics.gameEndStarted(activeMode());pendingEnd=true;}
  else if(id==='endGameHome'){analytics.gameEnded(activeMode(),'discarded');analytics.resetGame();}
  else if(id==='recordDeletePlayer')setPending('player_removed');
  else if(target.classList.contains('record-danger')&&target.closest('.record-delete-row'))setPending('delete');
  else if(id==='confirmImport')pendingImport=true;
  else if(id==='cancelImport')analytics.track('feature_used',{feature:'data_transfer',action:'import_cancelled'});
  else if(id==='accountLogin')pendingAccount='login';
  else if(id==='accountLogout')pendingAccount='logout';
  else if(id==='bggLinkLogin')pendingBgg='link';
  else if(id==='bggLinkLogout')pendingBgg='unlink';
  else if(target.classList.contains('library-row'))analytics.track('statistics_viewed',{entry_point:'game_library'});
  else if(target.classList.contains('library-choice'))queueMicrotask(()=>analytics.track('feature_used',{feature:'game_library',action:'game_added'}));
  else if(id==='confirm'&&pendingRecord==='delete'){}
  else if(target.closest?.('#confirmDialog')&&target.hasAttribute('data-close'))pendingRecord='';
 };
 document.addEventListener('click',onClick,true);
 document.addEventListener('change',event=>{if(event.target?.id==='recordFilter')analytics.track('feature_used',{feature:'statistics',action:'filter_changed'});},true);
 document.getElementById('savePlayDialog')?.addEventListener('input',event=>{if(!event.currentTarget.classList.contains('record-save-dialog'))analytics.setup('game_setup');},true);
 document.getElementById('scorelessSetupDialog')?.addEventListener('input',()=>analytics.setup('scoreless_setup'),true);
 document.getElementById('recordEditForm')?.addEventListener('submit',()=>{const title=document.getElementById('recordEditTitle')?.textContent||'',input=document.getElementById('recordEditValue'),result=document.getElementById('recordEditResult');const field=title.includes('공동 점수')?'shared_score':title.includes('협력 결과')?'cooperative_result':result?.hidden===false?'result':input?.inputMode==='decimal'?'score':'name';setPending(field);},true);
 document.getElementById('savePlayForm')?.addEventListener('submit',()=>{const dialog=document.getElementById('savePlayDialog');if(dialog?.classList.contains('record-save-dialog'))pendingEnd=true;else analytics.setup('game_setup');},true);
 window.addEventListener('scorecounter:changed',()=>{let session='';try{session=JSON.parse(localStorage.getItem('score.activeGame.v1')||'null')?.recordId||'';}catch{}if(session&&session!==lastSession){const count=window.ScoreCounter?.getPlayers?.().length||0;analytics.playerAdded('game_setup',count);analytics.gameStarted('score',count);}lastSession=session;});
 window.addEventListener('score-records:changed',()=>{
  const next=currentRecords();if(!next)return;if(records===null){records=next;return;}
  const before=new Map(records.map(play=>[play.id,play])),after=new Map(next.map(play=>[play.id,play]));
  const added=next.filter(play=>!before.has(play.id)),removed=records.filter(play=>!after.has(play.id)),changed=next.filter(play=>before.has(play.id)&&recordStamp(before.get(play.id))!==recordStamp(play));
  if(pendingImport&&added.length){analytics.track('feature_used',{feature:'data_transfer',action:'import_completed'});pendingImport=false;}
  else if(pendingEnd&&added.length){analytics.gameEnded(activeMode(),'saved');pendingEnd=false;}
  if(pendingRecord==='delete'&&removed.length){analytics.track('record_deleted');pendingRecord='';}
  else if(pendingRecord&&changed.length){const type=pendingRecord==='player_removed'?'player_removed':pendingRecord;analytics.track('record_changed',{change_type:type});if(type==='player_removed')analytics.track('player_removed',{context:'record'});pendingRecord='';}
  records=next;
 });
 const preview=document.getElementById('importPreview');if(preview)new MutationObserver(()=>{if(!preview.hidden)analytics.track('feature_used',{feature:'data_transfer',action:'import_previewed'});}).observe(preview,{attributes:true,attributeFilter:['hidden']});
 const accountLogin=document.getElementById('accountLogin'),accountLogout=document.getElementById('accountLogout');if(accountLogin&&accountLogout)new MutationObserver(()=>{if(pendingAccount==='login'&&accountLogin.hidden){analytics.track('feature_used',{feature:'account',action:'login_completed'});pendingAccount='';}else if(pendingAccount==='logout'&&accountLogout.hidden){analytics.track('feature_used',{feature:'account',action:'logout_completed'});pendingAccount='';}}).observe(accountLogin.parentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});
 const bgg=document.getElementById('bggAccountSection');if(bgg)new MutationObserver(()=>{const connected=bgg.dataset.connected==='true';if(pendingBgg==='link'&&connected){analytics.track('feature_used',{feature:'bgg',action:'link_completed'});pendingBgg='';}else if(pendingBgg==='unlink'&&!connected){analytics.track('feature_used',{feature:'bgg',action:'unlink_completed'});pendingBgg='';}}).observe(bgg,{attributes:true,attributeFilter:['data-connected']});
 const watchBusy=(id,feature,action)=>{const button=document.getElementById(id);if(!button)return;let armed=false,sawBusy=false;button.addEventListener('click',()=>{armed=true;sawBusy=false;},true);new MutationObserver(()=>{if(!armed)return;const busy=button.getAttribute('aria-busy')==='true';if(busy)sawBusy=true;else if(sawBusy){analytics.track('feature_used',{feature,action});armed=false;sawBusy=false;}}).observe(button,{attributes:true,attributeFilter:['aria-busy']});};
 watchBusy('cloudSync','cloud_sync','sync_completed');watchBusy('librarySearchButton','game_library','search_completed');watchBusy('bggExport','bgg','export_completed');
}
installFeatureListeners();
const gate=createAnalyticsGate({
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},search:location.search,
 stop:()=>{window[disableKey]=true;},
 start:()=>{
  window[disableKey]=false;window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());window.gtag('config',measurementId);
  const script=document.createElement('script');script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;document.head.append(script);
 }
});
// Wait for restored Firebase auth before loading GA. Auth errors leave collection disabled.
if(cloudConfigured())connectCloud(user=>gate.onAuthState(user)).catch(()=>{window[disableKey]=true;});
else void gate.onAuthState(null);
