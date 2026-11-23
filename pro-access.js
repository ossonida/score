// Pro 기능 접근: 서버 권한 문서(Firestore users/{uid}/settings/pro, 앱에서 쓸 수 없음)로 판단한다.
// 첫 화면이 네트워크를 기다리지 않도록 계정별 마지막 결과를 기기에 두고(score.pro.v1.{uid} = '1'), 로그인 뒤 서버 값으로 맞춘다.
// 기능 계산은 기기에서 하므로 화면 잠금이며, 결제·서버 기능은 서버에서 따로 확인해야 한다.
// 이메일로 Pro를 주던 임시 목록은 베타 시작과 함께 없앴다. 계정별 Pro는 권한 문서로만 준다.
// 베타 기간에는 모든 사용자에게 Pro 기능을 연다. 정식 출시 때 false로 바꾸면 아래 잠금·Pro 소개 시트가 그대로 돌아온다.
// 베타에 쓴 계정의 얼리 서포터 혜택은 출시 때 서버에서 권한 문서(users/{uid}/settings/pro)로 준다(앱에서 따로 기록하지 않음).
export const PRO_BETA_FREE=true;
let uid='',pro=false;const betaUsed=new Set();
const cacheKey=id=>'score.pro.v1.'+id;
function cached(id){try{return Boolean(id)&&localStorage.getItem(cacheKey(id))==='1';}catch{return false;}}
function update(next){if(next===pro)return;pro=next;globalThis.dispatchEvent?.(new Event('score-pro:changed'));}
// 로그인 상태가 바뀔 때 records.js가 부른다. Pro 여부가 바뀌면 score-pro:changed.
export function setProAccount(user){
 const nextUid=typeof user?.uid==='string'?user.uid:'';if(nextUid===uid)return;
 uid=nextUid;update(cached(uid));
}
// 서버 권한 문서를 읽은 결과. 그 사이 계정이 바뀌었으면 버린다.
export function applyCloudPro(forUid,value){if(!forUid||forUid!==uid)return;try{if(value)localStorage.setItem(cacheKey(forUid),'1');else localStorage.removeItem(cacheKey(forUid));}catch{}update(Boolean(value));}
// 기능을 쓸 수 있는지(베타 무료 포함). 실제 Pro 권한만 볼 때는 hasProEntitlement.
export function isPro(){return PRO_BETA_FREE||pro;}
export function hasProEntitlement(){return pro;}
export function proOnlyText(){return globalThis.ScoreI18n?.lang==='en'?'Available in the Pro version.':'프로 버전에서 이용할 수 있습니다.';}
export function proBetaText(){return globalThis.ScoreI18n?.lang==='en'?'Pro feature · free during beta':'Pro 기능 · 베타 기간 무료';}
// Pro 기능 버튼 표시. proFeature: 이 버튼이 Pro 기능인지, reason: Pro 시트·Analytics 이유값.
// 권한이 없으면 열쇠(.is-pro-locked), 베타 무료로 열려 있으면 'PRO' 표시(.is-pro-beta)와 화면 읽기용 설명.
// 베타 중 처음 누르면 이유별로 한 번 pro_beta_used를 남긴다(어떤 Pro 기능이 쓰이는지).
export function markProLock(node,proFeature,reason='other'){
 const locked=Boolean(proFeature)&&!isPro(),beta=Boolean(proFeature)&&PRO_BETA_FREE&&!pro,note=locked?proOnlyText():beta?proBetaText():'';
 node.classList.toggle('is-pro-locked',locked);node.classList.toggle('is-pro-beta',beta);node.dataset.proReason=reason;
 if(note)node.setAttribute('aria-description',note);else node.removeAttribute('aria-description');
 if(beta&&!node._proBetaWatch){node._proBetaWatch=true;node.addEventListener('click',()=>{const why=node.dataset.proReason;if(!node.classList.contains('is-pro-beta')||betaUsed.has(why))return;betaUsed.add(why);globalThis.ScoreAnalytics?.track?.('pro_beta_used',{reason:why});});}
}
