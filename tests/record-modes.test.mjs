import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlay,isPlay,recordMode,modeStats,resultLabel,playerOutcome,normalizePlay} from '../records-core.js';
import {editRecordedPlayer} from '../record-edit.js';
import {personalGame} from '../personal-stats.js';
import {rivalStats} from '../social-insights.js';
const person=(id,extra={})=>({id:id==='나'?'me':id,name:id,color:'#123456',score:null,...extra});
const play=(id,players,extra={})=>createPlay({game:{name:'테스트'},date:'2026-10-20',rule:'highest',players,...extra},id);
test('same game keeps five recording methods separate without mutating historical records',()=>{
 const records=[
  play('score',[person('나',{score:10,isSelf:true}),person('b',{score:5})]),
  play('win',[person('나',{winner:false,isSelf:true}),person('b',{winner:true})]),
  play('team',[person('나',{teamId:'team-1',teamName:'A팀',winner:true,isSelf:true}),person('b',{teamId:'team-2',teamName:'B팀',winner:false})]),
  play('rank',[person('나',{rank:2,isSelf:true}),person('b',{rank:1})]),
  play('coop',[person('나',{isSelf:true}),person('b')],{rule:'cooperative',cooperativeResult:'failure'})
 ];
 const before=JSON.stringify(records),groups=modeStats(records);
 assert.deepEqual(groups.map(g=>[g.mode,g.count]),[['highest',1],['win',1],['team',1],['rank',1],['cooperative',1]]);
 assert.equal(groups.find(g=>g.mode==='team').players[0].wins,1);
 assert.equal(personalGame(records,null,'team').total,1);
 assert.equal(personalGame(records,null,'cooperative').rate,0);
 assert.equal(JSON.stringify(records),before);
});
test('rank averages retain player count and joint firsts; unknown results stay out of denominator',()=>{
 const records=[play('two',[person('a',{rank:1}),person('b',{rank:1})]),play('four',[person('a',{rank:2}),person('b',{rank:1}),person('c',{rank:3}),person('d',{rank:4})])];
 const row=modeStats(records)[0].players.find(p=>p.name==='a');
 assert.equal(row.rate,.5);assert.deepEqual(row.sizes.map(s=>[s.size,s.average]),[[2,1],[4,2]]);
 assert.equal(resultLabel(records[0],records[0].players[0]),'공동 1위');
 assert.equal(personalGame(records,{primary:'a',aliases:[]},'rank').sizes[1].averageRank,2);
});
test('legacy BG Stats all-loss flags are removed',()=>{const legacy=play('bgstats:legacy',[person('a',{winner:false}),person('b',{winner:false})]),normalized=normalizePlay(legacy);assert.equal(recordMode(legacy),'win');assert.equal(recordMode(normalized),'unknown');assert.ok(normalized.players.every(person=>!('winner'in person)));});
test('known cooperative games recover shared results from legacy personal outcomes',()=>{for(const winner of [true,false]){const legacy=play('legacy-coop-'+winner,[person('a',{winner}),person('b',{winner})]),normalized=normalizePlay(legacy,{cooperative:true});assert.equal(recordMode(normalized),'cooperative');assert.equal(normalized.cooperativeResult,winner?'success':'failure');assert.ok(normalized.players.every(person=>!('winner'in person)));}});
test('cooperative outcomes and optional shared score survive serialization and validation',()=>{
 const success=play('success',[person('a')],{rule:'cooperative',cooperativeResult:'success',sharedScore:0});
 const failure=play('failure',[person('a')],{rule:'cooperative',cooperativeResult:'failure',sharedScore:-10.5});
 const legacy=play('legacy',[person('a',{winner:true,score:99})],{rule:'cooperative'});
 const groups=modeStats([success,failure,legacy]);assert.equal(groups[0].successRate,.5);assert.equal(groups[0].count,3);assert.equal(groups[0].known,2);
 assert.equal(isPlay(JSON.parse(JSON.stringify(success))),true);assert.equal(success.sharedScore,0);assert.equal(playerOutcome(legacy,legacy.players[0]),'unknown');
 assert.equal(modeStats([legacy])[0].successRate,null);
 for(const extra of [{cooperativeResult:'maybe'},{sharedScore:Infinity},{sharedScore:NaN},{sharedScore:'10'}])assert.throws(()=>play('bad',[person('a')],{rule:'cooperative',...extra}));
 assert.throws(()=>play('bad',[person('a')],{cooperativeResult:'success'}));
 const edited=editRecordedPlayer(success,'a','cooperativeResult','failure');assert.equal(edited.cooperativeResult,'failure');assert.equal(success.cooperativeResult,'success');
 assert.equal(editRecordedPlayer(edited,'a','sharedScore','').sharedScore,undefined);
 assert.equal(editRecordedPlayer(edited,'a','cooperativeResult','').cooperativeResult,undefined);
});
test('team edits update all members and rival statistics exclude teammates',()=>{
 const p=play('team',[person('a',{isSelf:true,teamId:'team-1',teamName:'A팀',winner:true}),person('friend',{teamId:'team-1',teamName:'A팀',winner:true}),person('opponent',{teamId:'team-2',teamName:'B팀',winner:false})]);
 assert.deepEqual(rivalStats([p],null).map(r=>[r.name,r.ahead]),[['opponent',1]]);
 assert.deepEqual(personalGame([p],null,'team').opponents.map(r=>r.name),['opponent']);
 const changed=editRecordedPlayer(p,'opponent','result','winner');
 assert.deepEqual(changed.players.map(p=>p.winner),[false,false,true]);
 const draw=editRecordedPlayer(changed,'a','result','draw');assert.ok(draw.players.every(p=>p.draw===true&&p.winner===undefined));
 assert.throws(()=>editRecordedPlayer(p,'a','result','rank:1'));assert.throws(()=>editRecordedPlayer(p,'a','score','10'));
 assert.equal(p.players[0].winner,true);
});
test('partial and conflicting team outcomes never invent team wins',()=>{
 const p=play('team',[person('a',{teamId:'team-1',teamName:'A팀',winner:true}),person('b',{teamId:'team-1',teamName:'A팀',winner:false}),person('c',{teamId:'team-2',teamName:'B팀',winner:false})]);
 assert.equal(playerOutcome(p,p.players[0]),'unknown');assert.equal(modeStats([p])[0].players[0].rate,null);
 assert.equal(recordMode(play('old',[person('a')])),'unknown');
});

test('cooperative mission attempts validate, summarize and stay out of manual result edits',async()=>{
 const {validMissionAttempts,missionSummary,missionLabel}=await import('../records-core.js');
 const {bggPlayForm}=await import('../bgg-play-format.js');
 const attempts=[{mission:4,result:'success'},{mission:5,result:'failure'},{mission:5,result:'failure'},{mission:5,result:'success'},{mission:6,result:'failure'}];
 const mission=play('mission',[person('a')],{rule:'cooperative',cooperativeResult:'success',missionAttempts:attempts});
 assert.deepEqual(mission.missionAttempts,attempts);assert.equal(isPlay(JSON.parse(JSON.stringify(mission))),true);
 assert.deepEqual(missionSummary(attempts),{first:4,last:6,lastCleared:5,cleared:2,attempts:5,next:6,result:'success'});
 assert.equal(missionSummary([{mission:999,result:'success'}]).next,999);assert.equal(missionSummary([]),null);
 assert.equal(missionLabel(attempts),'미션 4 → 6 · 클리어 2 · 시도 5');
 assert.equal(play('fail',[person('a')],{rule:'cooperative',cooperativeResult:'failure',missionAttempts:[{mission:1,result:'failure'}]}).cooperativeResult,'failure');
 for(const extra of [{cooperativeResult:'failure',missionAttempts:attempts},{cooperativeResult:'success',missionAttempts:[]},{cooperativeResult:'success',missionAttempts:[{mission:0,result:'success'}]},{cooperativeResult:'success',missionAttempts:[{mission:1000,result:'success'}]},{cooperativeResult:'success',missionAttempts:[{mission:1,result:'win'}]},{cooperativeResult:'success',missionAttempts:[{mission:1,result:'success',note:'x'}]},{cooperativeResult:'success',sharedScore:3,missionAttempts:[{mission:1,result:'success'}]},{cooperativeResult:'success',missionAttempts:Array.from({length:301},()=>({mission:1,result:'success'}))}])assert.throws(()=>play('bad',[person('a')],{rule:'cooperative',...extra}),undefined,JSON.stringify(extra).slice(0,80));
 assert.throws(()=>play('bad',[person('a')],{cooperativeResult:'success',missionAttempts:[{mission:1,result:'success'}]}));
 assert.equal(validMissionAttempts([{mission:1,result:'success'}]),true);
 assert.throws(()=>editRecordedPlayer(mission,'a','cooperativeResult','failure'),/시도 내역/);assert.throws(()=>editRecordedPlayer(mission,'a','sharedScore','3'),/시도 내역/);
 assert.equal(editRecordedPlayer(mission,'a','name','하늘').missionAttempts.length,5);
 const form=bggPlayForm({...mission,game:{name:'딥씨 크루',bggId:'123'}},'tester');assert.match(form.get('comments'),/Missions 4-6 · cleared 2 · 5 attempts\n\[ScoreCounter:mission\]/);
});

test('BGG game names with XML entities are shown decoded without touching other fields',async()=>{
 const {decodeXmlText,safeBggItems}=await import('../bgg-validation.js');
 assert.equal(decodeXmlText('Dungeons &amp; Dragons &#8211; &quot;Lords&quot; &#x26;amp;'),'Dungeons & Dragons – "Lords" &amp;');
 assert.equal(decodeXmlText('A &bogus; & B &#0;'),'A &bogus; & B &#0;');
 const play={id:'x',date:'2026-10-24',createdAt:'2026-10-24T00:00:00Z',rule:'highest',game:{name:'Ticket to Ride &amp; Friends',bggId:'9'},players:[{id:'a',name:'A',score:1}]};
 const fixed=normalizePlay(play);assert.equal(fixed.game.name,'Ticket to Ride & Friends');assert.equal(fixed.game.bggId,'9');assert.equal(play.game.name,'Ticket to Ride &amp; Friends');
 const clean={...play,game:{name:'Catan',bggId:'13'}};assert.equal(normalizePlay(clean),clean);
 const [item]=safeBggItems([{id:'13',gameId:'13',name:'Rock &amp; Roll'}],'collection');assert.equal(item.name,'Rock & Roll');
});
test('cooperative game stats summarize team results, shared scores and mission progress',async()=>{
 const {cooperativeStats}=await import('../record-view.js');
 const coop=(id,date,extra)=>play(id,[person('a'),person('b')],{rule:'cooperative',date,...extra});
 const plays=[
  coop('m2','2026-10-22',{cooperativeResult:'success',missionAttempts:[{mission:3,result:'failure'},{mission:3,result:'failure'},{mission:3,result:'success'},{mission:4,result:'failure'}]}),
  coop('m1','2026-10-21',{cooperativeResult:'success',missionAttempts:[{mission:1,result:'success'},{mission:2,result:'failure'},{mission:2,result:'success'}]}),
  coop('s1','2026-10-20',{cooperativeResult:'failure',sharedScore:12}),
  coop('s2','2026-10-23',{cooperativeResult:'success',sharedScore:20}),
  coop('u1','2026-10-19',{})
 ];
 const s=cooperativeStats(plays);
 assert.deepEqual([s.count,s.known,s.successes,s.failures,s.rate],[5,4,3,1,.75]);
 assert.deepEqual(s.recent,['failure','success','success','success']);
 assert.deepEqual(s.scores,{best:20,average:16,latest:20});
 assert.deepEqual({...s.missions,hardest:undefined},{next:4,best:3,cleared:3,attempts:7,average:7/4,hardest:undefined});assert.equal(s.missionOnly,false);assert.equal(cooperativeStats(plays.slice(0,2)).missionOnly,true);
 assert.deepEqual(s.missions.hardest,[{mission:3,count:3},{mission:2,count:2}]);
 const other=play('other',[person('a')],{game:{name:'다른 게임'},rule:'cooperative',cooperativeResult:'success',sharedScore:5});
 assert.equal(cooperativeStats([...plays,other]).missions,null);assert.equal(cooperativeStats([...plays,other]).scores,null);
});

test('scenario games show missions as scenario and act while other games keep mission numbers',async()=>{
 const {missionName,missionRange}=await import('../mission-names.js');
 assert.equal(missionName({name:'전지적 추리 시점'},1),'시나리오 1 · 1막');assert.equal(missionName({name:'전지적 추리시점'},6),'시나리오 2 · 2막');assert.equal(missionName('전지적추리시점',12),'시나리오 3 · 4막');
 assert.equal(missionRange({name:'전지적 추리 시점'},3,5),'시나리오 1 · 3막 → 시나리오 2 · 1막');
 assert.equal(missionName({name:'딥씨 크루'},3),'미션 3');assert.equal(missionRange({name:'딥씨 크루'},1,2),'미션 1 → 2');assert.equal(missionName(null,4),'미션 4');
});
