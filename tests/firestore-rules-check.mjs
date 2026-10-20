import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-score-security',firestore:{host:'127.0.0.1',port:8180,rules:await fs.readFile(process.env.SCORE_RULES_PATH||new URL('../firestore.rules',import.meta.url),'utf8')}});
try{
 const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
 const record={id:'one',game:{name:'Catan',bggId:'13'},date:'2026-10-12',rule:'highest',createdAt:'2026-10-12T00:00:00.000Z',players:[{id:'a',name:'A',score:1,color:'#ffffff'}]};
 await assertSucceeds(setDoc(doc(alice,'users/alice/plays/one'),record));
 await assertSucceeds(setDoc(doc(alice,'users/alice/plays/one'),{...record,location:'Board game cafe'}));
 await assertFails(setDoc(doc(alice,'users/alice/plays/one'),{...record,location:'x'.repeat(121)}));
 await assertFails(getDoc(doc(bob,'users/alice/plays/one')));await assertFails(setDoc(doc(bob,'users/alice/plays/one'),record));await assertFails(getDoc(doc(guest,'users/alice/plays/one')));
 await assertFails(setDoc(doc(alice,'users/alice/plays/one'),{...record,game:{name:'Bad',bggId:'x'}}));
 await assertSucceeds(setDoc(doc(alice,'users/alice/settings/bgg'),{username:'alice-bgg'}));
 await assertFails(setDoc(doc(bob,'users/alice/settings/bgg'),{username:'changed'}));
 const game={id:'13',gameId:'13',name:'Catan',username:'alice-bgg',year:'1995'};
 await assertSucceeds(setDoc(doc(alice,'users/alice/bggCollection/13'),game));await assertFails(setDoc(doc(bob,'users/alice/bggCollection/13'),game));
 await assertFails(setDoc(doc(alice,'users/alice/bggCollection/13'),{...game,id:'13',gameId:'99'}));
 await assertFails(setDoc(doc(alice,'users/alice/bggPlays/99'),{id:'99',gameId:'13',name:'Catan',username:'alice-bgg',date:'2026-10-12',quantity:-1,players:[]}));
 await assertFails(getDoc(doc(alice,'_bggLimits/alice')));await assertFails(setDoc(doc(alice,'_bggLimits/alice'),{count:0,start:0}));
 console.log('Firestore rules: 15 access/validation checks passed');
}finally{await env.cleanup();}
