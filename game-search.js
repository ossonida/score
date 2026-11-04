import {bggSearchQuery} from './game-catalog.js?v=167';
import {aliasSearchName} from './game-aliases.js?v=2';
import {decodeXmlText} from './bgg-validation.js?v=129';
// 게임 검색 공통: 저장 창(점수판 SAVE·결과 기록 SAVE)과 게임 탭 게임 추가가 같은 검색을 쓰고, 상황별 차이는 이 표 하나로 정한다(docs/CTA-FLOWS.md 5.1.1).
// recent: 최근 게임 'open'·'closed'·false, expansions: 확장 선택 단계, after: 게임(과 확장)을 고른 뒤 'details'(저장 2단계)·'register'(목록 등록).
export const GAME_SEARCH_CONTEXTS={
 score:{title:'게임 검색',recent:'closed',expansions:true,after:'details'},
 scoreless:{title:'게임 검색',recent:'open',expansions:true,after:'details'},
 library:{title:'게임 추가',recent:false,expansions:false,after:'register'}
};
export const bggWebSearchUrl=query=>'https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q='+encodeURIComponent(query);
const errors={202:'BGG가 검색을 준비 중입니다. 잠시 후 검색 버튼을 다시 눌러주세요.',401:'로그인 확인이 필요합니다. 다시 로그인한 뒤 검색해주세요.',429:'검색 요청이 많습니다. 1분 뒤 다시 검색해주세요.',502:'BGG에서 검색 결과를 받지 못했습니다. 잠시 후 다시 검색해주세요.',503:'BGG 검색 서버 설정을 확인해야 합니다. 기존 목록은 선택할 수 있습니다.'};
// BGG 전체 검색. 토큰이 없으면 비로그인 검색(워커가 접속 주소별로 제한). local 결과를 앞에 두고 BGG 결과를 합친다.
export async function searchBggGames(endpoint,query,{local=[],token='',aliases,signal}={}){
 const url=new URL(endpoint);url.searchParams.set('query',bggSearchQuery(aliasSearchName(query,aliases)));
 const response=await fetch(url,{signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(20000)]),headers:token?{Authorization:'Bearer '+token}:{}});
 if(response.status===202||!response.ok)throw Error(errors[response.status]||'BGG에 연결하지 못했습니다. 기존 목록을 선택하거나 직접 입력할 수 있습니다.');
 const data=await response.json(),merged=new Map(local.map(g=>[g.id?'bgg:'+g.id:'name:'+g.name,g]));
 for(const game of Array.isArray(data?.games)?data.games:[])if(game&&/^[1-9][0-9]{0,9}$/.test(String(game.id))&&typeof game.name==='string')merged.set('bgg:'+game.id,{...game,name:decodeXmlText(game.name),source:'BGG'});
 return [...merged.values()];
}
export const searchErrorText=error=>error.name==='TimeoutError'?'검색 응답이 늦습니다. 잠시 후 다시 검색해주세요.':error.message;
