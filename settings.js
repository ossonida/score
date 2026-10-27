import {readIdentity} from './personal-stats.js?v=115';
import {renderIdentitySettings} from './personal-dashboard.js?v=159';
import {rememberGameImages} from './game-artwork.js?v=171';
import './records.js?v=188';
import {parseImport,mergeImported,MAX_IMPORT_BYTES} from './data-transfer.js?v=67';
import {readPlacePrefs,savePlacePrefs,placeStats} from './places.js?v=2';
const $=id=>document.getElementById(id),api=window.ScoreRecords;let preview=null,reading=0,busy=false,lastView='';
function status(message){$('transferStatus').textContent=message;}
function contextMatches(context){const now=api.context();return context.key===now.key&&context.epoch===now.epoch;}
function clearPreview(){preview=null;$('importPreview').hidden=true;$('confirmImport').disabled=true;}
// 장소 관리: 설정이 보일 때만 그린다. 기본·숨김은 계정별 기기 설정, 이름 바꾸기는 이 계정 기록을 고친다.
let placesOpen=false;
function placeButton(text,onClick,pressed){const b=document.createElement('button');b.type='button';b.textContent=text;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.onclick=onClick;return b;}
function renderPlaces(context){
 if(currentView()!=='settings')return;const list=$('placeList'),prefs=readPlacePrefs(context.key),hidden=new Set(prefs.hidden),places=placeStats(context.records,window.ScoreBggAccount?.state().plays||[]);
 const ordered=[...places.filter(p=>!hidden.has(p.place)),...places.filter(p=>hidden.has(p.place))],save=next=>{savePlacePrefs(context.key,next);renderPlaces(api.context());};
 list.replaceChildren();if(!places.length){const empty=document.createElement('p');empty.className='settings-note';empty.textContent='아직 저장된 장소가 없습니다. 게임 기록을 저장할 때 장소를 입력하면 여기에 표시됩니다.';list.append(empty);return;}
 const row=item=>{const box=document.createElement('div'),copy=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small'),actions=document.createElement('div'),isHidden=hidden.has(item.place),isPrimary=prefs.primary===item.place;
  box.className='place-row'+(isHidden?' is-hidden':'');copy.className='place-copy';actions.className='place-actions';name.textContent=item.place;meta.textContent=[item.records?'기록 '+item.records+'회':'',item.bgg?'BGG '+item.bgg+'회':'','최근 '+item.last].filter(Boolean).join(' · ')+(isPrimary?' · 기본 장소':'')+(isHidden?' · 숨김':'');copy.append(name,meta);
  actions.append(placeButton('기본',()=>{save({...prefs,primary:isPrimary?'':item.place,hidden:prefs.hidden.filter(x=>x!==item.place)});$('placeStatus').textContent=isPrimary?'기본 장소를 해제했습니다.':item.place+'을(를) 기본 장소로 정했습니다.';},isPrimary),placeButton(isHidden?'보이기':'숨기기',()=>{save({...prefs,primary:!isHidden&&isPrimary?'':prefs.primary,hidden:isHidden?prefs.hidden.filter(x=>x!==item.place):[...prefs.hidden,item.place]});$('placeStatus').textContent=item.place+(isHidden?'을(를) 다시 추천합니다.':'을(를) 추천에서 숨겼습니다.');}));
  box.append(copy,actions);
  if(item.records){const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');form.className='place-rename';form.hidden=true;input.maxLength=120;input.value=item.place;input.setAttribute('aria-label',item.place+' 새 이름');submit.type='submit';submit.textContent='바꾸기';form.append(input,submit);
   actions.append(placeButton('이름 바꾸기',()=>{form.hidden=!form.hidden;if(!form.hidden)input.focus?.();}));
   form.onsubmit=event=>{event.preventDefault();const to=input.value.trim();if(!to||to===item.place){form.hidden=true;return;}const merge=places.some(p=>p.place===to),confirm=window.ScoreCounter?.confirm,run=()=>{try{const count=api.renameLocation(item.place,to,{key:context.key,epoch:context.epoch});const next=readPlacePrefs(context.key);savePlacePrefs(context.key,{primary:next.primary===item.place?to:next.primary,hidden:next.hidden.filter(x=>x!==item.place)});$('placeStatus').textContent='기록 '+count+'개의 장소를 '+to+'(으)로 바꿨습니다.';renderPlaces(api.context());}catch(error){$('placeStatus').textContent=error.message;}};
    const message=item.place+' 장소가 들어간 기록 '+item.records+'개를 '+to+(merge?'(이미 있는 장소)와 합칠까요?':'(으)로 바꿀까요?')+' 되돌릴 수 없으며 이미 BGG로 내보낸 플레이는 바뀌지 않습니다.';if(confirm)confirm('장소 이름 바꾸기',message,run);else run();};box.append(form);}
  return box;};
 for(const item of ordered.slice(0,placesOpen?ordered.length:20))list.append(row(item));
 if(!placesOpen&&ordered.length>20)list.append(placeButton('장소 '+(ordered.length-20)+'개 더 보기',()=>{placesOpen=true;renderPlaces(api.context());}));
}
// 개인정보 · 이용 분석 허용: app-analytics.js의 ScoreAnalyticsConsent와 같은 값을 쓴다(이 기기 저장).
function renderPrivacy(){const consent=window.ScoreAnalyticsConsent,box=$('analyticsEnabled');box.disabled=!consent;box.checked=!!consent?.enabled();$('accountDeleteArea').hidden=!api.context().key.startsWith('score.plays.v1.user.');}
// 계정 삭제: 범위를 확인받은 뒤 records.js의 deleteAccount로 진행 상황을 보여 주며 지운다.
$('deleteAccount').onclick=()=>{const context=api.context();if(!context.key.startsWith('score.plays.v1.user.'))return;const run=async()=>{const button=$('deleteAccount');button.disabled=true;try{const removed=await api.deleteAccount(context,text=>{$('deleteAccountStatus').textContent=text;});$('deleteAccountStatus').textContent='계정을 삭제했습니다. 클라우드 데이터 '+removed+'건을 지웠습니다.';}catch(error){$('deleteAccountStatus').textContent=error.message||'계정을 삭제하지 못했습니다.';}finally{button.disabled=false;renderPrivacy();}};window.ScoreCounter?.confirm?.('계정과 클라우드 데이터 삭제','클라우드의 기록·닉네임 설정·BGG 정보와 BGG 연결, Google 로그인 계정을 모두 삭제합니다. 이 기기의 이 계정 기록도 지워지며 되돌릴 수 없습니다. BGG 사이트에 이미 올린 플레이는 BGG에서 직접 지워야 합니다.',run);};
$('analyticsEnabled').onchange=()=>{window.ScoreAnalyticsConsent?.set($('analyticsEnabled').checked);try{localStorage.setItem('score.analytics.notice.v1','1');}catch{}const notice=$('analyticsNotice');if(notice)notice.hidden=true;renderPrivacy();};
window.addEventListener('score-analytics:changed',renderPrivacy);
function update(){$('transferStatus').setAttribute('aria-busy',String(busy));const context=api.context();renderSelf(context);renderPlaces(context);renderPrivacy();$('settingsRecordCount').textContent=`저장된 게임 기록 ${context.records.length.toLocaleString('ko-KR')}개`;$('importData').disabled=busy;if(preview&&!contextMatches(preview.context)){reading++;clearPreview();status('계정이 변경됐습니다. 파일을 다시 선택해주세요.');}}
function route(){const view=currentView();
 if(view!==lastView){$('accountStatus').textContent='';$('statsStatus').textContent='';lastView=view;}
 for(const [name,id] of [['home','homeScreen'],['stats','statsScreen'],['games','gamesScreen'],['settings','settingsScreen']])$(id).hidden=view!==name;
 delete document.documentElement.dataset.initialView;
 document.documentElement.classList.toggle('settings-view',view==='settings');document.documentElement.classList.toggle('stats-view',view==='stats');
 for(const [name,id] of [['home','navHome'],['stats','navStats'],['games','navGames'],['settings','navSettings']])$(id).setAttribute('aria-current',view===name?'page':'false');
 if(view==='settings')update();if(view==='stats')api.renderHistory();
}
// 하단 메뉴: 다른 화면이면 이동하고, 이미 보고 있는 화면의 버튼을 다시 누르면 그 화면 맨 위로 올린다.
const currentView=()=>location.hash==='#games'?'games':location.hash==='#settings'?'settings':location.hash==='#stats'?'stats':'home';
function openView(view){if(currentView()===view){window.scrollTo?.({top:0,behavior:'smooth'});return;}location.hash=view;}
for(const [view,id] of [['home','navHome'],['stats','navStats'],['games','navGames'],['settings','navSettings']])$(id).onclick=()=>openView(view);window.addEventListener('hashchange',route);window.addEventListener('score-records:changed',update);window.addEventListener('score-bgg:changed',()=>{if(currentView()==='settings')renderPlaces(api.context());});window.addEventListener('score-identity:changed',update);
$('importData').onclick=()=>{if(!busy)$('importFile').click();};
$('importFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file||busy)return;const serial=++reading,context=api.context();clearPreview();busy=true;update();status('파일을 확인하고 있습니다…');
 try{
  if(file.size>MAX_IMPORT_BYTES)throw Error('20MB 이하의 JSON 파일을 선택해주세요.');
  const result=await parseImport(await file.text());if(serial!==reading)return;
  if(!contextMatches(context))throw Error('계정이 변경됐습니다. 파일을 다시 선택해주세요.');
  const merged=mergeImported(api.context().records,result.records);preview={...result,context};
  $('importSummary').textContent=`${result.format} · 전체 ${result.total}개 중 새 기록 ${merged.added.length}개 · 중복 ${merged.duplicates}개${merged.updated.length?` (장소 채움 ${merged.updated.length}개)`:''} · 제외 ${result.skipped}개`;
  $('importScope').textContent=result.scope;
  $('importWarnings').replaceChildren(...result.reasons.map(({reason,count})=>{const p=document.createElement('p');p.textContent=`${reason}: ${count}개`;return p;}));
  $('importExamples').replaceChildren(...result.records.slice(0,4).map(p=>{const row=document.createElement('p');row.textContent=`${p.date} · ${p.game.name} · ${p.players.length}명`;return row;}));
  $('importPreview').hidden=false;window.ScoreAnalytics?.feature('data_transfer','import_previewed');$('confirmImport').disabled=!merged.added.length&&!merged.updated.length;status(merged.added.length?'미리보기를 확인한 뒤 가져오기를 눌러주세요.':'추가할 새 기록이 없습니다.');
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
