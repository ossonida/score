import test from 'node:test';
import assert from 'node:assert/strict';
const {setProAccount,isPro,proOnlyText}=await import('../pro-access.js');

test('only the listed account is Pro until payments exist',()=>{
 assert.equal(isPro(),false);
 setProAccount({email:'someone@example.com'});assert.equal(isPro(),false);
 setProAccount({email:' AhnSsoni2@gmail.com '});assert.equal(isPro(),true);
 setProAccount(null);assert.equal(isPro(),false);
 assert.equal(proOnlyText(),'프로 버전에서 이용할 수 있습니다.');
});
