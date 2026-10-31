import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({append(){},children:[]})};
const {createPlay,recordMode,coopKind,winnerIds}=await import('../records-core.js');
const {recentShareData}=await import('../stats-share.js');
const {storyStats}=await import('../story-stats.js');
const base={game:{name:'시장 남상근의 죽음',bggId:''},date:'2026-10-31',rule:'highest'};
const mystery=(id,escaped)=>createPlay({...base,players:[
 {id:'a',name:'나',color:'#52c7ef',score:null,isSelf:true,guess:'right',winner:!escaped},
 {id:'b',name:'민수',color:'#ffcc00',score:null,culprit:true,character:'시장 비서',winner:escaped},
 {id:'c',name:'지영',color:'#ff6b6b',score:null,guess:'wrong',winner:false}]},id);

test('mystery plays save culprit, guess and character and count winners from them',()=>{
 const play=mystery('m1',false);
 assert.equal(recordMode(play),'mystery');assert.deepEqual(winnerIds(play),['a']);
 assert.deepEqual(play.players.map(p=>[p.culprit===true,p.guess||'',p.character||'']),[[false,'right',''],[true,'','시장 비서'],[false,'wrong','']]);
 assert.throws(()=>createPlay({...base,players:[{id:'a',name:'나',color:'#52c7ef',score:null,culprit:true,guess:'right'}]}),/추리 기록/);
});

test('story endings save an ending name on co-op plays only',()=>{
 const play=createPlay({...base,rule:'cooperative',cooperativeResult:'success',ending:' 진엔딩 ',players:[{id:'a',name:'나',color:'#52c7ef',score:null}]},'s1');
 assert.equal(play.ending,'진엔딩');assert.equal(coopKind(play),'story');
 assert.throws(()=>createPlay({...base,ending:'진엔딩',players:[{id:'a',name:'나',color:'#52c7ef',score:null}]}),/결말 이름/);
});

test('shares hide the culprit and ending name; stats count guesses, escapes and endings',()=>{
 const data=recentShareData([mystery('m1',false)],null,'ko-KR');
 assert.deepEqual([data.games[0].mission,data.games[0].winners],['사건 해결 · 추리 성공 1/2명',[]]);
 assert.equal(recentShareData([mystery('m2',true)],null,'ko-KR').games[0].mission,'범인 도주');
 const story=createPlay({...base,rule:'cooperative',cooperativeResult:'failure',ending:'배드엔딩',players:[{id:'a',name:'나',color:'#52c7ef',score:null}]},'s2');
 assert.equal(recentShareData([story],null,'ko-KR').games[0].mission,'실패 결말');
 const s=storyStats([mystery('m1',false),mystery('m2',true),story],null);
 assert.deepEqual([s.mystery,s.solved,s.mine.right,s.mine.guessed,s.story,s.endings.map(e=>e.name)],[2,1,2,2,1,['배드엔딩']]);
});
