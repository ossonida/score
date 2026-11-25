// 게임별 통계 게임 머리 메뉴: 맨 위 취향 티어(누르면 메뉴를 닫고 tier.onOpen), BGG 게임이면 그 아래 컬렉션 관리(보유·하고 싶은·위시리스트·펀딩 체크박스), onDelete가 있으면 게임 삭제. triggers(머리 컬렉션 라벨)를 주면 ⋮ 대신 그 라벨들이 메뉴를 연다. 저장은 onChange가 맡고 돌려준 안내 문구를 보여 준다.
const choices=[['owned','보유'],['wantToPlay','하고 싶은'],['wishlist','위시리스트'],['preordered','펀딩']];
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
// 열기·닫기 공통: openers(⋮ 또는 라벨)를 누르면 토글, 바깥 누르기·Esc로 닫힘. 라벨로 열면 누른 라벨 바로 아래(왼쪽 맞춤, 화면 오른쪽을 넘으면 안쪽으로)에 띄운다.
// 한 번에 메뉴 하나만 연다(다른 메뉴가 열리면 앞의 것을 닫음).
let openMenu=null;
function dropdown(box,panel,openers,{open,onToggle,anchored}){
 let anchor=openers[0];
 const place=()=>{if(!anchored||panel.hidden||!anchor)return;const left=Number(anchor.offsetLeft)||0,top=(Number(anchor.offsetTop)||0)+(Number(anchor.offsetHeight)||0)+6;panel.style.left=left+'px';panel.style.top=top+'px';const r=panel.getBoundingClientRect?.(),limit=(window.innerWidth||0)-8;if(r&&limit>0&&r.right>limit)panel.style.left=(left-(r.right-limit))+'px';};
 const outside=event=>{if(box.isConnected===false){document.removeEventListener?.('pointerdown',outside);return;}if(!box.contains?.(event.target))setOpen(false);};
 function setOpen(value){if(value&&openMenu&&openMenu!==setOpen)openMenu(false);if(value)openMenu=setOpen;else if(openMenu===setOpen)openMenu=null;panel.hidden=!value;for(const o of openers)o.setAttribute('aria-expanded',String(value));if(value){document.addEventListener?.('pointerdown',outside);place();}else document.removeEventListener?.('pointerdown',outside);onToggle(value);}
 for(const o of openers){o.setAttribute('aria-haspopup','true');o.onclick=()=>{const reopen=!panel.hidden&&anchor!==o;anchor=o;setOpen(reopen||panel.hidden);};}
 box.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);anchor.focus?.();}});
 panel.hidden=!open;for(const o of openers)o.setAttribute('aria-expanded',String(open));if(open){openMenu=setOpen;document.addEventListener?.('pointerdown',outside);(window.requestAnimationFrame||setTimeout)(place);}
 return setOpen;
}
export function collectionMenu({tier=null,onDelete=null,triggers=null,label:menuLabel='',collection=true,status={},disabled='',hint='',open=false,onToggle=()=>{},onChange}){
 const box=el('div','collection-menu'),button=el('button','collection-menu-button'),panel=el('div','collection-menu-panel'),note=el('p','collection-menu-note'),current={...status},inputs=[];
 const label=menuLabel||(collection?'게임 메뉴':'취향 티어 메뉴'),openers=triggers||[button];
 button.type='button';button.innerHTML=icon;button.setAttribute('aria-label',label);
 panel.setAttribute('role','group');panel.setAttribute('aria-label',label);
 if(tier){const row=el('button','collection-menu-tier');row.type='button';row.dataset.tier=tier.id||'none';if(tier.color)row.style.setProperty('--tier-color',tier.color);row.append(el('span',undefined,'취향 티어'),el('strong',undefined,tier.id?tier.label:'정하기'));row.setAttribute('aria-haspopup','dialog');row.onclick=()=>{setOpen(false);tier.onOpen();};panel.append(row);}
 const lock=value=>{for(const input of inputs)input.disabled=value||!!disabled;};
 if(collection){
  if(tier)panel.append(el('p','collection-menu-label','BGG 컬렉션'));
  for(const [name,label] of choices){
   const row=el('label','collection-menu-option'),input=el('input');input.type='checkbox';input.checked=current[name]===true;input.disabled=!!disabled;
   // 실패하면 체크를 되돌리고 안내합니다.
   input.onchange=async()=>{const next={...current,[name]:input.checked===true};lock(true);
    try{const text=await onChange(next);Object.assign(current,next);note.textContent=typeof text==='string'?text:'';}catch(error){input.checked=current[name]===true;note.textContent=error?.message||'BGG에 저장하지 못했습니다. 다시 시도해주세요.';}finally{lock(false);}};
   inputs.push(input);row.append(input,el('span',undefined,label));panel.append(row);
  }
  note.textContent=disabled||hint;panel.append(note);
 }
 if(onDelete){const remove=el('button','collection-menu-delete','게임 삭제');remove.type='button';remove.onclick=()=>{setOpen(false);onDelete();};panel.append(remove);}
 const setOpen=dropdown(box,panel,openers,{open,onToggle,anchored:!!triggers});
 if(triggers){box.className+=' collection-menu-triggers';box.append(...triggers,panel);}else box.append(button,panel);
 return box;
}
// 머리 취향 라벨의 취향 선택 메뉴: 라벨 바로 아래에 최애·S·A·B·C·티어 없음(현재 값 체크). 고르면 닫고 onPick(id)로 저장을 맡긴다.
export function tierPicker({trigger,options,current='',open=false,onToggle=()=>{},onPick}){
 const box=el('div','collection-menu collection-menu-triggers tier-picker'),panel=el('div','collection-menu-panel');
 panel.setAttribute('role','radiogroup');panel.setAttribute('aria-label','취향 티어');
 for(const tier of options){const row=el('button','collection-menu-pick');row.type='button';row.setAttribute('role','radio');row.setAttribute('aria-checked',String((tier.id||'')===current));row.dataset.tier=tier.id||'none';if(tier.color)row.style.setProperty('--tier-color',tier.color);row.append(el('strong',undefined,tier.label));if(tier.note)row.append(el('small',undefined,tier.note));row.onclick=()=>{setOpen(false);onPick(tier.id||'');};panel.append(row);}
 const setOpen=dropdown(box,panel,[trigger],{open,onToggle,anchored:true});
 box.append(trigger,panel);return box;
}
