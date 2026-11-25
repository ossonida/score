// 게임별 통계 게임 머리 메뉴: 맨 위 취향 티어(누르면 메뉴를 닫고 tier.onOpen), BGG 게임이면 그 아래 컬렉션 관리(보유·하고 싶은·위시리스트·펀딩 체크박스), onDelete가 있으면 게임 삭제. triggers(머리 컬렉션 라벨)를 주면 ⋮ 대신 그 라벨들이 메뉴를 연다. 저장은 onChange가 맡고 돌려준 안내 문구를 보여 준다.
const choices=[['owned','보유'],['wantToPlay','하고 싶은'],['wishlist','위시리스트'],['preordered','펀딩']];
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
export function collectionMenu({tier=null,onDelete=null,triggers=null,label:menuLabel='',collection=true,status={},disabled='',hint='',open=false,onToggle=()=>{},onChange}){
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const box=el('div','collection-menu'),button=el('button','collection-menu-button'),panel=el('div','collection-menu-panel'),note=el('p','collection-menu-note'),current={...status},inputs=[];
 const label=menuLabel||(collection?'게임 메뉴':'취향 티어 메뉴'),openers=triggers||[button];
 button.type='button';button.innerHTML=icon;button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','true');
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
 const outside=event=>{if(box.isConnected===false){document.removeEventListener?.('pointerdown',outside);return;}if(!box.contains?.(event.target))setOpen(false);};
 function setOpen(value){panel.hidden=!value;for(const o of openers)o.setAttribute('aria-expanded',String(value));if(value)document.addEventListener?.('pointerdown',outside);else document.removeEventListener?.('pointerdown',outside);onToggle(value);}
 for(const o of openers){o.setAttribute('aria-haspopup','true');o.onclick=()=>setOpen(panel.hidden);}
 box.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);openers[0].focus?.();}});
 panel.hidden=!open;for(const o of openers)o.setAttribute('aria-expanded',String(open));if(open)document.addEventListener?.('pointerdown',outside);
 if(triggers){box.className+=' collection-menu-triggers';box.append(...triggers,panel);}else box.append(button,panel);
 return box;
}
