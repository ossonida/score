import {cloudConfigured,connectCloud} from './cloud-records.js?v=166';
import {createAnalyticsGate} from './analytics-policy.js?v=154';
import {createFeatureAnalytics} from './analytics-events.js?v=117';
// Keep the site's existing GA property; never pass email, email hashes or Firebase UID to GA.
const measurementId='G-NFEYJ27K5H',disableKey='ga-disable-'+measurementId;
window[disableKey]=true;
const analytics=createFeatureAnalytics({
 storage:sessionStorage,
 // 전송은 화면 전환이 끝난 뒤 한가할 때 한다.
 send:(name,params)=>{if(window[disableKey]||typeof window.gtag!=='function')return;(window.requestIdleCallback||setTimeout)(()=>window.gtag('event',name,params),{timeout:2000});}
});
window.ScoreAnalytics=analytics;

function activeMode(){const mode=window.ScoreCounter?.getResultEntry?.()?.mode;return mode==='coop'?'cooperative':mode||'score';}
function currentRecords(){try{return window.ScoreRecords?.context?.().records||null;}catch{return null;}}
function recordStamp(play){return JSON.stringify({rule:play.rule,cooperativeResult:play.cooperativeResult,sharedScore:play.sharedScore,players:play.players?.map(person=>({id:person.id,name:person.name,score:person.score,winner:person.winner,draw:person.draw,rank:person.rank}))});}
function installFeatureListeners(){
 let lastSession;try{lastSession=JSON.parse(localStorage.getItem('score.activeGame.v1')||'null')?.recordId||'';}catch{lastSession='';}
 const board=()=>({players:window.ScoreCounter?.getPlayers?.()||[],entry:window.ScoreCounter?.getResultEntry?.()||null});
 let boardBefore=board(),records=null,pendingBoard=null,pendingEnd=false,pendingAccount='',pendingBgg='',pendingInstall=false,nextPlayerEntry='manual';
 const armBoard=value=>{pendingBoard=value;queueMicrotask(()=>{if(pendingBoard===value)pendingBoard=null;});};
 const currentView=()=>({'#stats':'stats','#games':'games','#settings':'settings'})[location.hash]||'home';
 const navViews={navHome:'home',navStats:'stats',navGames:'games',navSettings:'settings'};
 const onClick=event=>{
  const target=event.target.closest?.('button,a');if(!target||target.disabled)return;const id=target.id;
  // Capture phase runs before the nav handler changes the hash, so re-tapping the current tab is not a view.
  if(navViews[id]){if(navViews[id]!==currentView()){if(id==='navStats')analytics.track('statistics_viewed',{entry_point:'navigation'});else analytics.track('screen_viewed',{screen:navViews[id]});}}
  else if(id==='historyTab')analytics.track('history_viewed',{entry_point:'statistics'});
  else if(id==='statsTab')analytics.track('statistics_viewed',{entry_point:'record'});
  else if(['statsRecent','statsAll','statsGames'].includes(id)&&target.getAttribute('aria-selected')!=='true')analytics.feature('statistics','filter_changed');
  else if(id==='recordModeChange'){analytics.setup('scoreless_setup');analytics.track('feature_used',{feature:'record_mode',action:'mode_selected'});}
  else if(['scorelessCountMinus','scorelessCountPlus','teamCountMinus','teamCountPlus'].includes(id))analytics.setup('scoreless_setup');
  else if(['scorelessSoloWinMode','scorelessTeamWinMode','scorelessRankMode','scorelessCoopMode','startTeamResult'].includes(id))armBoard({type:'mode_start'});
  else if(id==='savePlay'||id==='saveScorelessPlay'){analytics.gameEndStarted(activeMode());pendingEnd=true;}
  else if(id==='endGameHome'){analytics.gameEnded(activeMode(),'discarded');analytics.resetGame();}
  else if(target.matches?.('#cards .step'))armBoard({type:'score',input:'step',direction:target.textContent.includes('−')?'decrease':'increase'});
  else if(id==='add')armBoard({type:'player_add',entry:'random'});
  else if(id==='bulk')nextPlayerEntry='bulk';
  else if(target.closest?.('#singlePlayerChips'))nextPlayerEntry='saved';
  else if(id==='remove'||target.classList.contains('swipe-delete'))pendingBoard={type:'player_remove'};
  else if(id==='reset')pendingBoard={type:'scores_reset'};
  else if(id==='resetPlayers')pendingBoard={type:'players_reset'};
  else if(target.classList.contains('scoreless-result-choice'))armBoard({type:'result_change'});
  else if(id==='accountLogin')pendingAccount='login';
  else if(id==='accountLogout')pendingAccount='logout';
  else if(id==='bggLinkLogin')pendingBgg='link';
  else if(id==='bggLinkLogout')pendingBgg='unlink';
  else if(target.classList.contains('library-row'))analytics.track('statistics_viewed',{entry_point:'game_library'});
  else if(target.classList.contains('library-choice'))queueMicrotask(()=>analytics.track('feature_used',{feature:'game_library',action:'game_added'}));
  else if(id==='installApp')pendingInstall=true;
  else if(target.classList.contains('recent-share-save')||target.classList.contains('recent-share-send'))analytics.track('feature_used',{feature:'statistics',action:'share_completed'});
  else if(target.closest?.('#savePlayDialog')&&target.hasAttribute('data-record-close'))pendingEnd=false;
  else if(target.closest?.('#confirmDialog')&&target.hasAttribute('data-close'))pendingBoard=null;
 };
 document.addEventListener('click',onClick,true);
 // A custom preset only reveals the date form; the applied custom range is recorded by records.js.
 document.addEventListener('change',event=>{const id=event.target?.id;if(id==='recordFilter')analytics.feature('statistics','filter_changed');},true);
 document.getElementById('savePlayDialog')?.addEventListener('input',event=>{if(!event.currentTarget.classList.contains('record-save-dialog'))analytics.setup('game_setup');},true);
 document.getElementById('scorelessSetupDialog')?.addEventListener('input',()=>analytics.setup('scoreless_setup'),true);
 document.addEventListener('input',event=>{if(event.target?.closest?.('.coop-result-controls'))armBoard({type:'result_change'});},true);
 document.getElementById('playerForm')?.addEventListener('submit',()=>{armBoard({type:'player_form',entry:nextPlayerEntry});nextPlayerEntry='manual';},true);
 document.getElementById('bulkForm')?.addEventListener('submit',()=>{armBoard({type:'player_add',entry:nextPlayerEntry});nextPlayerEntry='manual';},true);
 document.getElementById('scoreForm')?.addEventListener('submit',()=>{armBoard({type:'score',input:'direct',direction:document.getElementById('negative')?.classList.contains('active')?'decrease':'increase'});},true);
 document.getElementById('savePlayForm')?.addEventListener('submit',()=>{const dialog=document.getElementById('savePlayDialog');if(dialog?.classList.contains('record-save-dialog'))pendingEnd=true;else analytics.setup('game_setup');},true);
 window.addEventListener('scorecounter:changed',()=>{
  const next=board(),beforePlayers=boardBefore.players,nextPlayers=next.players,beforeById=new Map(beforePlayers.map(player=>[player.id,player])),nextById=new Map(nextPlayers.map(player=>[player.id,player]));
  let session='';try{session=JSON.parse(localStorage.getItem('score.activeGame.v1')||'null')?.recordId||'';}catch{}
  if(session&&session!==lastSession){analytics.playerAdded('game_setup',nextPlayers.length);analytics.gameStarted('score',nextPlayers.length);}
  if(!boardBefore.entry&&next.entry){const mode=next.entry.mode==='coop'?'cooperative':next.entry.mode;analytics.playerAdded('scoreless_setup',nextPlayers.length);analytics.gameStarted(mode,nextPlayers.length);analytics.track('feature_used',{feature:'record_mode',action:'mode_selected'});}
  if(pendingBoard?.type==='score')analytics.scoreChanged(pendingBoard.direction,pendingBoard.input);
  else if(pendingBoard?.type==='player_add'||pendingBoard?.type==='player_form'&&nextPlayers.length>beforePlayers.length)analytics.playerAdded(pendingBoard.entry,nextPlayers.length);
  else if(pendingBoard?.type==='player_form'){
   const changed=nextPlayers.find(player=>{const before=beforeById.get(player.id);return before&&(before.name!==player.name||before.color!==player.color||before.teamId!==player.teamId);});
   if(changed){const before=beforeById.get(changed.id),change_type=before.name!==changed.name?'name':before.color!==changed.color?'color':'team';analytics.track('player_updated',{change_type});}
  }else if(pendingBoard?.type==='player_remove'&&nextPlayers.length<beforePlayers.length)analytics.track('player_removed',{context:boardBefore.entry?'result_board':'scoreboard'});
  else if(pendingBoard?.type==='scores_reset')analytics.track('feature_used',{feature:'scoreboard',action:'scores_reset'});
  else if(pendingBoard?.type==='players_reset'&&nextPlayers.length<beforePlayers.length){analytics.track('feature_used',{feature:'scoreboard',action:'players_reset'});analytics.resetGame();}
  else if(pendingBoard?.type==='result_change')analytics.track('feature_used',{feature:'record_mode',action:'result_changed'});
  else if(boardBefore.entry&&next.entry){const orderChanged=beforePlayers.map(player=>player.id).join('|')!==nextPlayers.map(player=>player.id).join('|'),teamChanged=nextPlayers.some(player=>beforeById.get(player.id)?.teamId!==player.teamId);if(orderChanged||teamChanged)analytics.track('player_reordered',{context:teamChanged?'team':'rank'});}
  pendingBoard=null;lastSession=session;boardBefore=next;
 });
 window.addEventListener('score-records:changed',()=>{
  const next=currentRecords();if(!next)return;if(records===null){records=next;return;}
  const before=new Map(records.map(play=>[play.id,play])),after=new Map(next.map(play=>[play.id,play]));
  const added=next.filter(play=>!before.has(play.id)),changed=next.filter(play=>before.has(play.id)&&recordStamp(before.get(play.id))!==recordStamp(play));
  if(pendingEnd&&(added.length||changed.length)){analytics.gameEnded(activeMode(),'saved');pendingEnd=false;}
  records=next;
 });
 const accountLogin=document.getElementById('accountLogin'),accountLogout=document.getElementById('accountLogout');if(accountLogin&&accountLogout)new MutationObserver(()=>{if(pendingAccount==='login'&&accountLogin.hidden){analytics.track('feature_used',{feature:'account',action:'login_completed'});pendingAccount='';}else if(pendingAccount==='logout'&&accountLogout.hidden){analytics.track('feature_used',{feature:'account',action:'logout_completed'});pendingAccount='';}}).observe(accountLogin.parentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});
 const bgg=document.getElementById('bggAccountSection');if(bgg)new MutationObserver(()=>{const connected=bgg.dataset.connected==='true';if(pendingBgg==='link'&&connected){analytics.track('feature_used',{feature:'bgg',action:'link_completed'});pendingBgg='';}else if(pendingBgg==='unlink'&&!connected){analytics.track('feature_used',{feature:'bgg',action:'unlink_completed'});pendingBgg='';}}).observe(bgg,{attributes:true,attributeFilter:['data-connected']});
 const watchBusy=(id,feature,action)=>{const button=document.getElementById(id);if(!button)return;let armed=false,sawBusy=false;button.addEventListener('click',()=>{armed=true;sawBusy=false;},true);new MutationObserver(()=>{if(!armed)return;const busy=button.getAttribute('aria-busy')==='true';if(busy)sawBusy=true;else if(sawBusy){analytics.track('feature_used',{feature,action});armed=false;sawBusy=false;}}).observe(button,{attributes:true,attributeFilter:['aria-busy']});};
 watchBusy('cloudSync','cloud_sync','sync_completed');watchBusy('librarySearchButton','game_library','search_completed');watchBusy('bggExport','bgg','export_completed');
 window.addEventListener('appinstalled',()=>{if(pendingInstall)analytics.track('feature_used',{feature:'install',action:'install_accepted'});pendingInstall=false;});
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
