import {fillSelfSelect,rememberIdentity} from './player-memory.js?v=28';
import {renderIdentitySettings} from './personal-dashboard.js?v=28';
import {rememberGameImages} from './game-artwork.js?v=28';
import './records.js?v=28';
import {parseImport,mergeImported,MAX_IMPORT_BYTES} from './data-transfer.js?v=28';
const $=id=>document.getElementById(id),api=window.ScoreRecords;let preview=null,reading=0,busy=false,lastView='';
function status(message){$('transferStatus').textContent=message;}
function contextMatches(context){const now=api.context();return context.key===now.key&&context.epoch===now.epoch;}
function clearPreview(){preview=null;$('importPreview').hidden=true;$('confirmImport').disabled=true;}
function update(){const context=api.context();renderSelf(context);$('settingsRecordCount').textContent=`저장된 게임 기록 ${context.records.length.toLocaleString('ko-KR')}개`;$('importData').disabled=busy;if(preview&&!contextMatches(preview.context)){reading++;clearPreview();status('계정이 변경됐습니다. 파일을 다시 선택해주세요.');}}
function route(){const view=location.hash==='#settings'?'settings':location.hash==='#stats'?'stats':'home';
 if(view!==lastView){$('accountStatus').textContent='';$('statsStatus').textContent='';lastView=view;}
 for(const [name,id] of [['home','homeScreen'],['stats','statsScreen'],['settings','settingsScreen']])$(id).hidden=view!==name;
 document.documentElement.classList.toggle('settings-view',view==='settings');document.documentElement.classList.toggle('stats-view',view==='stats');
 for(const [name,id] of [['home','navHome'],['stats','navStats'],['settings','navSettings']])$(id).setAttribute('aria-current',view===name?'page':'false');
 if(view==='settings')update();if(view==='stats')api.renderHistory();
}
$('navHome').onclick=()=>{location.hash='home';};$('navStats').onclick=()=>{location.hash='stats';};$('navSettings').onclick=()=>{location.hash='settings';};window.addEventListener('hashchange',route);window.addEventListener('score-records:changed',update);window.addEventListener('score-identity:changed',update);
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
  $('importPreview').hidden=false;$('confirmImport').disabled=!merged.added.length;status(merged.added.length?'미리보기를 확인한 뒤 가져오기를 눌러주세요.':'추가할 새 기록이 없습니다.');
 }catch(error){if(serial===reading){clearPreview();status(error.message||'파일을 읽지 못했습니다.');}}
 finally{busy=false;update();}
});
$('cancelImport').onclick=()=>{reading++;clearPreview();status('가져오기를 취소했습니다.');};
$('confirmImport').onclick=()=>{
 if(!preview||busy)return;busy=true;$('confirmImport').disabled=true;
 try{const result=api.merge(preview.records,preview.context);try{rememberGameImages(preview.gameImages);}catch{}clearPreview();api.renderHistory();status(`${result.added}개를 가져왔습니다. 중복 ${result.duplicates}개는 제외했습니다. 진행 중인 점수는 유지됩니다.${api.context().key.endsWith('.guest')?' 이 기기에 저장됐으며, 계정에 옮기려면 로그인 후 내 계정에서 기기 기록 저장을 선택하세요.':' 계정 동기화 상태는 내 계정에서 확인하세요.'}`);}
 catch(error){status(error.message||'가져오지 못했습니다.');}
 finally{busy=false;update();}
};
route();update();

function renderSelf(context){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const players=window.ScoreCounter.getPlayers(),current=$('currentSelfEditor'),label=make('label','현재 점수판에서 나는'),select=make('select'),button=make('button','지정'),feedback=make('p');
 select.setAttribute('aria-label','현재 점수판의 내 플레이어');fillSelfSelect(select,players,context.key);button.type='button';button.className='secondary';button.disabled=!players.length;
 button.onclick=()=>{if(!contextMatches(context))return;try{window.ScoreCounter.setSelf(select.value,context.key);rememberIdentity(context.key,players.find(p=>p.id===select.value));window.dispatchEvent(new Event('score-identity:changed'));api.renderHistory();}catch{feedback.textContent='설정을 저장하지 못했습니다.';}};label.append(select);current.replaceChildren(label,button,feedback);
 renderIdentitySettings($('identityEditor'),context.records,context.key,()=>{window.dispatchEvent(new Event('score-identity:changed'));api.renderHistory();});
 const saved=$('savedSelfEditor');saved.replaceChildren();if(!context.records.length){saved.append(make('p','저장된 기록이 없습니다.'));return;}
 const games=make('select'),person=make('select'),save=make('button','내 플레이어 지정'),message=make('p');games.setAttribute('aria-label','내 플레이어를 지정할 경기');person.setAttribute('aria-label','저장된 경기의 내 플레이어');
 for(const play of [...context.records].sort((a,b)=>b.date.localeCompare(a.date))){const option=make('option',play.date+' · '+play.game.name);option.value=play.id;games.append(option);}games.value=games.children[0].value;
 const fill=()=>fillSelfSelect(person,context.records.find(p=>p.id===games.value).players,context.key);games.onchange=fill;fill();save.type='button';save.className='secondary';save.onclick=()=>{try{api.assignSelf(games.value,person.value,context);message.textContent='저장했습니다.';}catch(error){message.textContent=error.message;}};saved.append(games,person,save,message);
}
window.addEventListener('scorecounter:changed',()=>{if(location.hash==='#settings')update();});
