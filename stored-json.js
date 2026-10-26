// localStorage JSON을 읽는 공용 헬퍼. 해석한 값을 메모리에 두고, 이 앱이 쓸 때(writeStoredJson)와
// 다른 탭이 바꿀 때(storage 이벤트)만 갱신한다. 게임·기록마다 반복 호출돼도 저장 문자열을 다시 꺼내지 않는다.
// 돌려준 값은 고치지 말고 복사해서 쓴다.
const cache=new Map();
globalThis.addEventListener?.('storage',event=>{if(event.key===null)cache.clear();else cache.delete(event.key);});
export function readStoredJson(key,fallback,check=value=>value){
 const hit=cache.get(key);if(hit&&hit.storage===globalThis.localStorage)return hit.value;
 let value;try{const raw=localStorage.getItem(key);value=raw===null?fallback:check(JSON.parse(raw));}catch{value=fallback;}
 cache.set(key,{storage:globalThis.localStorage,value});return value;
}
export function writeStoredJson(key,value){cache.delete(key);localStorage.setItem(key,JSON.stringify(value));}
