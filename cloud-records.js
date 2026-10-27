import {signInNativeGoogle} from './native-auth-flow.js?v=64';
import {validUsername,validBggItem} from './bgg-validation.js?v=129';
import {firebaseConfig} from './firebase-config.js?v=64';
import {validIdentity} from './personal-stats.js?v=116';
let connection,storeConnection;
const lastUserKey='score.lastUser.v1';
export const mobileDevice=Boolean(globalThis.Capacitor?.isNativePlatform?.())||/Android|iPhone|iPad|iPod|Mobi/i.test(globalThis.navigator?.userAgent||'')||(/Macintosh/.test(globalThis.navigator?.userAgent||'')&&globalThis.navigator?.maxTouchPoints>1);
// 마지막 로그인 계정: 로그인 확인 전·오프라인·모바일 로그아웃 상태에서도 같은 기기 기록을 보여 준다.
export function rememberedUid(){try{return localStorage.getItem(lastUserKey)||null;}catch{return null;}}
export function rememberUid(uid,label=''){try{if(uid){localStorage.setItem(lastUserKey,uid);localStorage.setItem(lastUserKey+'.label',label);}else{localStorage.removeItem(lastUserKey);localStorage.removeItem(lastUserKey+'.label');}}catch{}}
export function rememberedLabel(){try{return localStorage.getItem(lastUserKey+'.label')||'';}catch{return '';}}
// 필드 순서와 상관없는 비교용 문자열.
const stableJson=value=>JSON.stringify(value,(name,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0)):item);
export function cloudConfigured(){return !!(firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.authDomain);}
export async function connectCloud(onUser){
  if(!cloudConfigured())throw Error('Google 로그인 연결을 준비 중입니다. 지금은 이 브라우저에 기록을 저장할 수 있습니다.');
  if(!connection){
    connection=(async()=>{
      const base='https://www.gstatic.com/firebasejs/12.4.0/';
      // 로그인 확인은 Firestore를 기다리지 않는다. 팝업 로그인 도구도 로그인할 때만 쓴다(시작 시 인증 iframe 로드 생략).
      const [app,auth]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js')]);
      const firebase=app.initializeApp(firebaseConfig);
      const session=auth.initializeAuth(firebase,{persistence:auth.browserLocalPersistence});
      return {auth,session,firebase};
    })().catch(e=>{connection=null;throw e;});
  }
  const c=await connection;
  if(onUser)c.auth.onAuthStateChanged(c.session,onUser);
  if(!storeConnection)storeConnection=import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js').then(store=>({...c,store,db:store.getFirestore(c.firebase)})).catch(e=>{storeConnection=null;throw e;});
  return storeConnection;
}
export async function login(){const c=await connectCloud();if(globalThis.Capacitor?.isNativePlatform?.()){if(!globalThis.ScoreNativeAuth)throw Error('앱 로그인 모듈을 준비하지 못했습니다. 앱을 다시 실행해주세요.');await signInNativeGoogle(globalThis.ScoreNativeAuth,c);}else await c.auth.signInWithPopup(c.session,new c.auth.GoogleAuthProvider(),c.auth.browserPopupRedirectResolver);}
export async function logout(){const c=await connectCloud();await c.auth.signOut(c.session);if(globalThis.Capacitor?.isNativePlatform?.())await globalThis.ScoreNativeAuth?.signOut();}
function userId(c,expected){if(!c.session.currentUser)throw Error('로그인이 필요합니다.');if(expected&&c.session.currentUser.uid!==expected)throw Error('계정이 변경됐습니다. 다시 시도해주세요.');return c.session.currentUser.uid;}
// 변경분 동기화: settings/sync에 종류별 마지막 변경 시각(서버 시각)을 두고, 문서마다 updatedAt(서버 시각)을 단다.
// 보안 규칙이 아직 이를 허용하지 않으면(settings/sync 읽기 거부) 예전처럼 전체를 주고받는다.
let deltaMode;
const manifestRef=(c,owner)=>c.store.doc(c.db,'users',owner,'settings','sync'),millis=value=>typeof value?.toMillis==='function'?value.toMillis():0;
const withoutStamp=data=>{const {updatedAt,...rest}=data;return rest;},stamp=(c,data)=>deltaMode?{...data,updatedAt:c.store.serverTimestamp()}:data;
async function readManifest(c,owner){try{const snap=await c.store.getDocFromServer(manifestRef(c,owner));deltaMode=true;const d=snap.exists()?snap.data():{};return {plays:millis(d.plays),bggCollection:millis(d.bggCollection),bggPlays:millis(d.bggPlays)};}catch(error){if(error?.code==='permission-denied'){deltaMode=false;return null;}throw error;}}
async function ensureMode(c,owner){if(deltaMode===undefined)await readManifest(c,owner);}
async function touch(c,owner,kind){if(deltaMode)await c.store.setDoc(manifestRef(c,owner),{[kind]:c.store.serverTimestamp()},{merge:true});}
// 종류별 마지막 변경 시각. 규칙 미배포(예전 방식)면 null.
export async function cloudManifest(uid){const c=await connectCloud();return readManifest(c,userId(c,uid));}
// since(밀리초) 이후 바뀐 기록.
export async function loadCloudChanges(uid,since){const c=await connectCloud(),owner=userId(c,uid);const changed=await c.store.getDocsFromServer(c.store.query(c.store.collection(c.db,'users',owner,'plays'),c.store.where('updatedAt','>',c.store.Timestamp.fromMillis(since))));return changed.docs.map(d=>({...withoutStamp(d.data()),id:d.id}));}
// 클라우드 기록 개수(집계 읽기 1회). 다른 기기의 삭제를 알아채는 데 쓴다.
export async function cloudCount(uid){const c=await connectCloud();const total=await c.store.getCountFromServer(c.store.collection(c.db,'users',userId(c,uid),'plays'));return total.data().count;}
// 기록 업로드 묶음이 끝나면 다른 기기가 알 수 있게 변경 시각을 올린다.
export async function markCloudChanged(uid){const c=await connectCloud();await touch(c,userId(c,uid),'plays');}
export async function loadCloud(uid){const c=await connectCloud();const result=await c.store.getDocsFromServer(c.store.collection(c.db,'users',userId(c,uid),'plays'));return result.docs.map(d=>({...withoutStamp(d.data()),id:d.id}));}
export async function saveCloud(play,uid){const c=await connectCloud(),owner=userId(c,uid);await ensureMode(c,owner);await c.store.setDoc(c.store.doc(c.db,'users',owner,'plays',play.id),stamp(c,play));}
export async function deleteCloud(id,uid){const c=await connectCloud(),owner=userId(c,uid);await ensureMode(c,owner);await c.store.deleteDoc(c.store.doc(c.db,'users',owner,'plays',id));}
export async function loadCloudIdentity(uid){const c=await connectCloud();const snap=await c.store.getDocFromServer(c.store.doc(c.db,'users',userId(c,uid),'settings','identity'));return snap.exists()?snap.data():null;}
export async function saveCloudIdentity(profile,uid){if(!validIdentity(profile))throw Error('닉네임 설정을 확인해주세요.');const c=await connectCloud();await c.store.setDoc(c.store.doc(c.db,'users',userId(c,uid),'settings','identity'),{primary:profile.primary,aliases:profile.aliases});}
export async function idToken(uid){const c=await connectCloud(),owner=userId(c,uid),token=await c.session.currentUser.getIdToken();userId(c,owner);return token;}
export async function loadBggProfile(uid){const c=await connectCloud();const snap=await c.store.getDoc(c.store.doc(c.db,'users',userId(c,uid),'settings','bgg'));return snap.exists()?snap.data():null;}
export async function saveBggProfile(profile,uid){if(!validUsername(profile?.username))throw Error('BGG 사용자명을 확인해주세요.');const c=await connectCloud();await c.store.setDoc(c.store.doc(c.db,'users',userId(c,uid),'settings','bgg'),profile);}
// previous: 클라우드와 같다고 확인된 기기 저장분. 있으면 클라우드 전체를 다시 읽지 않고 바뀐 항목·사라진 항목만 쓴다.
export async function saveBggData(kind,username,items,uid,previous=null){if(!['collection','plays'].includes(kind)||!validUsername(username)||!Array.isArray(items)||items.length>(kind==='plays'?1000:10000)||items.some(item=>!validBggItem(item,kind)))throw Error('BGG 기록 형식을 확인해주세요.');const c=await connectCloud(),owner=userId(c,uid),name=kind==='collection'?'bggCollection':'bggPlays';await ensureMode(c,owner);const operations=[];
 if(deltaMode&&Array.isArray(previous)){const before=new Map(previous.map(item=>[item.id,stableJson({...item,username})])),ids=new Set(items.map(item=>item.id));for(const item of items){const payload={...item,username};if(before.get(item.id)!==stableJson(payload))operations.push({item:payload});}for(const item of previous)if(!ids.has(item.id))operations.push({id:item.id});}
 else{const existing=await c.store.getDocs(c.store.query(c.store.collection(c.db,'users',owner,name),c.store.where('username','==',username))),current=new Map(existing.docs.map(doc=>[doc.id,withoutStamp(doc.data())])),ids=new Set(items.map(item=>item.id));for(const item of items){const payload={...item,username};if(stableJson(current.get(item.id))!==stableJson(payload))operations.push({item:payload});}for(const doc of existing.docs)if(!ids.has(doc.id))operations.push({id:doc.id});}
 for(let offset=0;offset<operations.length;offset+=400){userId(c,uid);const batch=c.store.writeBatch(c.db);for(const op of operations.slice(offset,offset+400)){if(op.id)batch.delete(c.store.doc(c.db,'users',owner,name,op.id));else batch.set(c.store.doc(c.db,'users',owner,name,op.item.id),stamp(c,op.item));}await batch.commit();}
 if(operations.length)await touch(c,owner,name);return operations.length;}
export async function loadBggData(username,uid){const c=await connectCloud(),owner=userId(c,uid);const result=await Promise.all(['bggCollection','bggPlays'].map(name=>c.store.getDocs(c.store.query(c.store.collection(c.db,'users',owner,name),c.store.where('username','==',username)))));return {collection:result[0].docs.map(d=>withoutStamp(d.data())),plays:result[1].docs.map(d=>withoutStamp(d.data())).sort((a,b)=>b.date.localeCompare(a.date))};}
// 한 종류(collection·plays)의 since 이후 변경분과 이 사용자명의 전체 개수. 사용자명 조건은 색인 없이 받기 위해 기기에서 거른다.
export async function loadBggChanges(kind,username,uid,since){const c=await connectCloud(),owner=userId(c,uid),name=kind==='collection'?'bggCollection':'bggPlays',items=c.store.collection(c.db,'users',owner,name);const [changed,total]=await Promise.all([c.store.getDocsFromServer(c.store.query(items,c.store.where('updatedAt','>',c.store.Timestamp.fromMillis(since)))),c.store.getCountFromServer(c.store.query(items,c.store.where('username','==',username)))]);return {changed:changed.docs.map(d=>withoutStamp(d.data())).filter(item=>item.username===username),count:total.data().count};}
