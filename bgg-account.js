import {fetchBggPublicPage} from './bgg-public-client.js?v=63';
import {validUsername,validBggItem,safeBggItems} from './bgg-validation.js?v=63';
import {connectCloud,cloudConfigured,idToken,loadBggProfile,saveBggProfile,loadBggData,saveBggData} from './cloud-records.js?v=63';
import {bggSearchUrl} from './firebase-config.js?v=63';
const $=id=>document.getElementById(id);
let user=null,epoch=0,busy=false,collection=[],plays=[];
function key(part){return `score.bgg.${user.uid}.${part}`;}
function cached(part,fallback){try{return JSON.parse(localStorage.getItem(key(part)))??fallback;}catch{return fallback;}}
function cloudFailure(error){return String(error?.code||error?.message||'').includes('permission')?'Firebase 보안 규칙에서 BGG 저장 권한을 확인해야 합니다.':'네트워크 또는 Firebase 설정을 확인해주세요.';}
function status(text){$('bggAccountStatus').textContent=text;}
function render(){$('bggAccountStatus').setAttribute('aria-busy',String(busy));
 $('bggAccountSection').hidden=!user;
 $('bggRegister').disabled=!user||busy;$('bggImport').disabled=!user||busy||!$('bggUsername').value.trim()||!bggSearchUrl;
 $('bggServerHint').hidden=!!bggSearchUrl;
 const box=$('bggAccountData');box.replaceChildren();
 for(const [title,items] of [['보유 게임',collection],['BGG 플레이 기록',plays]]){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${title} · ${items.length}개`;details.append(summary);
  for(const item of items){const row=document.createElement('p'),link=document.createElement('a');link.textContent=item.name;link.href=`https://boardgamegeek.com/boardgame/${item.gameId}`;link.target='_blank';link.rel='noopener noreferrer';row.append(link);
   if(item.date){const text=document.createElement('span');text.textContent=` · ${item.date} · ${item.quantity}회${item.players?.length?' · '+item.players.map(p=>`${p.name}${p.score!==null?' '+p.score+'점':''}`).join(', '):''}`;row.append(text);}details.append(row);
  }box.append(details);
 }
}
$('bggUsername').addEventListener('input',render);
window.addEventListener('score-bgg:linked',event=>{if(!user||busy)return;const name=event.detail?.username;if(!validUsername(name))return;$('bggUsername').value=name;void $('bggRegister').onclick();});
$('bggRegister').onclick=async()=>{
 if(!user||busy)return;const username=$('bggUsername').value.trim();if(!validUsername(username)){status('BGG 사용자명을 64자 이내로 입력해주세요.');return;}
 const uid=user.uid,version=++epoch;busy=true;let localSaved=false;status('BGG 계정 저장 중…');render();try{
 const previous=cached('profile',{});localStorage.setItem(key('profile'),JSON.stringify({username}));localSaved=true;localStorage.setItem(key('profilePending'),'true');
 if(previous.username?.toLowerCase()!==username.toLowerCase()){collection=[];plays=[];localStorage.removeItem(key('collection'));localStorage.removeItem(key('plays'));localStorage.removeItem(key('collectionPending'));localStorage.removeItem(key('playsPending'));}
 await saveBggProfile({username},uid);if(version===epoch){localStorage.removeItem(key('profilePending'));status('BGG 사용자명을 저장했습니다. 공개 정보 가져오기를 눌러주세요.');}
 }catch(e){if(version===epoch)status(localSaved?'이 기기에 사용자명을 저장했습니다. 클라우드 저장은 실패했습니다. '+cloudFailure(e):'사용자명을 저장하지 못했습니다. 기기 저장 공간을 확인해주세요.');}finally{if(version===epoch){busy=false;render();}}
};
$('bggImport').onclick=async()=>{
 if(!user||busy||!bggSearchUrl)return;
 const username=$('bggUsername').value.trim(),uid=user.uid,version=epoch;
 if(username!==cached('profile',{}).username){status('먼저 변경한 사용자명을 등록해주세요.');return;}
 busy=true;render();let imported=0,cloudFailed=false;
 try{
  for(const action of ['collection','plays']){
   let page=1,total=Infinity,items=[];
   do{
    status(`${action==='collection'?'보유 게임':'플레이 기록'} 가져오는 중 · ${page}페이지`);
    const data=await fetchBggPublicPage({endpoint:bggSearchUrl,action,username,page,getToken:()=>idToken(uid),isCurrent:()=>version===epoch,onWaiting:retry=>status(`BGG가 정보를 준비 중입니다 · 다시 확인 중 ${retry}/2`)});if(version!==epoch)return;
    if(!Array.isArray(data.items))throw Error('BGG 응답 형식을 확인해주세요.');const rows=data.items;
    if(rows.length>(action==='plays'?100:10000)||rows.some(r=>!validBggItem(r,action)))throw Error('BGG 응답 형식을 확인해주세요.');
    items.push(...rows);total=Number(data.total)||items.length;page++;
    if(action==='collection'||!rows.length)break;
   }while(items.length<total&&page<=10);
   items=[...new Map(items.map(p=>[p.id,p])).values()];
   if(version!==epoch)return;localStorage.setItem(key(action),JSON.stringify(items));localStorage.setItem(key(action+'Pending'),'true');
   if(action==='collection')collection=items;else plays=items;imported+=items.length;render();
   try{await saveBggData(action,username,items,uid);if(version===epoch)localStorage.removeItem(key(action+'Pending'));}catch(error){if(version!==epoch)return;cloudFailed=true;status('가져온 정보를 이 기기에 저장했습니다. '+cloudFailure(error));}if(version!==epoch)return;
   if(action==='plays'&&items.length<total)status('최근 플레이 기록 최대 1,000개를 가져왔습니다.');
  }
  status(cloudFailed?`공개 정보 ${imported}개를 이 기기에 저장했습니다. 클라우드 저장에 실패했습니다. Firebase 보안 규칙과 연결 상태를 확인해주세요.`:imported?`공개 정보 ${imported}개를 계정에 저장했습니다. 플레이 기록은 최대 1,000개까지 가져옵니다.`:'공개 보유 게임과 플레이 기록이 없습니다. BGG 사용자명과 정보 공개 여부를 확인해주세요.');
 }catch(e){if(version===epoch)status(e.message);}finally{if(version===epoch){busy=false;render();}}
};
render();
if(cloudConfigured())connectCloud(async next=>{
 const version=++epoch;user=next;busy=false;collection=[];plays=[];$('bggUsername').value='';status('');
 if(!user){render();return;}
 const uid=user.uid,profileCache=cached('profile',{});$('bggUsername').value=validUsername(profileCache?.username)?profileCache.username:'';collection=safeBggItems(cached('collection',[]),'collection');plays=safeBggItems(cached('plays',[]),'plays');render();if(cached('collectionPending',false)||cached('playsPending',false))status('클라우드에 저장되지 않은 BGG 정보를 이 기기에서 표시합니다. 가져오기를 다시 눌러 저장을 시도할 수 있습니다.');
 if(cached('profilePending',false)){status('이 기기에 저장된 사용자명입니다. 등록을 다시 눌러 클라우드 저장을 시도할 수 있습니다.');return;}
 try{const profile=await loadBggProfile(uid);if(version!==epoch)return;if(profile&&validUsername(profile.username)){$('bggUsername').value=profile.username;localStorage.setItem(key('profile'),JSON.stringify(profile));const data=await loadBggData(profile.username,uid);if(version!==epoch)return;if(!cached('collectionPending',false))collection=safeBggItems(data.collection,'collection');if(!cached('playsPending',false))plays=safeBggItems(data.plays,'plays');render();if(cached('collectionPending',false)||cached('playsPending',false))status('클라우드에 저장되지 않은 BGG 정보를 이 기기에서 표시합니다. 가져오기를 다시 눌러 저장을 시도할 수 있습니다.');}}
 catch{if(version===epoch)status('계정의 BGG 정보를 불러오지 못해 이 기기에 저장된 내용을 표시합니다.');}
}).catch(()=>{});
