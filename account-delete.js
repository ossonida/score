import {connectCloud,login} from './cloud-records.js?v=174';
import {bggLinkRequest} from './bgg-link-client.js?v=71';
import {bggSearchUrl} from './firebase-config.js?v=64';
// 계정 삭제: BGG 연결 정보(워커) → 클라우드 기록·BGG 정보·설정 → Google 로그인 계정 순으로 지운다(account:false면 계정은 남긴다).
// Google은 최근에 로그인한 경우에만 계정 삭제를 허용하므로, 오래됐으면 같은 계정으로 다시 로그인을 받는다.
const recentMs=4*60*1000;
export async function deleteAccountData(uid,step=()=>{},{account=true}={}){
 const c=await connectCloud();let user=c.session.currentUser;if(!user||user.uid!==uid)throw Error('계정이 변경됐습니다. 다시 시도해주세요.');
 if(!(Date.now()-Date.parse(user.metadata?.lastSignInTime||'')<recentMs)){step('보안을 위해 같은 Google 계정으로 다시 로그인해주세요.');await login();user=c.session.currentUser;if(!user||user.uid!==uid)throw Error('같은 Google 계정으로 다시 로그인해야 삭제할 수 있습니다.');}
 if(bggSearchUrl){step('BGG 연결 정보를 삭제하는 중…');await bggLinkRequest('link-delete',{uid,body:{}});}
 step('클라우드 기록을 삭제하는 중…');let removed=0;
 for(const name of ['plays','bggCollection','bggPlays']){const docs=(await c.store.getDocs(c.store.collection(c.db,'users',uid,name))).docs;for(let offset=0;offset<docs.length;offset+=400){const batch=c.store.writeBatch(c.db);for(const doc of docs.slice(offset,offset+400))batch.delete(doc.ref);await batch.commit();}removed+=docs.length;}
 for(const name of ['identity','bgg','sync'])await c.store.deleteDoc(c.store.doc(c.db,'users',uid,'settings',name));
 if(!account)return removed;
 step('로그인 계정을 삭제하는 중…');
 try{await c.auth.deleteUser(user);}catch(error){if(error?.code==='auth/requires-recent-login')throw Error('클라우드 데이터는 삭제했습니다. 보안을 위해 다시 로그인한 뒤 계정 삭제를 한 번 더 눌러주세요.');throw error;}
 return removed;
}
