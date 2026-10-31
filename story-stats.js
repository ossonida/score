import {coopKind} from './records-core.js?v=156';
import {meIn} from './personal-stats.js?v=118';

// 스토리·추리 게임의 게임별 통계 카드: 추리(정답률·범인일 때 도주·사건 해결) / 스토리 결말(완주·결말 수집). 해당 기록이 없으면 그리지 않는다.
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const isMystery=play=>play.players.some(person=>person.culprit===true);
const escaped=play=>{const culprits=play.players.filter(person=>person.culprit===true);return culprits.length>0&&culprits.every(person=>person.winner===true);};

export function storyStats(plays,profile){
 const mystery=plays.filter(isMystery),story=plays.filter(play=>play.rule==='cooperative'&&coopKind(play)==='story'),mine={right:0,guessed:0,culprit:0,escaped:0},characters=new Set();
 for(const play of mystery){const me=play.players.find(person=>person.isSelf===true)||meIn(play,profile);if(!me)continue;if(me.character)characters.add(me.character);if(me.culprit===true){mine.culprit++;if(me.winner===true)mine.escaped++;}else if(me.guess==='right'||me.guess==='wrong'){mine.guessed++;if(me.guess==='right')mine.right++;}}
 const endings=new Map();for(const play of story){const row=endings.get(play.ending)||{name:play.ending,success:false,count:0};row.count++;if(play.cooperativeResult==='success')row.success=true;endings.set(play.ending,row);}
 return {mystery:mystery.length,solved:mystery.filter(play=>!escaped(play)).length,mine,characters:[...characters],story:story.length,storySuccess:story.filter(play=>play.cooperativeResult==='success').length,endings:[...endings.values()]};
}

function row(section,title,value){const line=el('div',undefined,'story-stat-row');line.append(el('span',title),el('strong',value));section.append(line);}
export function renderStoryStats(container,plays,profile){
 const s=storyStats(plays,profile);
 if(s.mystery){const section=el('section',undefined,'insight-card story-stats');section.append(el('h3','추리 기록'));
  row(section,'사건 해결',`${s.mystery}판 중 ${s.solved}번`);
  if(s.mine.guessed)row(section,'나의 추리 정답률',`${Math.round(s.mine.right/s.mine.guessed*100)}% · ${s.mine.guessed}번 중 ${s.mine.right}번`);
  if(s.mine.culprit)row(section,'범인이었을 때 도주',`${s.mine.culprit}번 중 ${s.mine.escaped}번`);
  if(s.characters.length)row(section,'맡았던 캐릭터',s.characters.join(', '));
  container.append(section);}
 if(s.story){const section=el('section',undefined,'insight-card story-stats');section.append(el('h3','스토리 결말'));
  row(section,'완주',`${s.story}판 중 성공 결말 ${s.storySuccess}번`);
  if(s.endings.length){const list=el('div',undefined,'story-endings');for(const ending of s.endings)list.append(el('span',`${ending.success?'✓':'✕'} ${ending.name}`,'story-ending-chip'+(ending.success?' is-success':'')));section.append(el('p','본 결말','story-stat-label'),list);}
  container.append(section);}
}
