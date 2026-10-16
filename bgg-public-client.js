// BGG collections are queued (HTTP 202) before they are ready, not empty results.
export async function fetchBggPublicPage({endpoint,action,username,page=1,getToken,fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),isCurrent=()=>true,onWaiting=()=>{}}){
 for(let attempt=0;attempt<3;attempt++){
  if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  const token=await getToken();if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  const url=new URL(endpoint);url.searchParams.set('action',action);url.searchParams.set('username',username);url.searchParams.set('page',String(page));
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)});
  if(!isCurrent())throw new DOMException('계정이 변경됐습니다.','AbortError');
  if(response.status===202){if(attempt<2){onWaiting(attempt+1);await wait(3000);continue;}throw Error('BGG가 아직 정보를 준비 중입니다. 잠시 후 다시 가져오기를 눌러주세요. (202)');}
  if(!response.ok){const messages={400:'BGG 사용자명을 확인해주세요.',401:'Google 로그인 확인이 필요합니다. 다시 로그인해주세요.',429:'요청이 많습니다. 1분 뒤 다시 시도해주세요.',502:'BGG 서버에서 정보를 받지 못했습니다. 사용자명 또는 BGG API 연결을 확인해야 합니다.',503:'BGG 연결 서버 설정을 확인해야 합니다.'};throw Error((messages[response.status]||'BGG 공개 정보를 가져오지 못했습니다.')+' ('+response.status+')');}
  return response.json();
 }
}
