// 처음 사용 안내(docs/CTA-FLOWS.md 3.7): 점수판 첫 실행 7단계 + 기능을 처음 만날 때 한 번씩 뜨는 말풍선.
// 본 안내는 score.tour.v1에 남긴다. 대상이 안 보이거나 대화상자가 열려 있으면 다음 기회에 다시 확인한다.
import {readStoredJson} from './stored-json.js?v=171';
import {rememberedUid} from './cloud-records.js?v=309';

const KEY='score.tour.v1',TIPS=['welcome','firstSave','stats','share','login'];
// 문구의 {person}·{mode}는 그 자리에 실제 버튼 아이콘(svg 복제)을 넣는다.
const ICONS={person:['#add','#bulk'],mode:['#recordModeChange']};
const WELCOME=[
 {target:()=>document.querySelector('#cards .name')||visible('#add')||visible('#bulk'),title:'플레이어 이름',text:'이름을 누르면 색상과 이름을 바꿀 수 있어요.\n사람을 추가하려면 오른쪽 위 사람 모양{person}버튼을 누르세요.'},
 {target:()=>document.querySelector('#cards .score'),title:'점수 바꾸기',text:'숫자를 누르면 점수를 직접 입력할 수 있어요.\n+ 와 − 를 누르면 1점씩 바뀌어요.'},
 {target:()=>visible('#turnTimer'),title:'턴 타이머 관리',text:'플레이어별, 게임 시간 기록이 가능해요.'},
 {target:()=>visible('#add')||visible('#bulk'),title:'플레이어 추가',text:'{person}버튼을 누르면 플레이어를 추가할 수 있어요.'},
 {target:()=>document.querySelector('#cards .card'),title:'플레이어 삭제',text:'플레이어 카드를 왼쪽으로 밀면 삭제돼요.'},
 {target:()=>visible('#toolbarMore'),title:'추가 기능',text:'{mode}기록방식 변경을 눌러\n승패, 협력, 순위 기록 등 다양한 방식으로 기록이 가능해요.'},
 {target:()=>visible('#savePlay'),title:'게임이 끝나면 SAVE',text:'SAVE를 누르고 무슨 게임이었는지 검색해서 고르면 기록이 저장돼요.'},
];
const TIP={
 firstSave:{target:()=>visible('#navStats'),title:'기록이 저장됐어요',text:'저장한 게임은 아래 통계 탭에서 다시 볼 수 있어요.'},
 stats:{target:()=>visible('#statsViewTabs'),title:'통계 화면',text:'최근 기록: 마지막으로 게임한 날의 결과\n기간 분석: 한 달·한 해 동안 많이 한 게임과 승률\n게임별 통계: 게임마다 누가 몇 번 이겼는지'},
 share:{target:()=>visible('#statsScreen .stats-share-trigger'),title:'공유하기',text:'이 날 한 게임 결과를 사진으로 만들어 줘요.\n카톡이나 인스타에 바로 올릴 수 있어요.'},
 login:{target:()=>visible('#navSettings'),title:'로그인하기',text:'지금 기록은 이 휴대폰에만 저장돼 있어요.\n설정에서 로그인 > 클라우드 동기화를 누르면 폰을 바꿔도 기록이 남아요.'},
};

let state=load(),open=null,timer=0,startCount=null,replay=false;
function load(){const data=readStoredJson(KEY,null,value=>value&&typeof value==='object'&&value.seen&&typeof value.seen==='object'?value:null);return {seen:{...(data?.seen||{})}};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function mark(...keys){for(const key of keys)state.seen[key]=true;save();}
function visible(selector){const node=document.querySelector(selector);return node&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'?node:null;}
function icon_(name){const source=(ICONS[name]||[]).map(selector=>visible(selector)).find(Boolean)||document.querySelector(ICONS[name]?.[0]||'_');const svg=source?.querySelector('svg');if(!svg)return null;const icon=svg.cloneNode(true);icon.setAttribute('class','tour-icon');icon.setAttribute('aria-hidden','true');return icon;}
function info(){return window.ScoreRecords?.tourState?.()||null;}
const route=()=>(location.hash||'#home').split('/')[0];
// 대화상자나 하단 이용 분석 안내가 떠 있으면 기다린다(안내 버튼을 누르면 click으로 다시 확인).
const busy=()=>!!document.querySelector('dialog[open]')||!!visible('#analyticsNotice');

// 말풍선: 대상 둘레 링 + 아래(자리가 없으면 위) 말풍선. dim이면 바깥을 어둡게 하고 누르기를 막는다.
function show(step,{dim=false,index=0,total=1,onNext,onSkip}={}){
 const target=step.target();if(!target)return false;close(false);
 target.scrollIntoView?.({block:'nearest'});
 const layer=document.createElement('div');layer.className='tour-layer'+(dim?' dim':'');
 const ring=document.createElement('div');ring.className='tour-ring';
 const bubble=document.createElement('div');bubble.className='tour-bubble';bubble.setAttribute('role','dialog');bubble.setAttribute('aria-live','polite');
 const title=document.createElement('strong');title.textContent=step.title;// 줄마다 따로 그린다. 글 조각은 span으로 나눠 영어 사전이 조각 단위로 번역하고, {이름}은 아이콘으로 바꾼다.
 const text=step.text.split('\n').map(line=>{const p=document.createElement('p');for(const [index,part] of line.split(/\{(\w+)\}/).entries()){if(index%2){const icon=icon_(part);if(icon)p.append(icon);}else if(part){const span=document.createElement('span');span.textContent=part;p.append(span);}}return p;});
 const actions=document.createElement('div');actions.className='tour-actions';
 if(total>1){const count=document.createElement('span');count.className='tour-count';count.textContent=`${index+1} / ${total}`;actions.append(count);}
 if(onSkip){const skip=document.createElement('button');skip.type='button';skip.className='tour-skip';skip.textContent='건너뛰기';skip.onclick=()=>onSkip();actions.append(skip);}
 const next=document.createElement('button');next.type='button';next.className='tour-next';next.textContent=total>1?(index+1<total?'다음':'시작하기'):'확인';next.onclick=()=>onNext();actions.append(next);
 bubble.append(title,...text,actions);layer.append(ring,bubble);document.body.append(layer);
 const place=()=>{const r=target.getBoundingClientRect(),pad=6;Object.assign(ring.style,{left:`${r.left-pad}px`,top:`${r.top-pad}px`,width:`${r.width+pad*2}px`,height:`${r.height+pad*2}px`});
  const width=Math.min(320,innerWidth-24),left=Math.max(12,Math.min(innerWidth-width-12,r.left+r.width/2-width/2)),h=bubble.offsetHeight,below=r.bottom+pad+12+h<=innerHeight-8;
  Object.assign(bubble.style,{width:`${width}px`,left:`${left}px`,top:`${below?r.bottom+pad+12:Math.max(8,r.top-pad-12-h)}px`});bubble.dataset.side=below?'below':'above';bubble.style.setProperty('--arrow',`${Math.max(18,Math.min(width-18,r.left+r.width/2-left))}px`);};
 place();
 const outside=event=>{if(!dim&&!bubble.contains(event.target)){onNext();}};
 if(!dim)setTimeout(()=>document.addEventListener('pointerdown',outside,true),0);
 addEventListener('resize',place);addEventListener('scroll',place,true);
 open={layer,cleanup:()=>{removeEventListener('resize',place);removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside,true);}};
 next.focus({preventScroll:true});return true;
}
function close(recheck=true){if(!open)return;open.cleanup();open.layer.remove();open=null;if(recheck)schedule();}

function welcome(index=0){
 if(index>=WELCOME.length){mark('welcome');close();return;}
 const shown=show(WELCOME[index],{dim:true,index,total:WELCOME.length,onNext:()=>welcome(index+1),onSkip:()=>{mark('welcome');close();}});
 if(!shown)welcome(index+1);
}
function tip(key){return show(TIP[key],{onNext:()=>{mark(key);close();}});}

function check(){
 timer=0;if(open||busy()||document.hidden)return;const data=info();if(!data)return;
 if(startCount===null)startCount=data.count;
 const view=route();
 if(!state.seen.welcome){
  // 기존 사용자(기록이 있거나 로그인했던 기기)는 안내를 모두 본 것으로 둔다.
  if(!replay&&(data.count>0||rememberedUid())){mark(...TIPS);return;}
  if(view==='#home')welcome();return;
 }
 if(view==='#home'&&!state.seen.firstSave&&startCount===0&&data.count>0&&tip('firstSave'))return;
 if(view==='#stats'&&!state.seen.stats&&data.count>=3&&tip('stats'))return;
 if(view==='#stats'&&!state.seen.share&&data.dayPlays>=2&&tip('share'))return;
 if((view==='#home'||view==='#stats')&&!state.seen.login&&data.count>=5&&!data.signedIn&&tip('login'))return;
}
function schedule(delay=500){clearTimeout(timer);timer=setTimeout(check,delay);}

// 설정 '사용법 다시 보기': 본 기록을 지우고 점수판에서 첫 실행 안내를 다시 보여 준다(기록이 있어도).
export function replayTour(){replay=true;state={seen:Object.fromEntries(TIPS.filter(key=>key!=='welcome').map(key=>[key,true]))};save();close(false);
 const run=()=>{if(route()==='#home'&&!busy())welcome();else schedule();};if(route()==='#home')setTimeout(run,300);else{location.hash='home';setTimeout(run,600);}}

document.getElementById('replayTour')?.addEventListener('click',event=>{event.preventDefault();replayTour();});
addEventListener('score-records:changed',()=>schedule());
addEventListener('hashchange',()=>{close(false);schedule(700);});
document.addEventListener('click',()=>{if(!open)schedule(900);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
schedule(1200);
