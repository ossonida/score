export async function signInNativeGoogle(bridge,client){
 const result=await bridge.signInWithGoogle();const token=result?.credential?.idToken;
 if(typeof token!=='string'||!token||token.length>16384)throw Error('Google 인증 토큰을 받지 못했습니다. Firebase 설정을 확인해주세요.');
 const credential=client.auth.GoogleAuthProvider.credential(token);
 return client.auth.signInWithCredential(client.session,credential);
}
