import {createRemoteJWKSet,jwtVerify} from 'jose';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export async function verifyFirebaseToken(token,project,keyset=keys){
 if(!project)throw Error('Missing project');
 const {payload}=await jwtVerify(token,keyset,{algorithms:['RS256'],issuer:'https://securetoken.google.com/'+project,audience:project,requiredClaims:['exp','iat','auth_time','sub']});
 const now=Math.floor(Date.now()/1000);
 if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||!Number.isFinite(payload.auth_time)||payload.auth_time>now||!Number.isFinite(payload.iat)||payload.iat>now)throw Error('Invalid Firebase claims');
 return payload.sub;
}
