// 기간 분석 '함께한 사람' 고르기 창: 그 기간에 함께한 사람 체크 목록(판 수 많은 순) + 방식(포함 · 모두 함께). 적용하면 onApply({keys,names,mode}).
const COPY={
 ko:{title:'함께한 사람 고르기',any:'한 명이라도 함께',all:'모두 함께',anyHint:'고른 사람이 한 명이라도 있던 판',allHint:'고른 사람이 모두 있던 판',clear:'전체로',apply:'적용',empty:'이 기간에 함께한 사람이 없습니다.',plays:n=>`${n}판`,close:'닫기'},
 en:{title:'Choose players',any:'Any of them',all:'All of them',anyHint:'Plays with at least one of them',allHint:'Plays with all of them',clear:'Everyone',apply:'Apply',empty:'No other players in this period.',plays:n=>`${n} ${n===1?'play':'plays'}`,close:'Close'},
};
const words=()=>COPY[globalThis.ScoreI18n?.lang==='en'?'en':'ko'];

// 요약 문구: 버튼과 결산 제목에 쓴다. 두 명까지 이름, 그 이상은 '외 N명'.
export function peopleLabel(names,lang=globalThis.ScoreI18n?.lang){
 const shown=names.slice(0,2).join(', '),more=names.length-2;
 return more>0?(lang==='en'?`${shown} +${more}`:`${shown} 외 ${more}명`):shown;
}

function ensureDialog(){
 let dialog=document.getElementById('periodPeopleDialog');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='periodPeopleDialog';dialog.className='recent-share-dialog people-filter-dialog';
 dialog.innerHTML='<div class="record-head"><h2></h2><button class="score-close" type="button">×</button></div><div class="recap-segment people-filter-mode" role="radiogroup"><button type="button" role="radio" data-mode="any"></button><button type="button" role="radio" data-mode="all"></button></div><p class="people-filter-hint"></p><div class="people-filter-list"></div><div class="actions recent-share-actions"><button class="secondary people-filter-clear" type="button"></button><button class="primary people-filter-apply" type="button"></button></div>';
 dialog.querySelector('.score-close').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 document.body.append(dialog);return dialog;
}

// people: [{key,name,count}] (판 수 많은 순), selected: {keys,mode}.
export function openPeopleFilter({people,selected,onApply}){
 const dialog=ensureDialog(),text=words(),state={keys:new Set(selected.keys),mode:selected.mode==='all'?'all':'any'};
 dialog.querySelector('h2').textContent=text.title;dialog.querySelector('.score-close').setAttribute('aria-label',text.close);
 const modes=[...dialog.querySelectorAll('.people-filter-mode button')],hint=dialog.querySelector('.people-filter-hint'),list=dialog.querySelector('.people-filter-list');
 const paint=()=>{for(const button of modes){const on=button.dataset.mode===state.mode;button.textContent=text[button.dataset.mode];button.classList.toggle('is-selected',on);button.setAttribute('aria-checked',String(on));}hint.textContent=state.mode==='all'?text.allHint:text.anyHint;};
 for(const button of modes)button.onclick=()=>{state.mode=button.dataset.mode;paint();};
 list.replaceChildren(...(people.length?people.map(person=>{const row=document.createElement('label'),box=document.createElement('input'),name=document.createElement('span'),count=document.createElement('small');row.className='people-filter-row';box.type='checkbox';box.checked=state.keys.has(person.key);box.onchange=()=>{if(box.checked)state.keys.add(person.key);else state.keys.delete(person.key);};name.textContent=person.name;count.textContent=text.plays(person.count);row.append(box,name,count);return row;}):[Object.assign(document.createElement('p'),{className:'record-note',textContent:text.empty})]));
 const finish=keys=>{const chosen=people.filter(person=>keys.has(person.key));onApply({keys:chosen.map(person=>person.key),names:chosen.map(person=>person.name),mode:state.mode});dialog.close();};
 const clear=dialog.querySelector('.people-filter-clear'),apply=dialog.querySelector('.people-filter-apply');clear.textContent=text.clear;apply.textContent=text.apply;
 clear.onclick=()=>finish(new Set());apply.onclick=()=>finish(state.keys);
 paint();if(!dialog.open)dialog.showModal();
}
