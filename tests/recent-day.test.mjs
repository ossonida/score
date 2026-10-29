import test from 'node:test';
import assert from 'node:assert/strict';

class Element{
 constructor(tag){this.tagName=String(tag).toUpperCase();this.children=[];this.attributes={};this.style={setProperty(){},removeProperty(){}};this.dataset={};this.textContent='';this.className='';this.classList={add(){},remove(){},toggle(){},contains:()=>false};}
 append(...nodes){for(const node of nodes)this.children.push(typeof node==='string'?Object.assign(new Element('#text'),{textContent:node}):node);}
 prepend(...nodes){this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 removeAttribute(k){delete this.attributes[k];}
 addEventListener(){}
 querySelector(){return null;}
 querySelectorAll(){return [];}
}
globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
const {renderOverview}=await import('../overview-dashboard.js');
const walk=(node,out=[])=>{out.push(node);for(const child of node.children||[])walk(child,out);return out;};
const headings=root=>walk(root).filter(n=>n.tagName==='H3').map(n=>n.textContent);
const play=(id,date,extra={})=>({id,date,createdAt:date+'T12:00:00Z',game:{name:'테스트 게임',bggId:''},rule:'highest',players:[{id:'a',name:'나',score:30,winner:true},{id:'b',name:'민수',score:20,winner:false}],...extra});
const coop=(id,date,extra={})=>play(id,date,{rule:'cooperative',cooperativeResult:'success',players:[{id:'a',name:'나',score:null},{id:'b',name:'민수',score:null}],...extra});

test('recent highlights skip empty cards and show co-op results for a co-op-only day',()=>{
 const root=new Element('div');
 renderOverview(root,[play('old','2026-10-01'),coop('c1','2026-10-22',{coopKind:'difficulty',difficulty:'영웅'})],{scope:'test',view:'recent',onGame(){},onRecord(){}});
 assert.deepEqual(headings(root).filter(h=>h!=='테스트 게임'),['협력 게임','이날 플레이한 게임']);
 assert.ok(walk(root).some(n=>n.textContent==='영웅 난이도 성공'),'co-op row uses the share wording');
 assert.ok(!walk(root).some(n=>/없습니다|필요합니다/.test(n.textContent)),'no empty-state cards');
});

test('recent day navigation moves between play days and disables the ends',()=>{
 const records=[play('a','2026-10-01'),play('b','2026-10-05'),coop('c','2026-10-22')],days=['2026-10-01','2026-10-05','2026-10-22'],moved=[];
 const render=index=>{const root=new Element('div');renderOverview(root,records.filter(p=>p.date<=days[index]),{scope:'test',view:'recent',onGame(){},onRecord(){},dayNav:{days,index,total:days.length,onDay:day=>moved.push(day)}});return root;};
 const middle=render(1),[prev,next]=walk(middle).filter(n=>n.tagName==='BUTTON'&&['‹','›'].includes(n.textContent));
 assert.equal(walk(middle).find(n=>n.tagName==='H2').textContent,'10월5일 게임기록');
 assert.ok(walk(middle).some(n=>n.textContent==='플레이한 날 2/3'));
 assert.equal(prev.disabled,false);assert.equal(next.disabled,false);
 prev.onclick();next.onclick();assert.deepEqual(moved,['2026-10-01','2026-10-22']);
 const first=render(0),[firstPrev]=walk(first).filter(n=>n.tagName==='BUTTON'&&n.textContent==='‹');assert.equal(firstPrev.disabled,true);
 assert.ok(headings(first).includes('이날의 승자'));
 const single=new Element('div');renderOverview(single,[play('only','2026-10-01')],{scope:'test',view:'recent',onGame(){},onRecord(){},dayNav:{days:['2026-10-01'],index:0,total:1,onDay(){}}});
 assert.ok(!walk(single).some(n=>n.textContent==='‹'),'one play day hides the navigator');
});
