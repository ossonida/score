import {Capacitor,registerPlugin} from '@capacitor/core';
// Native-only bridge. Browser Firebase authentication remains in cloud-records.js.
const FirebaseAuthentication=registerPlugin('FirebaseAuthentication');
if(Capacitor.isNativePlatform())globalThis.ScoreNativeAuth={
 signInWithGoogle:()=>FirebaseAuthentication.signInWithGoogle(),
 signOut:()=>FirebaseAuthentication.signOut()
};
