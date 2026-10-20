import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));

class Element{
 constructor(className=''){
  this.className=className;this.children=[];this.parent=null;this.dataset={};this.attributes={};this.listeners={};this.textContent='';this.clientWidth=388;this.isConnected=true;
  this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};
  this.classList={contains:c=>this.className.split(' ').includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');},toggle:(c,on)=>on?this.classList.add(c):this.classList.remove(c)};
 }
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 closest(selector){return this.classList.contains(selector.slice(1))?this:this.parent?.closest(selector)||null;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.classList.contains(selector.slice(1))?[child]:[]),...child.querySelectorAll(selector)]);}
 setPointerCapture(id){this.captured=id;}
 hasPointerCapture(id){return this.captured===id;}
 releasePointerCapture(){this.captured=null;}
 getBoundingClientRect(){return {left:24,top:100,width:70,height:36};}
 cloneNode(){const clone=new Element(this.className);clone.textContent=this.textContent;return clone;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.isConnected=false;}
 emit(type,props={}){
  const event={type,target:this,pointerId:1,isPrimary:true,pointerType:'touch',button:0,clientX:200,clientY:110,cancelable:true,detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){this.stopped=true;},...props};
  for(const fn of this.listeners[type]||[]){fn(event);if(event.stopped)break;}
  return event;
 }
}
function fixture(mode='team'){
 const players=[
  {id:'a1',name:'솔',color:'#ffcc00',score:null,teamId:'a',teamName:'A팀'},
  {id:'a2',name:'겨울',color:'#b44cdb',score:null,teamId:'a',teamName:'A팀'},
  {id:'b1',name:'누리',color:'#52c7ef',score:null,teamId:'b',teamName:'B팀'},
  {id:'c1',name:'퍼니',color:'#45d9a0',score:null,teamId:'c',teamName:'C팀'}
 ];
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},body=new Element(),timers=new Map();
 let timerId=0,hit=null;
 const context={players,resultEntry:{mode,previousPlayers:players.map(p=>({...p,score:12}))},swipedId:null,vibrations:[],navigator:{vibrate(duration){context.vibrations.push(duration);}},
  $:get,document:{createElement:()=>new Element(),body,elementFromPoint:()=>hit},
  getComputedStyle:()=>({color:'#10131a',backgroundColor:'#ffcc00'}),
  setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),Date,
  saves:0,opened:[],deleted:[],openPlayer:id=>context.opened.push(id),deletePlayer:(id,options)=>context.deleted.push([id,options]),
  render:()=>context.renderResultBoard(get('cards')),save:()=>{context.saves++;context.snapshot=JSON.parse(JSON.stringify({players:context.players,previousPlayers:context.resultEntry.previousPlayers}));context.render();}
 };
 vm.createContext(context);
 vm.runInContext([
  between('function ink(','function normalizeResultRanks'),
  between('function resultTeamDefinitions','function syncResultRosterPlayer'),
  between('function moveTeamPlayer','function setupRankDrag'),
  between('function renderResultBoard','function render(){'),
  between('function setupSwipe','function animateRanking')
 ].join('\n'),context);
 context.render=()=>{get('cards').replaceChildren();context.renderResultBoard(get('cards'));};
 context.render();
 return {context,get,body,teams:()=>get('cards').children,hit:node=>{hit=node;},hold:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
const content=team=>team.children[1],head=team=>content(team).children[0],chips=team=>content(team).children[1].children;

test('team and individual result buttons render 승 무 패 and update the selected result',()=>{
 for(const mode of ['team','win']){
  const a=fixture(mode),buttons=mode==='team'?head(a.teams()[0]).children[1].children:a.teams()[0].children[1].children[1].children;
  assert.deepEqual(buttons.map(b=>b.textContent),['승','무','패']);
  assert.equal(a.get('savePlay').disabled,true);
  buttons[0].onclick();
  assert.equal(a.context.players[0].winner,true);
  if(mode==='team'){
   assert.equal(a.context.players[1].winner,true);
   assert.equal(a.context.players[2].winner,false);
   assert.equal(head(a.teams()[0]).children[1].children[0].attributes['aria-pressed'],'true');
   assert.equal(a.get('savePlay').disabled,false);
  }
 }
});

test('team colors use distinct existing random player colors and survive rendering and draft restoration',()=>{
 const a=fixture(),before=a.teams().map(team=>team.style['--team-color']);
 assert.deepEqual(before,['#ffcc00','#52c7ef','#45d9a0']);
 a.context.save();a.context.players=JSON.parse(JSON.stringify(a.context.snapshot.players));a.context.render();
 assert.deepEqual(a.teams().map(team=>team.style['--team-color']),before);
});

test('short taps keep name editing and chip deletion without activating drag',()=>{
 const a=fixture(),chip=chips(a.teams()[0])[0];
 chip.emit('pointerdown');chip.emit('pointerup');a.hold();
 assert.equal(chip.emit('click').prevented,undefined);
 chip.children[0].onclick();chip.children[1].onclick();
 assert.deepEqual(a.context.opened,['a1']);assert.equal(a.context.deleted[0][0],'a1');assert.equal(a.context.deleted[0][1].confirm,false);
 assert.equal(a.body.children.length,0);assert.equal(a.context.saves,0);assert.deepEqual(a.context.vibrations,[]);
});

test('long press shows a detached preview, highlights target, moves once and suppresses the tap',()=>{
 const a=fixture(),team=a.teams()[0],chip=chips(team)[0],target=a.teams()[1];
 // The same pointer bubbles to the card, but a chip must never start its deletion swipe.
 chip.emit('pointerdown');team.emit('pointerdown',{target:chip});a.hold();
 assert.equal(chip.attributes['aria-grabbed'],'true');assert.equal(a.body.children.length,1);assert.deepEqual(a.context.vibrations,[45]);
 chip.emit('lostpointercapture',{target:chip.children[0]});
 assert.equal(chip.attributes['aria-grabbed'],'true');
 a.hit(target);chip.emit('pointermove',{clientX:110,clientY:260});team.emit('pointermove',{clientX:110,clientY:260,target:chip});
 assert.equal(target.classList.contains('team-drop-target'),true);
 assert.equal(content(team).style.transform,'');
 chip.emit('pointerup',{clientX:110,clientY:260});team.emit('pointerup',{clientX:110,clientY:260,target:chip});
 assert.equal(a.context.players.find(p=>p.id==='a1').teamId,'b');assert.equal(a.context.players.length,4);
 assert.equal(a.context.saves,1);assert.equal(a.body.children.length,0);assert.equal(chip.emit('click').prevented,true);
 assert.equal(a.context.snapshot.players.find(p=>p.id==='a1').teamId,'b');
 a.context.players=JSON.parse(JSON.stringify(a.context.snapshot.players));a.context.render();
 assert.equal(chips(a.teams().find(t=>t.dataset.teamId==='b')).length,2);
});

test('unsupported or blocked haptics never interrupt visual selection or dropping',()=>{
 for(const vibrate of [undefined,()=>false,()=>{throw new Error('blocked');}]){
  const a=fixture(),chip=chips(a.teams()[0])[0];
  a.context.navigator.vibrate=vibrate;
  chip.emit('pointerdown');a.hold();
  assert.equal(chip.attributes['aria-grabbed'],'true');assert.equal(a.body.children.length,1);
  a.hit(a.teams()[1]);chip.emit('pointermove',{clientY:260});chip.emit('pointerup',{clientY:260});
  assert.equal(a.context.players.find(p=>p.id==='a1').teamId,'b');assert.equal(a.context.saves,1);assert.equal(a.body.children.length,0);
 }
});

test('cancelled, outside and last-member drops preserve membership',()=>{
 for(const kind of ['cancel','capture-loss','outside','last']){
  const a=fixture(),chip=chips(a.teams()[kind==='last'?1:0])[0];
  chip.emit('pointerdown');a.hold();a.hit(kind==='outside'?null:a.teams()[2]);chip.emit('pointermove',{clientY:400});
  chip.emit(kind==='cancel'?'pointercancel':kind==='capture-loss'?'lostpointercapture':'pointerup',{clientY:400});
  assert.equal(a.context.saves,0);assert.equal(a.context.players[0].teamId,'a');assert.equal(a.context.players[2].teamId,'b');assert.equal(a.body.children.length,0);
  if(kind==='last')assert.match(a.get('scorelessBoardError').textContent,/한 명 이상/);
 }
});

test('team swipe deletes its whole roster from live and base state and persists without touching other names or scores',()=>{
 const a=fixture(),team=a.teams()[0];
 team.emit('pointerdown',{target:head(team)});team.emit('pointermove',{clientX:60});
 assert.equal(content(team).style.transform,'translateX(-140px)');
 team.emit('pointerup',{clientX:60});
 assert.equal(a.context.saves,1);assert.deepEqual(Array.from(a.context.players,p=>p.id),['b1','c1']);
 assert.deepEqual(Array.from(a.context.resultEntry.previousPlayers,p=>[p.name,p.score]),[['누리',12],['퍼니',12]]);
 assert.deepEqual(a.context.snapshot.previousPlayers.map(p=>p.id),['b1','c1']);
 const last=a.teams()[0];last.emit('pointerdown');last.emit('pointermove',{clientX:60});last.emit('pointerup',{clientX:60});
 assert.equal(a.context.saves,1);assert.equal(a.context.players.length,2);assert.match(a.get('scorelessBoardError').textContent,/최소 2팀/);
});

test('short, vertical and cancelled team swipes never delete',()=>{
 for(const kind of ['short','vertical','cancel']){
  const a=fixture(),team=a.teams()[0];
  team.emit('pointerdown');const end=kind==='short'?{clientX:180}:kind==='vertical'?{clientX:190,clientY:250}:{clientX:80};
  team.emit('pointermove',end);team.emit(kind==='cancel'?'pointercancel':'pointerup',end);
  assert.equal(a.context.players.length,4);assert.equal(a.context.saves,0);
 }
});
