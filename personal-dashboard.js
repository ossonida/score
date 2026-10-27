import {recordMode,modeLabels,resultLabel,missionSummary,coopKind as playCoopKind,scenarioAttempt,coopDifficultyStats,coopCampaignStats} from './records-core.js?v=152';
import {missionName,missionRange} from './mission-names.js?v=4';
import {renderModeStats,cooperativeStats} from './record-view.js?v=133';
import {metadata,domainLabels,gameNames} from './bgg-metadata.js?v=171';
import {renderGameArtwork} from './game-artwork.js?v=171';
import {namesIn,readIdentity,saveIdentity,personalGame} from './personal-stats.js?v=115';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const num=n=>n===null||n===undefined?'—':n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const ruleName=rule=>modeLabels[rule]||rule;
function section(title,cls=''){const box=el('section',undefined,'insight-card '+cls);box.append(el('h3',title));return box;}
function note(box,text){box.append(el('p',text,'insight-footnote'));}
export function renderIdentitySettings(container,records,scope,onChange){
 if(!container)return;container.replaceChildren();const names=namesIn(records);let profile=readIdentity(scope);const form=el('form',undefined,'identity-form');
 if(!names.length){note(container,'기록을 저장하거나 가져오면 내 이름을 선택할 수 있습니다.');return;}
 const label=el('label','기존 기록에서 사용된 내 닉네임을 지정할 수 있습니다. 닉네임이 여러 개라면 다른 닉네임도 지정할 수 있습니다.'),select=el('select');select.setAttribute('aria-label','기록 속 내 닉네임');const empty=el('option','닉네임 선택');empty.value='';select.append(empty);
 for(const [key,name]of names){const option=el('option',name);option.value=key;select.append(option);}if(profile&&names.some(([key])=>key===profile.primary))select.value=profile.primary;
 label.append(select);form.append(label);const selected=el('div',undefined,'identity-selected'),details=el('details',undefined,'identity-more'),summary=el('summary','다른 이름도 사용하나요? 닉네임 연결'),choices=el('div',undefined,'identity-chips'),feedback=el('p',undefined,'insight-footnote');feedback.setAttribute('role','status');details.append(summary,choices);form.append(selected,details,feedback);
 function save(next){try{saveIdentity(scope,next);profile=readIdentity(scope);onChange();feedback.textContent='저장되었습니다.';return true;}catch{feedback.textContent='저장하지 못했습니다. 다시 시도해주세요.';return false;}}
 function draw(){selected.replaceChildren();choices.replaceChildren();const primary=select.value,aliases=new Set(profile?.aliases||[]);details.hidden=!primary||names.length<2;selected.hidden=!primary||!aliases.size;
  for(const [key,name]of names){if(key===primary)continue;const linked=aliases.has(key),button=el('button',name,'identity-chip');button.type='button';button.setAttribute('aria-pressed',String(linked));button.onclick=()=>{const next=new Set(profile?.aliases||[]);if(next.has(key))next.delete(key);else next.add(key);if(save({primary,aliases:[...next]}))draw();};choices.append(button);
   if(linked){const chip=el('button',name+' ×','identity-chip identity-linked');chip.type='button';chip.setAttribute('aria-label',name+' 닉네임 연결 해제');chip.onclick=()=>{if(save({primary,aliases:[...aliases].filter(x=>x!==key)}))draw();};selected.append(chip);}
  }
 }
 select.onchange=()=>{const next={primary:select.value,aliases:select.value?(profile?.aliases||[]).filter(x=>x!==select.value):[]};if(!save(next))select.value=profile?.primary||'';draw();};form.onsubmit=event=>event.preventDefault();draw();container.append(form);
}
// 게임별 통계 머리: 표지, 한글 게임명과 그 아래 영문명, 유형. 기록이 없는 게임에도 씁니다.
export function renderGameTitle(game,action){const names=gameNames(game),title=el('div',undefined,'game-title-row'),art=el('a',undefined,'game-artwork');if(game?.bggId){art.href='https://boardgamegeek.com/boardgame/'+game.bggId;art.target='_blank';art.rel='noopener noreferrer';art.setAttribute('aria-label',names.ko+' · BGG에서 보기');}renderGameArtwork(art,game);const copy=el('div',undefined,'game-title-copy'),info=metadata(game),types=info?.domains.map(d=>domainLabels[d]).filter(Boolean)||[];if(!types.length)types.push(info?'유형 미지정':'유형 정보 없음');if(info?.cooperative)types.push('협동');copy.append(el('h2',names.ko||'게임 통계'));if(names.en)copy.append(el('p',names.en,'game-alt-name'));copy.append(el('p',types.join(' · '),'game-type-label'));title.append(art,copy);const extra=action?.(game);if(extra)title.append(extra);return title;}
export function renderPersonalGame(container,records,onOpen,{scope='guest',allRecords=records,onIdentityChange=()=>{},titleAction}={}){
 const previousRule=container.querySelector('.personal-rule')?.value;
 container.replaceChildren();
 const profile=readIdentity(scope),game=records[0]?.game;
 const overview=el('section',undefined,'insight-hero game-overview');
 overview.append(renderGameTitle(game,titleAction));
 const scores=records.filter(p=>['highest','lowest'].includes(recordMode(p))).flatMap(p=>p.players.map(x=>x.score)).filter(x=>typeof x==='number');
 const best=scores.length?scores.reduce((a,b)=>Math.max(a,b)):null;
 const metrics=el('div',undefined,'insight-metrics');
 for(const [value,label]of[[num(records.length)+'회','전체 플레이'],[num(best),'전체 최고점']]){
  const metric=el('div');metric.append(el('strong',value),el('span',label));metrics.append(metric);
 }
 const personal=personalGame(records,profile,previousRule);if(!personal.total)overview.append(metrics);container.append(overview);
 const configured=Boolean(profile?.primary||records.some(p=>p.players.filter(x=>x.isSelf===true).length===1));
 const heading=el('div',undefined,'personal-game-heading');heading.append(el('h2','나의 기록'));container.append(heading);
 if(!configured){renderModeStats(container,records);return;}
 const initial=personal;
 const controls=el('div',undefined,'personal-controls'),ruleLabel=el('label','기록 방식'),rule=el('select',undefined,'personal-rule');
 for(const value of initial.rules){const option=el('option',ruleName(value));option.value=value;rule.append(option);}
 rule.value=initial.rule;ruleLabel.append(rule);controls.append(ruleLabel);controls.hidden=initial.rules.length<2;container.append(controls);
 const content=el('div');container.append(content);
 function draw(){
  const s=personalGame(records,profile,rule.value);content.replaceChildren();
  if(s.ambiguous)note(content,`이름이 중복된 ${s.ambiguous}개 기록은 제외했습니다. 내 플레이어 지정을 확인해주세요.`);
  if(!s.total){note(content,'이 게임에 내 기록이 없습니다. 내 플레이어 지정을 확인해주세요.');return;}
  const hero=el('section',undefined,'insight-hero personal-hero'),metrics=el('div',undefined,'insight-metrics personal-metrics');
  const scored=['highest','lowest'].includes(s.rule),coop=s.rule==='cooperative',ranked=s.rule==='rank';
  const hasMissions=play=>Array.isArray(play.missionAttempts)&&play.missionAttempts.length>0,missionPlays=coop?s.entries.map(x=>x.play).filter(hasMissions):[],m=missionPlays.length?cooperativeStats(missionPlays).missions:null,missionGame=missionPlays[0]?.game;const coopPlays=coop?s.entries.map(x=>x.play):[],coopKindOf=kind=>coopPlays.some(p=>playCoopKind(p)===kind),ck=!coop||m?'':coopKindOf('difficulty')?'difficulty':coopKindOf('campaign')?'campaign':'score',diff=ck==='difficulty'?coopDifficultyStats(coopPlays):null,camp=ck==='campaign'?coopCampaignStats(coopPlays):null;
  const values=diff?[[num(s.total)+'회','플레이'],[num(s.wins)+'회','성공'],[s.rate===null?'—':num(s.rate*100)+'%','성공률'],[diff.best||'—','최고 성공 난이도']]:camp?[[num(s.total)+'회','플레이'],[num(camp.rows.length)+'개','진행한 시나리오'],[num(camp.cleared)+'개','클리어 시나리오'],[camp.current?'시나리오 '+camp.current:'—','현재 진행 위치']]:m?[[num(s.total)+'회','플레이'],[m.best?missionName(missionGame,m.best):'—','최고 클리어'],[num(m.cleared)+'개','클리어 미션'],[num(m.average)+'회','미션당 평균 시도']]:[[num(s.total)+'회','플레이'],[num(s.wins)+'회',coop?'성공':ranked?'1위':s.rule==='team'?'팀 승리':'승리'],[s.rate===null?'—':num(s.rate*100)+'%',coop?'성공률':ranked?'1위 비율':s.rule==='team'?'팀전 승률':'승률'],...(scored?[[num(s.best?.person.score),s.rule==='lowest'?'개인 최저점':'개인 최고점']]:coop?[[num(s.losses)+'회','실패']]:ranked?[]:[[num(s.draws)+'회','무승부']])];
  for(const [value,label]of values){
   const box=el('div');box.append(el('strong',value),el('span',label));metrics.append(box);
  }
  hero.append(metrics);note(hero,camp?`다음 시나리오 ${camp.current} · 총 시도 ${num(camp.attempts)}회`:diff?`협력 · 난이도형 · 결과 확인 ${s.known}회`:m?`다음 ${missionName(missionGame,m.next)}부터 · 총 시도 ${num(m.attempts)}회${missionPlays.length<s.total?` · 미션 없이 기록한 ${s.total-missionPlays.length}회 제외`:''}`:scored?`평균 ${num(s.average)}점 · ${ruleName(s.rule)}`:`${ruleName(s.rule)} · 결과 확인 ${s.known}회 · 미입력 ${s.total-s.known}회`);
  if(s.best){const button=el('button',`${s.best.play.date} · 개인 기록 보기 ↗`,'insight-link');button.type='button';button.onclick=()=>onOpen(s.best.play.id);hero.append(button);}
  content.append(hero);
  const layout=el('div',undefined,'personal-sections');
  if(scored){const growth=section('점수 추이','personal-growth');
  if(s.comparable){growth.append(el('p',s.delta===0?'최근 5경기 평균 변화 없음':`최근 5경기 평균 ${s.delta>0?'+':'−'}${num(Math.abs(s.delta))}점`,'growth-summary'));note(growth,`이전 5경기 ${num(s.previousAverage)}점 → 최근 5경기 ${num(s.currentAverage)}점`);}
  else note(growth,`최근 최대 5경기 평균 ${num(s.currentAverage)}점`);
  drawChart(growth,s.entries,s.best);layout.append(growth);}
  if(ck==='score'){const shared=s.entries.filter(x=>Number.isFinite(x.play.sharedScore));if(shared.length){const values=shared.map(x=>x.play.sharedScore),growth=section('공동 점수 추이','personal-growth');note(growth,`최고 ${num(Math.max(...values))}점 · 평균 ${num(values.reduce((a,b)=>a+b,0)/values.length)}점`);drawChart(growth,shared.map(x=>({play:x.play,person:{score:x.play.sharedScore}})),null);layout.append(growth);}}
  const recent=section('최근 경기','personal-recent');
  for(const {play,person,rank,won}of s.recent){
   const button=el('button',undefined,'game-score-row');button.type='button';button.append(el('span',`${play.date} · ${play.players.length}인`),...(hasMissions(play)?(sum=>[el('strong',missionRange(play.game,sum.first,sum.last)),el('small',`클리어 ${sum.cleared} · 시도 ${sum.attempts}`)])(missionSummary(play.missionAttempts)):[el('strong',scored?(person.score===null?'점수 없음':num(person.score)+'점'):resultLabel(play,person)),el('small',scored?`${won?'우승 · ':''}${rank?rank.value+'위':''}`:s.rule==='team'?person.teamName||'팀전':coop?(playCoopKind(play)==='difficulty'?play.difficulty+' 난이도':playCoopKind(play)==='campaign'?`시나리오 ${play.scenario} · ${scenarioAttempt(coopPlays,play)}번째 도전`:play.sharedScore===undefined?'참여자 '+play.players.length+'명':num(play.sharedScore)+'점 · 공동'):'')]));button.onclick=()=>onOpen(play.id);recent.append(button);
  }
  layout.append(recent);
  if(diff){const box=section('난이도별 성적','personal-sizes');for(const r of diff.rows){const line=el('div',undefined,'personal-comparison');line.append(el('strong',r.level),el('span',`${r.tries}전 ${r.wins}승 · ${num(r.wins/r.tries*100)}%`));box.append(line);}layout.append(box);}
  if(camp){const box=section('시나리오별 기록','personal-sizes');for(const r of camp.rows){const line=el('div',undefined,'personal-comparison');line.append(el('strong',`시나리오 ${r.scenario}`),el('span',`시도 ${r.tries}회 · ${r.cleared?'성공':'진행 중'}`));box.append(line);}layout.append(box);}
  if(m?.hardest.length){const hard=section('어려웠던 미션','personal-sizes');for(const h of m.hardest){const line=el('div',undefined,'personal-comparison');line.append(el('strong',missionName(missionGame,h.mission)),el('span',`시도 ${h.count}회`));hard.append(line);}layout.append(hard);}
  const sizes=section('인원별 성적','personal-sizes');
  for(const row of s.sizes){const line=el('div',undefined,'personal-comparison');const sizeMissions=m?missionPlays.filter(play=>play.players.length===row.size):[];line.append(el('strong',`${row.size}인`),el('span',sizeMissions.length?`${row.count}회 · 미션당 평균 시도 ${num(cooperativeStats(sizeMissions).missions.average)}회`:`${row.count}회 · ${ranked?`평균 ${num(row.averageRank)}위 · 1위 ${row.wins}회`:row.known?`${row.wins}${coop?'회 성공':'승'} · ${num(row.wins/row.known*100)}%`:'결과 정보 없음'}`));sizes.append(line);}
  layout.append(sizes);content.append(layout);
  const methods=el('details',undefined,'stats-methods');methods.append(el('summary','통계 집계 기준'));
  if(scored)note(methods,`점수는 점수가 있는 ${s.scoreCount}경기, 승률은 승자를 확인한 경쟁 ${s.known}경기 기준입니다. 공동 승리는 우승에 포함하며 협력 게임은 개인 승률에서 제외합니다. 인원별 승률도 같은 기준입니다.`);
  if(scored)note(methods,'점수 추이는 경기 순서로 표시합니다. 같은 날 가져온 기록의 실제 순서는 다를 수 있으며 빈 점수는 연결하지 않습니다. 최근 10경기 모두에 점수가 있고 두 5경기 묶음의 날짜 경계가 구분될 때 평균을 비교합니다.');
  if(m)note(methods,'미션 기록은 한 번이라도 미션을 클리어하면 성공으로 저장되므로 성공률 대신 미션 진행으로 집계합니다. 미션당 평균 시도는 시도한 미션 수 기준입니다.');
  if(!scored&&!m)note(methods,'기록 방식을 구분해 집계합니다. 승률·1위 비율·성공률은 결과가 확인된 경기만 기준으로 합니다. 공동 1위는 1위에 포함하고 평균 순위는 참가 인원별로 계산합니다. 팀전은 내 팀의 결과를 사용하며 협력은 경기 전체 결과만 사용합니다.');if(scored)note(methods,'개인 기록 갱신은 같은 게임·승리 조건에서 이전 날짜의 개인 최고·최저점을 넘어선 경우에만 표시합니다. 첫 기록과 동점은 갱신으로 표시하지 않습니다.');content.append(methods);
 }
 rule.onchange=draw;draw();
}
function drawChart(container,entries,best){
 const rows=entries.slice(-30),scored=rows.filter(x=>typeof x.person.score==='number');if(!scored.length){note(container,'점수가 저장된 경기가 아직 없습니다.');return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 210');svg.setAttribute('class','personal-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',rows.map(x=>`${x.play.date}: ${x.person.score===null?'점수 없음':num(x.person.score)+'점'}`).join(', '));
 const create=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
 const values=scored.map(x=>x.person.score),min=Math.min(...values),max=Math.max(...values),range=max-min||1,x=i=>55+i*525/Math.max(1,rows.length-1),y=value=>165-(value-min)/range*135;
 for(const value of [...new Set([min,max])]){create('line',{x1:50,y1:y(value),x2:585,y2:y(value),stroke:'#304763'});create('text',{x:43,y:y(value)+4,'text-anchor':'end',fill:'#9bb2ce','font-size':16},num(value));}
 let path=[];function flush(){if(path.length>1)create('polyline',{points:path.join(' '),fill:'none',stroke:'#79bbff','stroke-width':3});path=[];}
 rows.forEach((entry,i)=>{if(typeof entry.person.score!=='number'){flush();return;}const px=x(i),py=y(entry.person.score);path.push(`${px},${py}`);const point=create('circle',{cx:px,cy:py,r:entry.play.id===best?.play.id?6:4,fill:entry.play.id===best?.play.id?'#ffcf79':'#8ec9ff'});const title=document.createElementNS(ns,'title');title.textContent=`${entry.play.date} · ${num(entry.person.score)}점${entry.play.id===best?.play.id?' · 개인 기록':''}`;point.append(title);});flush();
 create('text',{x:55,y:197,fill:'#9bb2ce','font-size':16},rows[0].play.date);if(rows.length>1)create('text',{x:585,y:197,'text-anchor':'end',fill:'#9bb2ce','font-size':16},rows.at(-1).play.date);container.append(svg);note(container,'최근 30경기 · 금색은 개인 기록');
}
