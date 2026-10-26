// localStorage JSON을 읽는 공용 헬퍼: 저장 문자열이 바뀔 때만 다시 해석한다.
// 게임·기록마다 반복 호출되는 곳에서 매번 JSON.parse 하지 않도록 이걸 쓴다. 돌려준 값은 고치지 말고 복사해서 쓴다.
const cache=new Map();
export function readStoredJson(key,fallback,check=value=>value){
 let raw;try{raw=localStorage.getItem(key);}catch{return fallback;}
 const hit=cache.get(key);if(hit&&hit.raw===raw)return hit.value;
 let value;try{value=raw===null?fallback:check(JSON.parse(raw));}catch{value=fallback;}
 cache.set(key,{raw,value});return value;
}
