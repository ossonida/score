// Pro 기능 접근: 서버 권한 문서(Firestore users/{uid}/settings/pro, 앱에서 쓸 수 없음)로 판단한다.
// 첫 화면이 네트워크를 기다리지 않도록 계정별 마지막 결과를 기기에 두고(score.pro.v1.{uid} = '1'), 로그인 뒤 서버 값으로 맞춘다.
// 기능 계산은 기기에서 하므로 화면 잠금이며, 결제·서버 기능은 서버에서 따로 확인해야 한다.
// 아래 해시 목록은 권한 문서를 만들기 전까지 쓰는 임시 목록이다(문서 생성 확인 후 삭제).
// 공개 저장소에 이메일이 보이지 않도록 이메일 대신 SHA-256('score-pro:' + 소문자 이메일) 값만 둔다.
// 계정 추가: node -e "console.log(require('crypto').createHash('sha256').update('score-pro:'+'이메일').digest('hex'))"
const PRO_HASHES=new Set(['1eda2feb56bb7a3670972085b06cb1348e2dcebe6d1af0885df08fa99dd6d038','1f9e48aeae5048a212880156a218cb458f879282bd2452d6cd8d465998fd20e0','a6e17411c6d9a98d4060e605adedbf1c06c05f496991626a3d0c39edd248aac1']);
let email='',uid='',pro=false;
const cacheKey=id=>'score.pro.v1.'+id;
function cached(id){try{return Boolean(id)&&localStorage.getItem(cacheKey(id))==='1';}catch{return false;}}
function update(next){if(next===pro)return;pro=next;globalThis.dispatchEvent?.(new Event('score-pro:changed'));}
// 로그인 직후 화면이 바로 Pro 여부를 알 수 있게 동기 SHA-256(UTF-8)으로 계산한다.
function sha256(text){const bytes=[...new TextEncoder().encode(text)],K=[],H=[];let n=2;for(let found=0;found<64;n++){let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break;}if(!prime)continue;if(found<8)H[found]=(Math.pow(n,1/2)%1)*2**32|0;K[found++]=(Math.pow(n,1/3)%1)*2**32|0;}
 const bitLength=bytes.length*8;bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);for(let i=7;i>=0;i--)bytes.push(i>3?0:(bitLength>>>(i*8))&255);
 const r=(x,c)=>x>>>c|x<<(32-c),w=new Array(64);
 for(let o=0;o<bytes.length;o+=64){for(let i=0;i<16;i++)w[i]=bytes[o+i*4]<<24|bytes[o+i*4+1]<<16|bytes[o+i*4+2]<<8|bytes[o+i*4+3];for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^a>>>3)+w[i-7]+(r(b,17)^r(b,19)^b>>>10))|0;}
  let [a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const t1=(h+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[i]+w[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+(a&b^a&c^b&c))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
  H[0]=H[0]+a|0;H[1]=H[1]+b|0;H[2]=H[2]+c|0;H[3]=H[3]+d|0;H[4]=H[4]+e|0;H[5]=H[5]+f|0;H[6]=H[6]+g|0;H[7]=H[7]+h|0;}
 return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');}

// 로그인 상태가 바뀔 때 records.js가 부른다. Pro 여부가 바뀌면 score-pro:changed.
export function setProAccount(user){
 const next=String(user?.email||'').trim().toLowerCase(),nextUid=typeof user?.uid==='string'?user.uid:'';if(next===email&&nextUid===uid)return;
 email=next;uid=nextUid;update(Boolean(next)&&PRO_HASHES.has(proHash(next))||cached(uid));
}
// 서버 권한 문서를 읽은 결과. 그 사이 계정이 바뀌었으면 버린다.
export function applyCloudPro(forUid,value){if(!forUid||forUid!==uid)return;try{if(value)localStorage.setItem(cacheKey(forUid),'1');else localStorage.removeItem(cacheKey(forUid));}catch{}update(Boolean(value)||Boolean(email)&&PRO_HASHES.has(proHash(email)));}
export function isPro(){return pro;}
// 이메일 → 목록에 넣는 해시(공백 제거·소문자).
export function proHash(value){return sha256('score-pro:'+String(value||'').trim().toLowerCase());}
export function proOnlyText(){return globalThis.ScoreI18n?.lang==='en'?'Available in the Pro version.':'프로 버전에서 이용할 수 있습니다.';}
// 잠긴 버튼: 열쇠 아이콘(CSS .is-pro-locked)과 화면 읽기용 설명.
export function markProLock(node,locked){
 node.classList.toggle('is-pro-locked',locked);
 if(locked)node.setAttribute('aria-description',proOnlyText());else node.removeAttribute('aria-description');
}
