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
