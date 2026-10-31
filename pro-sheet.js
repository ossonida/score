// Pro 소개 시트: 잠긴 기능을 누르면 막는 대신 아래에서 올라와 Pro를 소개한다.
// 결제 전이라 '출시 알림 받기'로 관심만 센다(Analytics pro_interest + 이 기기 표시). previews: 내 기록으로 만든 이미지(Blob 또는 URL)를 돌려주는 함수.
const INTEREST_KEY='score.proInterest.v1';
const COPY={
 ko:{title:'Score Counter Pro',soon:'곧 출시',lead:'쌓인 기록을 더 깊이 보고, 더 멋지게 나눠요.',preview:'내 기록으로 만든 미리보기',benefits:['연간·전체·직접 설정 기간 분석과 결산','결산·게임별 여러 장 공유와 친구용 옵션','함께한 사람만 골라 보는 통계'],early:'출시 첫 달 얼리 서포터: 평생 Pro 6,900원(예정)',notify:'출시 알림 받기',notified:'신청했어요 · 출시되면 앱에서 알려 드릴게요',close:'닫기'},
 en:{title:'Score Counter Pro',soon:'Coming soon',lead:'See your records in depth and share them in style.',preview:'A preview from your records',benefits:['Yearly, all-time and custom periods with recaps','Multi-image sharing and friends-only options','Stats with just the people you choose'],early:'Launch month early supporter: lifetime Pro for ₩6,900 (planned)',notify:'Notify me at launch',notified:"You're on the list · we'll tell you in the app",close:'Close'},
};
const interested=()=>{try{return localStorage.getItem(INTEREST_KEY)==='1';}catch{return false;}};

function ensureSheet(){
 let sheet=document.getElementById('proSheet');if(sheet)return sheet;
 sheet=document.createElement('dialog');sheet.id='proSheet';sheet.className='pro-sheet';
 sheet.innerHTML='<div class="record-head"><h2><span class="pro-sheet-title"></span><small class="pro-sheet-soon"></small></h2><button class="score-close" type="button">×</button></div><p class="pro-sheet-lead"></p><div class="pro-sheet-preview" hidden><p class="pro-sheet-preview-title"></p><div class="pro-sheet-images"></div></div><ul class="pro-sheet-benefits"></ul><p class="pro-sheet-early"></p><button class="primary pro-sheet-notify" type="button"></button>';
 sheet.querySelector('.score-close').onclick=()=>sheet.close();sheet.addEventListener('click',event=>{if(event.target===sheet)sheet.close();});
 sheet.addEventListener('close',()=>{for(const url of sheet._urls||[])URL.revokeObjectURL(url);sheet._urls=[];sheet._token=(sheet._token||0)+1;});
 document.body.append(sheet);return sheet;
}

export function openProSheet({reason='other',previews}={}){
 const sheet=ensureSheet(),words=COPY[globalThis.ScoreI18n?.lang==='en'?'en':'ko'],token=(sheet._token||0)+1;sheet._token=token;
 sheet.querySelector('.pro-sheet-title').textContent=words.title;sheet.querySelector('.pro-sheet-soon').textContent=words.soon;sheet.querySelector('.score-close').setAttribute('aria-label',words.close);
 sheet.querySelector('.pro-sheet-lead').textContent=words.lead;sheet.querySelector('.pro-sheet-early').textContent=words.early;
 sheet.querySelector('.pro-sheet-benefits').replaceChildren(...words.benefits.map(text=>Object.assign(document.createElement('li'),{textContent:text})));
 const notify=sheet.querySelector('.pro-sheet-notify'),paintNotify=()=>{const done=interested();notify.textContent=done?words.notified:words.notify;notify.disabled=done;};
 notify.onclick=()=>{try{localStorage.setItem(INTEREST_KEY,'1');}catch{}window.ScoreAnalytics?.track?.('pro_interest',{reason});paintNotify();};paintNotify();
 const box=sheet.querySelector('.pro-sheet-preview'),images=sheet.querySelector('.pro-sheet-images');box.hidden=true;images.replaceChildren();sheet.querySelector('.pro-sheet-preview-title').textContent=words.preview;
 window.ScoreAnalytics?.track?.('pro_sheet_viewed',{reason});
 if(!sheet.open)sheet.showModal();
 // 미리보기 이미지는 시트를 띄운 뒤 만들어 붙인다(최대 3장).
 if(typeof previews==='function')Promise.resolve().then(previews).then(list=>{if(sheet._token!==token||!sheet.open||!list?.length)return;const urls=list.slice(0,3).map(item=>typeof item==='string'?item:URL.createObjectURL(item));sheet._urls=urls.filter(url=>url.startsWith('blob:')&&!list.includes(url));images.replaceChildren(...urls.map(src=>Object.assign(document.createElement('img'),{src,alt:words.preview,className:'pro-sheet-image'})));box.hidden=false;}).catch(()=>{});
}
