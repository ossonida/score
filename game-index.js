// 게임 탭 우측 색인: 이름 첫 글자를 숫자(0~9)·초성(ㄱ~ㅎ)·알파벳(A~Z)·#으로 묶는다(목록 정렬 순서와 같게 숫자·한글·영문 순). 된소리는 예사소리 묶음에 넣는다.
const CHO='ㄱㄱㄴㄷㄷㄹㅁㅂㅂㅅㅅㅇㅈㅈㅊㅋㅌㅍㅎ',JAMO={ㄲ:'ㄱ',ㄸ:'ㄷ',ㅃ:'ㅂ',ㅆ:'ㅅ',ㅉ:'ㅈ'};
export const INDEX_KEYS=['0123456789',...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ','ABCDEFGHIJKLMNOPQRSTUVWXYZ'].flatMap(s=>[...s]).concat('#');
export function indexKey(label){const c=String(label||'').trim().normalize('NFC').charAt(0),code=c.charCodeAt(0);if(code>=0xAC00&&code<=0xD7A3)return CHO[Math.floor((code-0xAC00)/588)];if(JAMO[c])return JAMO[c];if(INDEX_KEYS.includes(c)&&c!=='#')return c;const latin=c.normalize('NFD').charAt(0).toUpperCase();return /^[A-Z]$/.test(latin)?latin:'#';}
// 목록 순서대로 각 색인 글자의 첫 위치를 구해 색인 순서로 돌려준다.
export function indexEntries(labels){const first=new Map();labels.forEach((label,index)=>{const key=indexKey(label);if(!first.has(key))first.set(key,index);});return INDEX_KEYS.filter(key=>first.has(key)).map(key=>({key,index:first.get(key)}));}
