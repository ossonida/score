// BGG collections are queued (HTTP 202) before they are ready, not empty results.
export async function fetchBggPublicPage({endpoint,action,username,page=1,getToken,fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),isCurrent=()=>true,onWaiting=()=>{}}){
 for(let attempt=0;attempt<3;attempt++){
  if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  const token=await getToken();if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  const url=new URL(endpoint);url.searchParams.set('action',action);url.searchParams.set('username',username);url.searchParams.set('page',String(page));
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)});
  if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  if(response.status===202){if(attempt<2){onWaiting(attempt+1);await wait(3000);continue;}throw Error('BGG가 아직 정보를 준비 중입니다. 잠시 후 다시 가져오기를 눌러주세요. (202)');}
  if(!response.ok){let detail={};try{detail=await response.json();}catch{}const codes={BGG_TOKEN_REJECTED:'BGG가 API 토큰을 거부했습니다. Cloudflare의 BGG_API_TOKEN을 확인해야 합니다.',BGG_ACCESS_DENIED:'BGG가 Cloudflare 서버의 접근을 거부했습니다. 토큰 권한 또는 서버 접근 제한을 확인해야 합니다.',BGG_USER_NOT_FOUND:'BGG 사용자명을 찾지 못했습니다. 이메일이 아닌 BGG 사용자명을 입력해주세요.',BGG_TIMEOUT:'BGG 응답 시간이 초과됐습니다. 잠시 후 다시 가져와주세요.',BGG_NETWORK_ERROR:'Cloudflare 서버에서 BGG에 연결하지 못했습니다.',BGG_RESPONSE_TOO_LARGE:'BGG 응답이 서버의 크기 제한을 초과했습니다.',BGG_NON_XML_RESPONSE:'BGG가 게임 데이터 대신 웹 페이지를 반환했습니다.',BGG_INVALID_XML:'BGG 응답을 해석하지 못했습니다.',BGG_REDIRECT_REJECTED:'BGG 요청 주소가 허용되지 않은 경로로 변경됐습니다.',BGG_BODY_REJECTED:'BGG 응답 내용을 처리하지 못했습니다.',BGG_API_ERROR:'BGG API에서 오류를 반환했습니다.',BGG_HTTP_ERROR:'BGG 서버가 요청에 오류를 반환했습니다.'};if(codes[detail.code])throw Error(codes[detail.code]+' ('+detail.code+(Number.isInteger(detail.upstreamStatus)?' / BGG '+detail.upstreamStatus:'')+')');const messages={400:'BGG 사용자명을 확인해주세요.',401:'Google 로그인 확인이 필요합니다. 다시 로그인해주세요.',429:'요청이 많습니다. 1분 뒤 다시 시도해주세요.',502:'BGG 서버에서 정보를 받지 못했습니다. 사용자명 또는 BGG API 연결을 확인해야 합니다.',503:'BGG 연결 서버 설정을 확인해야 합니다.'};throw Error((messages[response.status]||'BGG 공개 정보를 가져오지 못했습니다.')+' ('+response.status+')');}
  return response.json();
 }
}
