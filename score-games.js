// Score 자체 게임은 BGG와 연결하지 않으며 이름으로만 식별합니다.
export const scoreGames=[
 {name:'홀덤',aliases:['텍사스 홀덤','Texas Hold’em','Texas Holdem','Hold’em','Holdem'],type:'sports',image:'./assets/score-games/holdem.webp'},
 {name:'테니스',aliases:['Tennis'],type:'sports',image:'./assets/score-games/tennis.webp'},
 {name:'볼링',aliases:['Bowling'],type:'sports',image:'./assets/score-games/bowling.webp'},
 {name:'당구',aliases:['Billiards','Pool'],type:'sports',image:'./assets/score-games/billiards.webp'},
 {name:'축구',aliases:['Football','Soccer'],type:'sports',image:'./assets/score-games/football.webp'},
 {name:'야구',aliases:['Baseball'],type:'sports',image:'./assets/score-games/baseball.webp'},
 {name:'배드민턴',aliases:['Badminton'],type:'sports',image:'./assets/score-games/badminton.webp'},
 {name:'탁구',aliases:['Table Tennis','Ping Pong','핑퐁'],type:'sports',image:'./assets/score-games/table-tennis.webp'}
];
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s:’'–—-]+/g,'');
// 별칭 정규화는 한 번만 한다(게임 목록·표지 렌더마다 반복 호출됨).
const aliasIndex=new Map();for(const item of scoreGames)for(const alias of [item.name,...item.aliases]){const k=normalize(alias);if(!aliasIndex.has(k))aliasIndex.set(k,item);}
export function scoreGame(game){const name=typeof game==='string'?game:game?.name;return aliasIndex.get(normalize(name))||null;}
export function isScoreGame(game){return Boolean(scoreGame(game));}
export function scoreGameType(game){return scoreGame(game)?.type||'';}
export function searchScoreGames(query){const key=normalize(query);if(!key)return [];return scoreGames.filter(item=>[item.name,...item.aliases].some(alias=>normalize(alias).includes(key)));}
