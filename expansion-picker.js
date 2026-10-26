import {metadata,gameNames} from './bgg-metadata.js?v=170';
import {gameKey,EXPANSIONS_MAX} from './records-core.js?v=152';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const fold=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
// 기록 카드·저장 2단계의 확장 배지: 1개면 이름, 2개 이상이면 개수.
export function expansionLabel(list){if(!Array.isArray(list)||!list.length)return '';return list.length===1?'+ '+gameNames({name:list[0].name,bggId:list[0].id}).ko:'+ 확장 '+list.length;}
// BGG 게임 정보의 확장 목록에 가져온 BGG 컬렉션의 보유·위시·하고 싶은 상태를 붙입니다.
export function expansionChoices(game,collection=[]){const mine=new Map((Array.isArray(collection)?collection:[]).map(item=>[String(item.id),item]));return (metadata(game)?.expansions||[]).map(x=>{const s=mine.get(x.id);return {id:x.id,name:x.name,label:gameNames({name:x.name,bggId:x.id}).ko,owned:s?.owned===true,wishlist:s?.wishlist===true,wantToPlay:s?.wantToPlay===true};});}
// 같은 게임의 가장 최근 기록에 쓴 확장(지금 목록에 있는 것만).
export function lastExpansions(records,game,choices,skipId=''){const key=gameKey(game),ids=new Set(choices.map(x=>x.id)),last=[...records].filter(p=>p.id!==skipId&&gameKey(p.game)===key&&Array.isArray(p.expansions)&&p.expansions.length).sort((a,b)=>(b.date+'|'+(b.createdAt||'')).localeCompare(a.date+'|'+(a.createdAt||'')))[0];return last?last.expansions.filter(x=>ids.has(x.id)).map(x=>({id:x.id,name:x.name})):[];}
// 이름은 그릴 때마다 읽어 확장 게임 정보(한글 이름)를 늦게 받아도 redraw로 바뀝니다.
const nameOf=x=>gameNames({name:x.name,bggId:x.id}).ko;
const tagOf=x=>x.owned?'보유':x.wishlist?'위시':x.wantToPlay?'하고 싶은':'';
// 확장 칩 선택: 보유 → 위시·하고 싶은 → 선택한 확장 순으로 보여 주고, 나머지는 검색으로 찾습니다. 컬렉션 정보가 없으면 앞의 8개를 보여 줍니다.
export function createExpansionPicker({choices,selected=[],head=false,onChange=()=>{}}){
 const picked=new Map(selected.map(x=>[x.id,{id:x.id,name:x.name}])),root=el('div',undefined,'expansion-picker'),count=el('span','','expansion-picker-count'),chips=el('div',undefined,'expansion-chips'),search=el('input',undefined,'expansion-search');
 search.type='search';search.autocomplete='off';search.placeholder='다른 확장 검색 · 전체 '+choices.length+'개';search.setAttribute('aria-label','다른 확장 검색');
 if(head){const top=el('div',undefined,'expansion-picker-head');top.append(el('span','함께 사용한 확장 (선택)'),count);root.append(top);}
 const draw=()=>{const query=fold(search.value),tagged=choices.filter(x=>tagOf(x)),base=tagged.length?tagged:choices.slice(0,8),shown=new Map();
  for(const x of [...base.filter(x=>x.owned),...base.filter(x=>!x.owned),...choices.filter(x=>picked.has(x.id))])shown.set(x.id,x);
  if(query)for(const x of choices.filter(x=>fold(nameOf(x)).includes(query)||fold(x.name).includes(query)).slice(0,12))shown.set(x.id,x);
  chips.replaceChildren(...[...shown.values()].map(x=>{const on=picked.has(x.id),b=el('button',undefined,'expansion-chip'+(on?' selected':''));b.type='button';b.setAttribute('aria-pressed',String(on));b.append(el('span',on?'✓':'+','expansion-chip-mark'),el('span',nameOf(x),'expansion-chip-name'));const tag=tagOf(x);if(tag)b.append(el('span',tag,'expansion-chip-tag'));b.onclick=()=>{if(picked.has(x.id))picked.delete(x.id);else if(picked.size<EXPANSIONS_MAX)picked.set(x.id,{id:x.id,name:x.name});draw();onChange(value());};return b;}));
  count.textContent=picked.size+'개 선택';};
 const value=()=>choices.filter(x=>picked.has(x.id)).map(x=>({id:x.id,name:x.name}));
 search.oninput=draw;root.append(chips,search);draw();
 return {element:root,value,redraw:draw};
}
