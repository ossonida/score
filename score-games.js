// Score 자체 게임은 BGG와 연결하지 않으며 이름으로만 식별합니다.
export const scoreGames=[
 {name:'홀덤',aliases:['텍사스 홀덤','Texas Hold’em','Texas Holdem','Hold’em','Holdem'],type:'strategy'},
 {name:'테니스',aliases:['Tennis'],type:'sports'},
 {name:'볼링',aliases:['Bowling'],type:'sports'},
 {name:'당구',aliases:['Billiards','Pool'],type:'sports'},
 {name:'축구',aliases:['Football','Soccer'],type:'sports'},
 {name:'야구',aliases:['Baseball'],type:'sports'},
 {name:'배드민턴',aliases:['Badminton'],type:'sports'}
];
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s:’'–—-]+/g,'');
export function scoreGame(game){const name=typeof game==='string'?game:game?.name,key=normalize(name);return scoreGames.find(item=>[item.name,...item.aliases].some(alias=>normalize(alias)===key))||null;}
export function isScoreGame(game){return Boolean(scoreGame(game));}
export function scoreGameType(game){return scoreGame(game)?.type||'';}
export function searchScoreGames(query){const key=normalize(query);if(!key)return [];return scoreGames.filter(item=>[item.name,...item.aliases].some(alias=>normalize(alias).includes(key)));}
