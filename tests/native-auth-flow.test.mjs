import test from 'node:test';
import assert from 'node:assert/strict';
import {signInNativeGoogle} from '../native-auth-flow.js';
test('native Google token creates the existing Firebase JS session',async()=>{const session={id:'session'},calls=[];const result=await signInNativeGoogle({signInWithGoogle:async()=>({credential:{idToken:'google-id-token'}})},{session,auth:{GoogleAuthProvider:{credential:token=>({token})},signInWithCredential:async(s,c)=>{calls.push([s,c]);return {user:{uid:'same-firebase-user'}};}}});assert.equal(result.user.uid,'same-firebase-user');assert.deepEqual(calls,[[session,{token:'google-id-token'}]]);});
test('missing or oversized credentials never create a Firebase session',async()=>{let calls=0;const client={auth:{GoogleAuthProvider:{credential:()=>calls++}}};for(const result of [{}, {credential:{idToken:''}}, {credential:{idToken:'x'.repeat(16385)}}])await assert.rejects(signInNativeGoogle({signInWithGoogle:async()=>result},client));assert.equal(calls,0);});
test('Google cancellation is propagated without signing in',async()=>{await assert.rejects(signInNativeGoogle({signInWithGoogle:async()=>{throw Error('Cancelled');}},{}),/Cancelled/);});
