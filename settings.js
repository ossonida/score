import {readIdentity} from './personal-stats.js?v=115';
import {renderIdentitySettings} from './personal-dashboard.js?v=157';
import {rememberGameImages} from './game-artwork.js?v=95';
import './records.js?v=158';
import {parseImport,mergeImported,MAX_IMPORT_BYTES} from './data-transfer.js?v=66';
const $=id=>document.getElementById(id),api=window.ScoreRecords;let preview=null,reading=0,busy=false,lastView='';
function status(message){$('transferStatus').textContent=message;}
function contextMatches(context){const now=api.context();return context.key===now.key&&context.epoch===now.epoch;}
function clearPreview(){preview=null;$('importPreview').hidden=true;$('confirmImport').disabled=true;}
function update(){$('transferStatus').setAttribute('aria-busy',String(busy));const context=api.context();renderSelf(context);$('settingsRecordCount').textContent=`저장된 게임 기록 ${context.records.length.toLocaleString('ko-KR')}개`;$('importData').disabled=busy;if(preview&&!contextMatches(preview.context)){reading++;clearPreview();status('계정이 변경됐습니다. 파일을 다시 선택해주세요.');}}
function route(){const view=location.hash==='#games'?'games':location.hash==='#settings'?'settings':location.hash==='#stats'?'stats':'home';
 if(view!==lastView){$('accountStatus').textContent='';$('statsStatus').textContent='';lastView=view;}
 for(const [name,id] of [['home','homeScreen'],['stats','statsScreen'],['games','gamesScreen'],['settings','settingsScreen']])$(id).hidden=view!==name;
 delete document.documentElement.dataset.initialView;
 document.documentElement.classList.toggle('settings-view',view==='settings');document.documentElement.classList.toggle('stats-view',view==='stats');
 for(const [name,id] of [['home','navHome'],['stats','navStats'],['games','navGames'],['settings','navSettings']])$(id).setAttribute('aria-current',view===name?'page':'false');
 if(view==='settings')update();if(view==='stats')api.renderHistory();
}
$('navGames').onclick=()=>{location.hash='games';};$('navHome').onclick=()=>{location.hash='home';};$('navStats').onclick=()=>{location.hash='stats';};$('navSettings').onclick=()=>{location.hash='settings';};window.addEventListener('hashchange',route);window.addEventListener('score-records:changed',update);window.addEventListener('score-identity:changed',update);
$('importData').onclick=()=>{if(!busy)$('importFile').click();};
$('importFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file||busy)return;const serial=++reading,context=api.context();clearPreview();busy=true;update();status('파일을 확인하고 있습니다…');
 try{
  if(file.size>MAX_IMPORT_BYTES)throw Error('20MB 이하의 JSON 파일을 선택해주세요.');
  const result=await parseImport(await file.text());if(serial!==reading)return;
  if(!contextMatches(context))throw Error('계정이 변경됐습니다. 파일을 다시 선택해주세요.');
  const merged=mergeImported(api.context().records,result.records);preview={...result,context};
  $('importSummary').textContent=`${result.format} · 전체 ${result.total}개 중 새 기록 ${merged.added.length}개 · 중복 ${merged.duplicates}개 · 제외 ${result.skipped}개`;
  $('importScope').textContent=result.scope;
  $('importWarnings').replaceChildren(...result.reasons.map(({reason,count})=>{const p=document.createElement('p');p.textContent=`${reason}: ${count}개`;return p;}));
  $('importExamples').replaceChildren(...result.records.slice(0,4).map(p=>{const row=document.createElement('p');row.textContent=`${p.date} · ${p.game.name} · ${p.players.length}명`;return row;}));
  $('importPreview').hidden=false;window.ScoreAnalytics?.feature('data_transfer','import_previewed');$('confirmImport').disabled=!merged.added.length;status(merged.added.length?'미리보기를 확인한 뒤 가져오기를 눌러주세요.':'추가할 새 기록이 없습니다.');
 }catch(error){if(serial===reading){clearPreview();status(error.message||'파일을 읽지 못했습니다.');}}
 finally{busy=false;update();}
});
$('cancelImport').onclick=()=>{reading++;clearPreview();window.ScoreAnalytics?.feature('data_transfer','import_cancelled');status('가져오기를 취소했습니다.');};
$('confirmImport').onclick=()=>{
 if(!preview||busy)return;busy=true;$('confirmImport').disabled=true;
 try{const result=api.merge(preview.records,preview.context);try{rememberGameImages(preview.gameImages);}catch{}window.ScoreAnalytics?.feature('data_transfer','import_completed');clearPreview();api.renderHistory();status(`${result.added}개를 가져왔습니다. 중복 ${result.duplicates}개는 제외했습니다. 진행 중인 점수는 유지됩니다.${api.context().key.endsWith('.guest')?' 이 기기에 저장됐으며, 계정에 옮기려면 로그인 후 내 계정에서 기기 기록 저장을 선택하세요.':' 계정 동기화 상태는 내 계정에서 확인하세요.'}`);}
 catch(error){status(error.message||'가져오지 못했습니다.');}
 finally{busy=false;update();}
};
let identityStamp='';
function identityVersion(context){return JSON.stringify([context.key,context.epoch,readIdentity(context.key),context.records.map(p=>[p.id,p.players.map(x=>[x.name,x.anonymous])])]);}
function renderSelf(context){const stamp=identityVersion(context);if(stamp===identityStamp)return;identityStamp=stamp;renderIdentitySettings($('identityEditor'),context.records,context.key,()=>{window.ScoreAnalytics?.feature('settings','identity_changed');identityStamp=identityVersion(api.context());window.dispatchEvent(new Event('score-identity:changed'));api.renderHistory();});}

update();route();window.ScoreStartup?.ready('route');
