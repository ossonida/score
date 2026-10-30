// Pro 기능 접근: 결제 기능을 넣기 전까지는 지정한 계정만 Pro로 본다. 화면에서 막는 표시용 잠금이며 서버 검증은 아니다.
const PRO_EMAILS=new Set(['ahnssoni2@gmail.com','ahssoni2@gmail.com']);
let email='';

// 로그인 상태가 바뀔 때 records.js가 부른다. Pro 여부가 바뀌면 score-pro:changed.
export function setProAccount(user){
 const next=String(user?.email||'').trim().toLowerCase();if(next===email)return;
 const was=isPro();email=next;if(was!==isPro())globalThis.dispatchEvent?.(new Event('score-pro:changed'));
}
export function isPro(){return PRO_EMAILS.has(email);}
export function proOnlyText(){return globalThis.ScoreI18n?.lang==='en'?'Available in the Pro version.':'프로 버전에서 이용할 수 있습니다.';}
// 잠긴 버튼: 열쇠 아이콘(CSS .is-pro-locked)과 화면 읽기용 설명.
export function markProLock(node,locked){
 node.classList.toggle('is-pro-locked',locked);
 if(locked)node.setAttribute('aria-description',proOnlyText());else node.removeAttribute('aria-description');
}
