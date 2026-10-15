import {searchableGameGroups} from './game-catalog.js?v=54';
// Select2 filters its own options; searching never changes the selected game's records.
export function enhanceGamePicker(select,groups){
 const $=window.jQuery;if(!$?.fn?.select2)return;
 const field=$(select);field.data('scoreGames',new Map(groups.map(g=>[g.key,g])));
 if(!field.data('select2')){
  field.select2({width:'100%',placeholder:'게임 검색 · 선택',minimumResultsForSearch:0,dropdownParent:$('#gameFilterSection'),
   language:{noResults:()=> '검색 결과가 없습니다.',searching:()=> '검색 중…'},
   matcher:(params,item)=>{const term=params.term?.trim();if(!term)return item;const game=field.data('scoreGames').get(item.id);return game&&searchableGameGroups([game],term).length?item:null;}
  });
  field.on('select2:open.score',()=>{const input=document.querySelector('#gameFilterSection .select2-search__field');if(input){input.placeholder='게임명 검색 · 한글 / English';input.setAttribute('aria-label','게임 검색');input.focus();}});
 }else{
  // A namespaced jQuery change also invokes DOM0 onchange. Temporarily detach it
  // while refreshing only Select2's display so it cannot rerender recursively.
  const change=select.onchange;select.onchange=null;try{field.trigger('change.select2');}finally{select.onchange=change;}
 }
}
