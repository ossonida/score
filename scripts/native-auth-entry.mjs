import {Capacitor,registerPlugin} from '@capacitor/core';
// Native-only bridge. Browser Firebase authentication remains in cloud-records.js.
const FirebaseAuthentication=registerPlugin('FirebaseAuthentication');
if(Capacitor.isNativePlatform())globalThis.ScoreNativeAuth={
 signInWithGoogle:()=>FirebaseAuthentication.signInWithGoogle(),
 signOut:()=>FirebaseAuthentication.signOut()
};

const Filesystem=registerPlugin('Filesystem'),Share=registerPlugin('Share');
if(Capacitor.isNativePlatform())globalThis.ScoreNativeFiles={async exportJson({filename,data}){
 if(!/^score-backup-[0-9-]+\.json$/.test(filename)||typeof data!=='string')throw Error('Invalid export');
 const result=await Filesystem.writeFile({path:'exports/'+filename,data,directory:'CACHE',encoding:'utf8',recursive:true});
 return Share.share({title:'Score 기록 백업',files:[result.uri],dialogTitle:'백업 파일 저장 · 공유'});
}};
