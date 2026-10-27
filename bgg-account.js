import {fetchBggPublicPage} from './bgg-public-client.js?v=64';
import {validUsername,validBggItem,safeBggItems} from './bgg-validation.js?v=129';
import * as cloudApi from './cloud-records.js?v=173';
import {connectCloud,cloudConfigured,idToken,loadBggProfile,saveBggProfile,loadBggData,saveBggData,rememberedUid,mobileDevice} from './cloud-records.js?v=173';
import {bggSearchUrl} from './firebase-config.js?v=64';
const $=id=>document.getElementById(id);
// 키 순서와 상관없이 같은 내용인지 비교합니다.
// 클라우드 BGG 정보 받기: 규칙 미배포면 전체, 종류별 변경 시각이 그대로면 받지 않음(null), 바뀌었으면 변경분만.
// 변경분을 합친 개수가 클라우드 개수와 다르면 그 종류만 전체를 다시 받는다.
async function loadBggCloud(username,uid){
 const manifest=cloudApi.cloudManifest?await cloudApi.cloudManifest(uid):null;if(!manifest)return loadBggData(username,uid);
 const mark=cached('cloudMark',{}),same=mark?.username===username,result={mark:{username,collection:manifest.bggCollection,plays:manifest.bggPlays}};let full=null;
 for(const kind of ['collection','plays']){const now=kind==='collection'?manifest.bggCollection:manifest.bggPlays;
  if(same&&now>0&&mark[kind]===now){result[kind]=null;continue;}
  if(same&&mark[kind]>0){const {changed,count}=await cloudApi.loadBggChanges(kind,username,uid,mark[kind]);const merged=new Map(safeBggItems(cached(kind,[]),kind).map(item=>[item.id,item]));for(const item of changed)merged.set(item.id,item);if(merged.size===count){result[kind]=[...merged.values()];if(kind==='plays')result[kind].sort((a,b)=>b.date.localeCompare(a.date));continue;}}
  full??=await loadBggData(username,uid);result[kind]=full[kind];
 }
 return result;
}
const sameItems=(before,after)=>{if(before.length!==after.length)return false;const known=new Map(before.map(item=>[item.id,sameShape(item)]));return after.every(item=>known.get(item.id)===sameShape(item));};
const sameShape=value=>JSON.stringify(value,(name,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
let user=null,viewUid=null,epoch=0,busy=false,collection=[],plays=[];
function key(part){return `score.bgg.${user?.uid||viewUid}.${part}`;}
// 로그인 확인 전·모바일 로그아웃 상태에서는 마지막 로그인 계정의 기기 저장분만 보여 준다.
function showCached(uid){viewUid=uid;if(!uid)return;collection=safeBggItems(cached('collection',[]),'collection');plays=safeBggItems(cached('plays',[]),'plays');}
function cached(part,fallback){try{return JSON.parse(localStorage.getItem(key(part)))??fallback;}catch{return fallback;}}
function cloudFailure(error){return String(error?.code||error?.message||'').includes('permission')?'Firebase 보안 규칙에서 BGG 저장 권한을 확인해야 합니다.':'네트워크 또는 Firebase 설정을 확인해주세요.';}
function status(text){$('bggAccountStatus').textContent=text;}
// BGG가 컬렉션 자료를 만든 시각(pubdate)을 짧게 보여 줍니다.
const basisText=pubdate=>{const time=new Date(pubdate);return pubdate&&Number.isFinite(time.getTime())?'BGG 자료 기준 '+time.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';};
let updates=null,checking=false,checkedAt=0;
// BGG 연동 영역이 열려 있으면 BGG 자료가 이 기기 저장분과 다른지 조용히 확인합니다(10분에 한 번).

// 내보내기 뒤에는 다음에 연동 영역을 열 때 새 정보를 다시 확인합니다.
function expectUpdates(){updates=null;checkedAt=0;render();}
// 데이터(계정·컬렉션·플레이)가 바뀐 경우에만 다른 화면에 알린다. 알림을 받으면 이 화면만 다시 그린다(다시 알리지 않음).
let announced=[];
function render(){renderView();const next=[user?.uid||viewUid,collection,plays];if(next.some((value,index)=>value!==announced[index])){announced=next;window.dispatchEvent?.(new Event('score-bgg:changed'));}}
function renderView(){$('bggAccountStatus').setAttribute('aria-busy',String(busy));
 $('bggAccountSection').hidden=!user;
 const username=$('bggUsername').value.trim();$('bggImport').disabled=!user||busy||!username||!bggSearchUrl;
 const fresh=Boolean(updates&&(updates.collection||updates.plays)),notice=$('bggUpdateNotice');$('bggImport').textContent=fresh?'새 정보 가져오기':'내 정보 가져오기';$('bggImport').setAttribute('data-update',String(fresh));
 notice.hidden=!user||busy||!updates;notice.textContent=!updates?'':fresh?'BGG에 새 정보가 있습니다 · '+[updates.collection?`컬렉션 ${updates.collection}개`:'',updates.plays?'플레이 기록':''].filter(Boolean).join(' · ')+'. 가져오기를 눌러 반영하세요.':['BGG 최신 자료와 같습니다',basisText(updates.pubdate)].filter(Boolean).join(' · ');
 const box=$('bggAccountData');box.replaceChildren();
 for(const [title,items] of [['보유 게임',collection],['플레이 기록',plays]]){
  const item=document.createElement('div'),label=document.createElement('span'),count=document.createElement('strong');
  item.className='bgg-data-count';label.textContent=title;count.textContent=`${items.length}개`;item.append(label,count);box.append(item);
 }
}
window.addEventListener('score-bgg:changed',renderView);
window.addEventListener('score-bgg:linked',event=>{if(!user||busy)return;const name=event.detail?.username;if(!validUsername(name))return;$('bggUsername').value=name;void saveUsername({announce:false});});
async function saveUsername({announce=true}={}){
 if(!user||busy)return;const username=$('bggUsername').value.trim();if(!validUsername(username)){status('BGG 사용자명을 64자 이내로 입력해주세요.');return;}
 const uid=user.uid,version=++epoch;busy=true;let localSaved=false,saved=false;status('BGG 사용자명 확인 중…');render();try{
 const previous=cached('profile',{});localStorage.setItem(key('profile'),JSON.stringify({username}));localSaved=true;localStorage.setItem(key('profilePending'),'true');
 if(previous.username?.toLowerCase()!==username.toLowerCase()){collection=[];plays=[];localStorage.removeItem(key('collection'));localStorage.removeItem(key('plays'));localStorage.removeItem(key('collectionPending'));localStorage.removeItem(key('playsPending'));}
 await saveBggProfile({username},uid);if(version===epoch){localStorage.removeItem(key('profilePending'));saved=true;if(announce)status('BGG 사용자명을 저장했습니다.');}
 }catch(e){saved=localSaved;if(version===epoch)status(localSaved?'이 기기에 사용자명을 저장했습니다. 클라우드 저장은 실패했습니다. '+cloudFailure(e):'사용자명을 저장하지 못했습니다. 기기 저장 공간을 확인해주세요.');}finally{if(version===epoch){busy=false;render();}}
 return version===epoch&&saved;
}
async function importPublic(){
 if(!user||busy||!bggSearchUrl)return;
 const username=$('bggUsername').value.trim(),uid=user.uid,version=epoch;
 if(username!==cached('profile',{}).username){status('BGG 연결 정보를 다시 확인해주세요.');return;}
 busy=true;updates=null;render();let updated=0,cloudFailed=false,pubdate='';const counts={collection:0,plays:0};
 try{
  // 컬렉션은 BGG가 준비 중(202)으로 자주 기다리게 하므로 플레이 기록 첫 페이지와 동시에 요청합니다.
  // 동시에 시작하는 요청이 같은 로그인 토큰을 쓰도록 한 번만 받습니다.
  let token;const fetchPage=(action,page)=>fetchBggPublicPage({endpoint:bggSearchUrl,action,username,page,getToken:()=>token||=idToken(uid),isCurrent:()=>version===epoch,onWaiting:retry=>status(`BGG가 정보를 준비 중입니다 · 다시 확인 중 ${retry}/2`)});
  const first={collection:fetchPage('collection',1),plays:fetchPage('plays',1)};for(const request of Object.values(first))request.catch(()=>{});
  status('보유 게임과 플레이 기록 가져오는 중');
  for(const action of ['collection','plays']){
   let page=1,total=Infinity,items=[],skipped=false;
   do{
    if(page>1)status(`플레이 기록 가져오는 중 · ${page}페이지`);
    const data=await(page===1?first[action]:fetchPage(action,page));if(version!==epoch)return;if(action==='collection'&&typeof data.pubdate==='string')pubdate=data.pubdate;
    if(!Array.isArray(data.items))throw Error('BGG 응답 형식을 확인해주세요.');const rows=data.items;
    if(rows.length>(action==='plays'?100:10000)||rows.some(r=>!validBggItem(r,action)))throw Error('BGG 응답 형식을 확인해주세요.');
    items.push(...rows);total=Number(data.total)||items.length;page++;
    if(action==='collection'||!rows.length)break;
    // BGG 전체 플레이 수와 첫 페이지가 저장분과 같으면 나머지 페이지는 건너뜁니다. 오래된 기록 수정도 반영하도록 7일마다 한 번은 전체를 받습니다.
    if(page===2){const saved=cached('plays',[]),known=new Map(safeBggItems(saved,'plays').map(item=>[item.id,sameShape(item)]));if(Date.now()-Number(cached('playsFullAt',0))<7*86400000&&saved.length===Math.min(total,1000)&&safeBggItems(rows,'plays').every(item=>known.get(item.id)===sameShape(item))){items=saved;skipped=true;break;}}
   }while(items.length<total&&page<=10);
   if(action==='plays'&&!skipped)try{localStorage.setItem(key('playsFullAt'),String(Date.now()));}catch{}
   items=[...new Map(items.map(p=>[p.id,p])).values()];
   const previous=cached(action,[]),before=new Map(safeBggItems(previous,action).map(item=>[item.id,sameShape(item)])),changed=safeBggItems(items,action).filter(item=>before.get(item.id)!==sameShape(item)),nextIds=new Set(items.map(next=>next.id)),removed=previous.filter(item=>!nextIds.has(item.id)),pendingCloud=cached(action+'Pending',false);
   if(version!==epoch)return;if(changed.length||removed.length){localStorage.setItem(key(action),JSON.stringify(items));localStorage.setItem(key(action+'Pending'),'true');updated+=changed.length+removed.length;counts[action]=changed.length+removed.length;}if(action==='collection')collection=safeBggItems(items,'collection');else plays=safeBggItems(items,'plays');render();
   if(!changed.length&&!removed.length&&!pendingCloud)continue;
   try{const mark=cached('cloudMark',{}),mirror=!pendingCloud&&mark?.username===username&&mark[action]>0?previous:null;await saveBggData(action,username,items,uid,mirror);if(version===epoch)localStorage.removeItem(key(action+'Pending'));}catch(error){if(version!==epoch)return;cloudFailed=true;status('가져온 정보를 이 기기에 저장했습니다. '+cloudFailure(error));}if(version!==epoch)return;
   if(action==='plays'&&items.length<total)status('최근 플레이 기록 최대 1,000개를 가져왔습니다.');
  }
  window.ScoreAnalytics?.feature('bgg','import_completed');
  status(cloudFailed?`변경된 공개 정보 ${updated}개를 이 기기에 저장했습니다. 클라우드 저장에 실패했습니다. Firebase 보안 규칙과 연결 상태를 확인해주세요.`:updated?`BGG에서 바뀐 정보를 계정에 저장했습니다 · ${[counts.collection?`컬렉션 ${counts.collection}개`:'',counts.plays?`플레이 기록 ${counts.plays}개`:''].filter(Boolean).join(' · ')}. 플레이 기록은 최대 1,000개까지 가져옵니다.`:'새로 가져올 공개 정보가 없습니다.'+(basisText(pubdate)?' '+basisText(pubdate):''));checkedAt=Date.now();
 }catch(e){if(version===epoch)status(e.message);}finally{if(version===epoch){busy=false;render();}}
}
$('bggImport').onclick=importPublic;
// BGG에서 하고 싶은 표시를 끈 게임은 이 기기 목록에도 바로 반영하고, 다음 가져오기 때 클라우드에 다시 저장합니다.
function clearWantToPlay(ids){if(!user)return;const set=new Set(ids.map(String));collection=collection.map(item=>set.has(item.id)?{...item,wantToPlay:false}:item);try{localStorage.setItem(key('collection'),JSON.stringify(collection));localStorage.setItem(key('collectionPending'),'true');}catch{}render();}
// 컬렉션 관리 메뉴에서 BGG에 저장한 상태를 이 기기의 BGG 컬렉션에도 반영합니다(클라우드에는 다음 클라우드 동기화 때 저장).
function setCollectionStatus(game,status){if(!user)return;const id=String(game?.bggId||'');if(!/^[1-9][0-9]{0,9}$/.test(id))return;const flags={owned:status.owned===true,wishlist:status.wishlist===true,wantToPlay:status.wantToPlay===true},preordered=status.preordered===true,any=preordered||Object.values(flags).some(Boolean),current=collection.find(item=>item.id===id);let next;
 if(current){const {preordered:_,...rest}=current,item={...rest,...flags,...(preordered?{preordered:true}:{})};next=any||item.numPlays>0?collection.map(entry=>entry.id===id?item:entry):collection.filter(entry=>entry.id!==id);}
 else{if(!any)return;const item={id,gameId:id,name:String(game.name||'').trim().slice(0,300),...flags,...(preordered?{preordered:true}:{})};if(!validBggItem(item,'collection'))return;next=[...collection,item];}
 collection=next;try{localStorage.setItem(key('collection'),JSON.stringify(collection));localStorage.setItem(key('collectionPending'),'true');}catch{}render();}
window.ScoreBggAccount={state:()=>({collection:collection.map(item=>({...item})),plays:plays.map(item=>({...item}))}),clearWantToPlay,setCollectionStatus,expectUpdates};

if(cloudConfigured())showCached(rememberedUid());render();
if(cloudConfigured())connectCloud(async next=>{
 const version=++epoch;user=next;busy=false;collection=[];plays=[];$('bggUsername').value='';status('');
 if(!user){showCached(mobileDevice?rememberedUid():null);render();return;}
 const uid=user.uid,profileCache=cached('profile',{});$('bggUsername').value=validUsername(profileCache?.username)?profileCache.username:'';collection=safeBggItems(cached('collection',[]),'collection');plays=safeBggItems(cached('plays',[]),'plays');render();if(cached('collectionPending',false)||cached('playsPending',false))status('클라우드에 저장되지 않은 BGG 정보를 이 기기에서 표시합니다. 가져오기를 다시 눌러 저장을 시도할 수 있습니다.');
 if(cached('profilePending',false))status('이 기기에 저장된 사용자명입니다. 공개 정보 가져오기를 다시 눌러 클라우드 저장을 시도할 수 있습니다.');
}).catch(()=>{});
// 클라우드의 BGG 사용자명·컬렉션·플레이 기록은 사용자가 '클라우드 동기화'를 눌렀을 때만 받는다(로그인만으로 받지 않음).
async function pullCloud(){if(!user)return;const uid=user.uid,version=epoch;if(cached('profilePending',false)){status('이 기기에 저장된 사용자명입니다. 공개 정보 가져오기를 다시 눌러 클라우드 저장을 시도할 수 있습니다.');return;}
 try{const profile=await loadBggProfile(uid);if(version!==epoch)return;if(profile&&validUsername(profile.username)){$('bggUsername').value=profile.username;localStorage.setItem(key('profile'),JSON.stringify(profile));const data=await loadBggCloud(profile.username,uid);if(version!==epoch)return;for(const kind of ['collection','plays']){if(cached(kind+'Pending',false)){try{await saveBggData(kind,profile.username,kind==='collection'?collection:plays,uid,null);if(version===epoch)localStorage.removeItem(key(kind+'Pending'));}catch{}if(version!==epoch)return;continue;}if(!data[kind])continue;const next=safeBggItems(data[kind],kind);if(!sameItems(kind==='collection'?collection:plays,next)){if(kind==='collection')collection=next;else plays=next;}try{localStorage.setItem(key(kind),JSON.stringify(next));}catch{}}if(data.mark)try{localStorage.setItem(key('cloudMark'),JSON.stringify(data.mark));}catch{}render();if(cached('collectionPending',false)||cached('playsPending',false))status('클라우드에 저장되지 않은 BGG 정보를 이 기기에서 표시합니다. 가져오기를 다시 눌러 저장을 시도할 수 있습니다.');}}
 catch{if(version===epoch)status('계정의 BGG 정보를 불러오지 못해 이 기기에 저장된 내용을 표시합니다.');}
}
window.addEventListener('score-cloud:pull',()=>void pullCloud());
