// 새 기능 안내(docs/CTA-FLOWS.md 3.8): 점수판에서 기존 사용자에게 한 번, 실제 화면 이미지와 설명을 넘겨 보는 창으로 알린다.
// 본 안내 id는 score.whatsNew.v1에 남긴다. 처음 쓰는 기기는 띄우지 않고 지금 있는 안내를 본 것으로 둔다(처음 사용 안내와 겹치지 않게).
import {readStoredJson,writeStoredJson} from './stored-json.js?v=171';
import {rememberedUid} from './cloud-records.js?v=332';

const KEY='score.whatsNew.v1';
// 게임 탭이 받는 공통 이벤트로 보기를 고른 뒤 게임 탭으로 간다(숨은 버튼 클릭 없음).
const openGames=detail=>{window.dispatchEvent(new CustomEvent('score-games:open',{detail}));location.hash='games';};
export const ANNOUNCEMENTS=[{id:'2026-11-game-tiers',until:'2027-01-31',cta:'내 취향 티어 보기',action:()=>openGames({view:'played',layout:'tier'}),slides:[
 {image:'assets/whats-new/tier-pick.webp',title:'취향 티어가 뭐예요?',text:'좋아하는 정도에 따라 게임을 최애·S·A·B·C로 나눠요. 실력이나 랭킹과는 상관없어요.'},
 {image:'assets/whats-new/tier-menu.webp',title:'게임별 통계에서 정해요',text:'게임 오른쪽 위 ⋮을 눌러 취향 티어를 고르면 바로 저장돼요.'},
 {image:'assets/whats-new/tier-view.webp',title:'해본 게임을 취향 티어로 모아 보기',text:'게임 탭 › 해본에서 취향 티어를 누르면 티어별로 묶여 보여요.'},
 {image:'assets/whats-new/tier-recap.webp',title:'결산에 내 취향 티어표',text:'기간 분석 › 결산 공유의 여러 장에 그 기간 게임의 취향 티어표가 들어가요.'}]}];

const $=id=>document.getElementById(id);
const seen=()=>readStoredJson(KEY,{seen:{}},value=>value&&typeof value.seen==='object'&&value.seen&&!Array.isArray(value.seen)?value:{seen:{}}).seen;
function mark(ids){const next={seen:{...seen()}};for(const id of ids)next.seen[id]=true;try{writeStoredJson(KEY,next);}catch{}}
const localDay=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;};
export function pendingAnnouncements(day=localDay()){const done=seen();return ANNOUNCEMENTS.filter(item=>!done[item.id]&&day<=item.until);}
const visible=selector=>{const node=document.querySelector?.(selector);return !!node&&node.getClientRects?.().length>0;};
const busy=()=>!!document.querySelector?.('dialog[open]')||visible('#analyticsNotice')||visible('.tour-bubble');
let timer=0,current=null,index=0,decided=false;
// 기존 사용자: 기록이 있거나, 로그인했던 기기이거나, 처음 사용 안내를 이미 본 기기.
function existingUser(info){if(info.count>0||rememberedUid())return true;return readStoredJson('score.tour.v1',{},value=>value||{})?.seen?.welcome===true;}
export function checkWhatsNew(){check();}
function check(){
 timer=0;if(current||document.hidden)return;const info=window.ScoreRecords?.tourState?.();if(!info)return schedule(1000);
 const list=pendingAnnouncements();if(!list.length)return;
 if(!decided){decided=true;if(!existingUser(info)){mark(list.map(item=>item.id));return;}}
 if((location.hash||'#home').split('/')[0]!=='#home'||busy())return;
 show(list[0]);
}
function schedule(delay=800){clearTimeout(timer);timer=setTimeout(check,delay);}
function go(next,smooth=true){const track=$('whatsNewTrack'),count=current.slides.length;index=Math.max(0,Math.min(count-1,next));track.scrollTo?.({left:index*track.clientWidth,behavior:smooth?'smooth':'auto'});sync();}
function sync(){const count=current.slides.length,last=index===count-1;$('whatsNewCount').textContent=`${index+1} / ${count}`;$('whatsNewPrev').hidden=index===0;$('whatsNewNext').textContent=last?current.cta:'다음';
 for(const [i,dot] of [...$('whatsNewDots').children].entries())dot.setAttribute('aria-current',String(i===index));
 for(const [i,slide] of [...$('whatsNewTrack').children].entries())slide.setAttribute('aria-hidden',String(i!==index));}
function show(item){
 current=item;index=0;const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 $('whatsNewTrack').replaceChildren(...item.slides.map((slide,i)=>{const section=el('section','whats-new-slide'),image=el('img');section.setAttribute('role','group');section.setAttribute('aria-roledescription','slide');section.setAttribute('aria-label',`${i+1} / ${item.slides.length}`);image.src=slide.image;image.alt='';image.width=800;image.height=600;image.decoding='async';section.append(image,el('h2',undefined,slide.title),el('p',undefined,slide.text));return section;}));
 $('whatsNewDots').replaceChildren(...item.slides.map((slide,i)=>{const dot=el('button');dot.type='button';dot.setAttribute('aria-label',`${i+1}번째 안내`);dot.onclick=()=>go(i);return dot;}));
 sync();$('whatsNewDialog').showModal();$('whatsNewTrack').scrollTo?.({left:0});
}
// 창을 어떻게 닫든(×·바깥·Esc·CTA) 본 것으로 둔다.
function closed(){if(!current)return;mark([current.id]);current=null;schedule(1500);}
// 설정 '새 기능 다시 보기': 본 기록·기한과 상관없이 가장 최근 안내를 점수판에서 처음부터 보여 준다.
export function replayWhatsNew(){const item=ANNOUNCEMENTS[0];if(!item)return;clearTimeout(timer);const run=()=>{if(!current&&!document.querySelector?.('dialog[open]'))show(item);};if((location.hash||'#home').split('/')[0]==='#home')setTimeout(run,300);else{location.hash='home';setTimeout(run,600);}}
$('replayWhatsNew')?.addEventListener('click',event=>{event.preventDefault();replayWhatsNew();});
$('whatsNewPrev').onclick=()=>go(index-1);
$('whatsNewNext').onclick=()=>{if(!current)return;if(index<current.slides.length-1)return go(index+1);const item=current;$('whatsNewDialog').close();item.action();};
$('whatsNewTrack').addEventListener('scroll',()=>{if(!current)return;const track=$('whatsNewTrack'),next=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));if(next!==index){index=Math.max(0,Math.min(current.slides.length-1,next));sync();}},{passive:true});
$('whatsNewDialog').addEventListener('close',closed);
$('whatsNewDialog').addEventListener('click',event=>{if(event.target===$('whatsNewDialog'))$('whatsNewDialog').close();});
$('whatsNewDialog').addEventListener('keydown',event=>{if(!current)return;if(event.key==='ArrowRight'){event.preventDefault();go(index+1);}if(event.key==='ArrowLeft'){event.preventDefault();go(index-1);}});
window.addEventListener('hashchange',()=>schedule(900));
window.addEventListener('score-records:changed',()=>schedule());
document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)schedule();});
schedule(2000);
