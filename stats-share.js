import {gameKey,winnerIds} from './records-core.js?v=113';
import {gameImageUrl,safeGameImage} from './game-artwork.js?v=95';
import {attendanceCount,latestPlayDate} from './stats-overview.js?v=64';
import {nameKey} from './personal-stats.js?v=113';
import {bggSearchUrl} from './firebase-config.js';
import {starterGames} from './game-catalog.js?v=95';
import {summarizeStats} from './stats-insights.js?v=64';

const WIDTH=1080,HEIGHT=1350,MAX_COVERS=6,SIDE_COVERS=12,CLOSE_GAP=3,SIDE_CARD_H=148;
const catalogById=new Map(starterGames.map(game=>[String(game.id),game]));
const copy={
 ko:{playedCount:'플레이한 게임 수',peopleCount:'함께한 인원 수',winners:'이날의 승자',noWinner:'승자 기록 없음',playedGames:'플레이한 게임',anonymous:'익명의 플레이어',recent:'최근 게임기록',dialogTitle:'최근 기록 공유',creating:'공유 이미지를 만드는 중입니다.',save:'이미지 저장',share:'SNS 공유',readyShare:'이미지를 저장하거나 원하는 SNS로 공유할 수 있습니다.',readySave:'이 브라우저에서는 이미지를 기기에 저장할 수 있습니다.',shareFailed:'공유하지 못했습니다. 이미지 저장을 이용해주세요.',empty:'공유할 최근 기록이 없습니다.',createFailed:'공유 이미지를 만들지 못했습니다. 잠시 후 다시 시도해주세요.',previewAlt:'최근 게임 기록 공유 이미지 미리보기',moreGames:n=>`외 ${n}경기`,closeTitle:'오늘의 접전',closeHeadline:(game,gap)=>`${game} ${gap}점 차`,closeDetail:(first,firstScore,secondScore,second)=>`${first} ${firstScore} : ${secondScore} ${second}`,mvpTitle:'오늘의 MVP',mvpDetail:(wins,plays)=>`${wins}승 · ${plays}판 중`,place:'장소',atPlace:place=>`${place} 에서`,togetherTitle:date=>`${date} 함께한 기록`},
 en:{playedCount:'Games played',peopleCount:'People',winners:"Today's winners",noWinner:'No winner recorded',playedGames:'Games played',anonymous:'Anonymous player',recent:'Recent Game Record',dialogTitle:'Share recent record',creating:'Creating your share image…',save:'Save image',share:'Share',readyShare:'Save the image or share it to another app.',readySave:'You can save the image to this device.',shareFailed:'Could not share the image. Please save it instead.',empty:'There is no recent record to share.',createFailed:'Could not create the share image. Please try again.',previewAlt:'Preview of recent game record share image',moreGames:n=>`+${n} more games`,closeTitle:'Closest game',closeHeadline:(game,gap)=>`${game} by ${gap} ${gap===1?'point':'points'}`,closeDetail:(first,firstScore,secondScore,second)=>`${first} ${firstScore} : ${secondScore} ${second}`,mvpTitle:"Today's MVP",mvpDetail:(wins,plays)=>`${wins} wins · ${plays} games`,place:'Place',atPlace:place=>`at ${place}`,togetherTitle:date=>`Played together · ${date}`}
};
let current=null;

export function shareLanguage(locale){
 const value=Array.isArray(locale)?locale[0]:locale||globalThis.navigator?.languages?.[0]||globalThis.navigator?.language||'ko-KR';
 return /^ko(?:-|$)/i.test(String(value))?'ko':'en';
}

export function shareCopy(locale){return copy[shareLanguage(locale)];}

export function formatShareDate(date,locale='ko-KR'){
 const lang=shareLanguage(locale);if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '';
 const month=Number(date.slice(5,7)),day=Number(date.slice(8,10));
 return lang==='ko'?`${month}월${day}일`:`${['January','February','March','April','May','June','July','August','September','October','November','December'][month-1]} ${day}`;
}
export function formatRecentRecordTitle(date,locale='ko-KR'){
 const lang=shareLanguage(locale);if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return copy[lang].recent;
 const month=Number(date.slice(5,7)),day=Number(date.slice(8,10));
 if(lang==='ko')return `${month}월${day}일 게임기록`;
 return `${['January','February','March','April','May','June','July','August','September','October','November','December'][month-1]} ${day} Game Record`;
}

export function localizedGameName(game,locale){
 const known=catalogById.get(String(game?.bggId||''));if(!known)return String(game?.name||'');
 if(shareLanguage(locale)==='en')return known.name;
 return known.aliases.find(name=>/[가-힣]/.test(name))||game.name||known.name;
}

export function recentShareData(records,profile,locale){
 const lang=shareLanguage(locale),words=copy[lang],date=latestPlayDate(records),plays=records.filter(play=>play.date===date),games=new Map(),winners=new Map();
 for(const play of plays){
  const key=gameKey(play.game),localGame={...play.game,name:localizedGameName(play.game,lang)},entry=games.get(key)||{key,game:localGame,count:0,imageUrl:gameImageUrl(play.game)};entry.count++;games.set(key,entry);
  const ids=new Set(winnerIds(play)),names=[];
  for(const person of play.players){
   if(!ids.has(person.id))continue;
   const name=person.anonymous===true?words.anonymous:person.name.trim();if(name&&!names.some(saved=>nameKey(saved)===nameKey(name)))names.push(name);
  }
  if(names.length){const row=winners.get(key)||{playId:play.id,gameName:localGame.name,names:[]};for(const name of names)if(!row.names.some(saved=>nameKey(saved)===nameKey(name)))row.names.push(name);winners.set(key,row);}
 }
 const places=new Map();for(const play of plays){const place=typeof play.location==='string'?play.location.trim():'';if(place)places.set(place,(places.get(place)||0)+1);}
 const location=[...places].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
 return {locale:lang,copy:words,date,title:formatRecentRecordTitle(date,lang),dateLabel:formatShareDate(date,lang),location,playCount:plays.length,peopleCount:attendanceCount(plays,profile),winners:[...winners.values()],games:[...games.values()],card:pickDayCard(records,date,lang)};
}

// 그날 접전(1·2위 CLOSE_GAP점 차 이하)을 먼저, 없으면 MVP(2승 이상, 동률 2명까지)를 고르고 둘 다 없으면 null입니다.
export function pickDayCard(records,date,locale){
 const lang=shareLanguage(locale),words=copy[lang],dayPlays=records.filter(play=>play.date===date);if(!dayPlays.length)return null;
 let plays=dayPlays;
 for(let summary=summarizeStats(plays,date);summary.closest;summary=summarizeStats(plays,date)){
  const {play,first,second,gap}=summary.closest;if(gap>CLOSE_GAP)break;
  if(first.anonymous===true||second.anonymous===true){plays=plays.filter(item=>item!==play);continue;}
  const game=localizedGameName(play.game,lang);return {kind:'close',playId:play.id,game,gap,title:words.closeTitle,headline:words.closeHeadline(game,gap),detail:words.closeDetail(first.name.trim(),first.score,second.score,second.name.trim())};
 }
 const {leaders}=summarizeStats(dayPlays,date),wins=leaders[0]?.wins||0,tied=leaders.filter(row=>row.wins===wins);
 if(wins<2||tied.length>2)return null;
 const names=tied.map(row=>row.name.trim()),total=dayPlays.filter(play=>play.rule!=='cooperative').length;
 return {kind:'mvp',names,wins,plays:total,title:words.mvpTitle,headline:names.join(' · '),detail:words.mvpDetail(wins,total)};
}

function roundRect(ctx,x,y,w,h,r){
 const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function fillRound(ctx,x,y,w,h,r,fill){roundRect(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function coverProxy(url){if(!url)return '';const endpoint=new URL(bggSearchUrl);endpoint.searchParams.set('action','cover');endpoint.searchParams.set('url',url);return endpoint.href;}
export function shareImageSource(url,base=globalThis.location?.href){if(!url)return '';if(safeGameImage(url))return coverProxy(url);try{const local=new URL(url,base);return base&&local.origin===new URL(base).origin?local.href:'';}catch{return '';}}
function loadImage(url){const source=shareImageSource(url);return new Promise(resolve=>{if(!source){resolve(null);return;}const image=new Image();let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>finish(null),12000);image.crossOrigin='anonymous';image.decoding='async';image.referrerPolicy='no-referrer';image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=source;});}
function fitText(ctx,text,maxWidth,maxSize,minSize=24){let size=maxSize;for(;size>minSize;size-=2){ctx.font=`700 ${size}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;}return size;}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){
 const words=String(text).split(/\s+/),lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word;if(lines.length===maxLines)break;}}
 if(lines.length<maxLines&&line)lines.push(line);
 if(lines.length===maxLines&&words.join(' ')!==lines.join(' ')){while(lines[maxLines-1].length>1&&ctx.measureText(lines[maxLines-1]+'…').width>maxWidth)lines[maxLines-1]=lines[maxLines-1].slice(0,-1);lines[maxLines-1]+='…';}
 lines.forEach((value,index)=>ctx.fillText(value,x,y+index*lineHeight));return lines.length;
}
function clippedText(ctx,text,maxWidth){let value=String(text);if(ctx.measureText(value).width<=maxWidth)return value;while(value.length>1&&ctx.measureText(value+'…').width>maxWidth)value=value.slice(0,-1);return value+'…';}
function drawCover(ctx,image,game,x,y,w,h,more=0){
 fillRound(ctx,x,y,w,h,28,'#17253a');ctx.save();roundRect(ctx,x,y,w,h,28);ctx.clip();
 if(image){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale,sx=(image.naturalWidth-sw)/2,sy=(image.naturalHeight-sh)/2;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);}else{const gradient=ctx.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#294d79');gradient.addColorStop(1,'#15253c');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);ctx.fillStyle='#93bced';ctx.font='700 34px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';drawWrapped(ctx,game.game.name,x+w/2,y+h/2-20,w-50,42,3);}
 const shade=ctx.createLinearGradient(0,y+h*.54,0,y+h);shade.addColorStop(0,'transparent');shade.addColorStop(1,'rgba(4,10,20,.92)');ctx.fillStyle=shade;ctx.fillRect(x,y,w,h);ctx.restore();
 if(image){ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='700 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';drawWrapped(ctx,game.game.name,x+w/2,y+h-56,w-44,31,2);}
 if(game.count>1){fillRound(ctx,x+18,y+18,70,42,21,'rgba(5,13,25,.78)');ctx.fillStyle='#e9f3ff';ctx.font='700 21px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(`×${game.count}`,x+53,y+47);}
 if(more){ctx.fillStyle='rgba(5,13,25,.72)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 52px system-ui, sans-serif';ctx.fillText(`+${more}`,x+w/2,y+h/2);}
}
function drawBackground(ctx){
 const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);gradient.addColorStop(0,'#07111f');gradient.addColorStop(.56,'#10243e');gradient.addColorStop(1,'#0d4a5c');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#72d4ff';for(const [x,y,r]of [[930,70,250],[90,950,300],[990,1110,180],[380,590,120]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function metric(ctx,{x,y,w,h},value,label,{center=false,muted=false}={}){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign=center?'center':'left';const left=center?x+w/2:x+34,text=String(value);
 ctx.fillStyle=muted?'rgba(225,239,255,.68)':'#fff';let size=72;for(;size>36;size-=4){ctx.font=`800 ${size}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;if(ctx.measureText(text).width<=w-40)break;}ctx.fillText(clippedText(ctx,text,w-40),left,y+h/2+14);
 ctx.fillStyle='#9fc8f7';ctx.font='600 26px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,label,w-56),left,y+h/2+58);
}
// 6개 이하는 상단 표지 → 지표 줄(장소가 있으면 3칸) → 승자, 7개 이상은 왼쪽 2열 표지 + 오른쪽 지표·승자 열로 배치합니다.
// 카드가 있으면 6개 이하는 승자 박스 오른쪽, 7개 이상은 하단 전체 폭에 두고 겹치는 표지 행·승자 줄만 줄입니다.
export function shareCoverLayout(gameCount,hasCard=false,hasPlace=false){
 if(gameCount>MAX_COVERS){const shown=Math.min(gameCount,SIDE_COVERS),rows=Math.ceil(shown/2),gap=18,cellW=(560-gap)/2,cellH=Math.min(cellW,(986-gap*(rows-1))/rows),card=hasCard?{x:72,y:1260-SIDE_CARD_H,w:936,h:SIDE_CARD_H}:null,limit=card?card.y-gap:1260;
  const cells=Array.from({length:shown},(_,index)=>({x:72+index%2*(cellW+gap),y:274+Math.floor(index/2)*(cellH+gap),w:cellW,h:cellH})).filter(cell=>cell.y+cell.h<=limit+.5);
  return {side:true,max:SIDE_COVERS,cells,metrics:[{x:660,y:274,w:348,h:150},{x:660,y:442,w:348,h:150}],winners:{x:660,y:610,w:348,h:limit-610},card};}
 const count=Math.max(1,gameCount),cols=count===4?2:count<=2?count:3,rows=Math.ceil(count/cols),gap=18,cellW=(936-gap*(cols-1))/cols,cellH=(528-gap*(rows-1))/rows,slots=hasPlace?3:2,metricGap=39,metricW=(936-metricGap*(slots-1))/slots;
 return {side:false,max:MAX_COVERS,metrics:Array.from({length:slots},(_,index)=>({x:72+index*(metricW+metricGap),y:670,w:metricW,h:172})),winners:{x:72,y:872,w:hasCard?560:936,h:196},card:hasCard?{x:650,y:872,w:358,h:196}:null,cells:Array.from({length:Math.min(gameCount,MAX_COVERS)},(_,index)=>{const row=Math.floor(index/cols),col=index%cols,rowCount=Math.min(cols,count-row*cols),offset=(cols-rowCount)*(cellW+gap)/2;return {x:72+offset+col*(cellW+gap),y:122+row*(cellH+gap),w:cellW,h:cellH};})};
}
function sideWinners(ctx,data,words,x,y,w,h){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign='left';ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.winners,x+34,y+50);
 if(!data.winners.length){ctx.fillStyle='#fff';fitText(ctx,words.noWinner,w-68,29,22);ctx.fillText(words.noWinner,x+34,y+93);return;}
 const rowH=80,capacity=Math.max(1,Math.floor((h-84)/rowH)),rows=data.winners.length>capacity?data.winners.slice(0,capacity-1):data.winners;
 rows.forEach((row,index)=>{const top=y+93+index*rowH,names=row.names.join(', ');ctx.fillStyle='#9fc8f7';ctx.font='600 22px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,row.gameName,w-68),x+34,top);ctx.fillStyle='#fff';fitText(ctx,names,w-68,28,22);ctx.fillText(clippedText(ctx,names,w-68),x+34,top+36);});
 if(rows.length<data.winners.length){ctx.fillStyle='#9fc8f7';ctx.font='600 24px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.moreGames(data.winners.length-rows.length),x+34,y+93+rows.length*rowH);}
}

function dayCard(ctx,card,{x,y,w,h}){
 const tall=h>=190;fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign='left';ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,card.title,w-68),x+34,y+46);
 ctx.fillStyle='#fff';fitText(ctx,card.headline,w-68,tall?40:36,26);ctx.fillText(clippedText(ctx,card.headline,w-68),x+34,y+(tall?104:92));
 ctx.fillStyle='#9fc8f7';ctx.font='600 22px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,card.detail,w-68),x+34,y+h-(tall?30:20));
}

export async function createRecentShareImage(data){
 const words=data?.copy||shareCopy(data?.locale);if(!data?.playCount)throw Error(words.empty);
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');drawBackground(ctx);
 const place=data.location||'',layout=shareCoverLayout(data.games.length,Boolean(data.card),Boolean(place)),box=layout.winners,shown=data.games.slice(0,layout.cells.length),images=await Promise.all(shown.map(game=>loadImage(game.imageUrl)));
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#82bfff';ctx.font='700 30px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText('SCORE COUNTER',72,71);
 const corner=layout.side?(place?words.atPlace(place):''):data.dateLabel||'';if(corner){ctx.fillStyle='#fff';ctx.textAlign='right';ctx.font='700 31px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,corner,600),1008,72);ctx.textAlign='left';}
 if(layout.side){const title=words.togetherTitle(data.dateLabel||'');ctx.fillStyle='#fff';fitText(ctx,title,936,53,40);ctx.fillText(clippedText(ctx,title,936),72,168);ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.playedGames,72,250);metric(ctx,layout.metrics[0],data.playCount,words.playedCount);metric(ctx,layout.metrics[1],data.peopleCount,words.peopleCount);sideWinners(ctx,data,words,box.x,box.y,box.w,box.h);}
 else{
 const values=[...(place?[[place,words.place,true]]:[]),[data.playCount,words.playedCount,false],[data.peopleCount,words.peopleCount,false]];values.forEach(([value,label,muted],index)=>metric(ctx,layout.metrics[index],value,label,{center:true,muted}));
 fillRound(ctx,box.x,box.y,box.w,box.h,28,'rgba(255,255,255,.10)');ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.winners,box.x+34,box.y+48);ctx.fillStyle='#fff';const winnerLines=data.winners.length?data.winners.slice(0,3).map(row=>`${row.gameName} · ${row.names.join(', ')}`):[words.noWinner];if(data.winners.length>3)winnerLines[2]=words.moreGames(data.winners.length-2);winnerLines.forEach((line,index)=>{fitText(ctx,line,box.w-68,29,22);ctx.fillText(clippedText(ctx,line,box.w-68),box.x+34,box.y+89+index*44);});
 }
 shown.forEach((game,index)=>{const {x,y,w,h}=layout.cells[index],more=index===shown.length-1?Math.max(0,data.games.length-shown.length):0;drawCover(ctx,images[index],game,x,y,w,h,more);});
 if(data.card&&layout.card)dayCard(ctx,data.card,layout.card);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지를 만들지 못했습니다.')),'image/png'));
}

function ensureDialog(){
 let dialog=document.getElementById('recentShareDialog');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='recentShareDialog';dialog.className='recent-share-dialog';dialog.innerHTML='<div class="record-head"><h2></h2><button class="score-close" type="button" aria-label="닫기">×</button></div><p class="record-note recent-share-status" role="status" aria-live="polite"></p><div class="recent-share-preview-wrap"><img class="recent-share-preview" hidden></div><div class="actions recent-share-actions"><button class="secondary recent-share-save" type="button" disabled></button><button class="primary recent-share-send" type="button" disabled></button></div>';
 const close=()=>dialog.close();dialog.querySelector('.score-close').onclick=close;dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.addEventListener('close',()=>{if(current?.url)URL.revokeObjectURL(current.url);current=null;});document.body.append(dialog);return dialog;
}
function download(file,url){const link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();}

export async function openRecentShare(records,profile){
 const data=recentShareData(records,profile),dialog=ensureDialog(),status=dialog.querySelector('.recent-share-status'),preview=dialog.querySelector('.recent-share-preview'),save=dialog.querySelector('.recent-share-save'),send=dialog.querySelector('.recent-share-send');
 const words=data.copy;dialog.lang=data.locale;dialog.querySelector('h2').textContent=words.dialogTitle;dialog.querySelector('.score-close').setAttribute('aria-label',data.locale==='ko'?'닫기':'Close');preview.alt=words.previewAlt;save.textContent=words.save;send.textContent=words.share;
 if(current?.url)URL.revokeObjectURL(current.url);current=null;status.textContent=words.creating;preview.hidden=true;preview.removeAttribute('src');save.disabled=true;send.disabled=true;send.hidden=false;if(!dialog.open)dialog.showModal();
 try{const blob=await createRecentShareImage(data);if(!dialog.open)return;const file=new File([blob],`score-${data.date}.png`,{type:'image/png'}),url=URL.createObjectURL(blob),canShare=typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[file]}));current={file,url,data};preview.src=url;preview.hidden=false;save.disabled=false;send.disabled=!canShare;send.hidden=!canShare;status.textContent=canShare?words.readyShare:words.readySave;save.onclick=()=>download(file,url);send.onclick=async()=>{try{await navigator.share({files:[file],title:data.title,text:`${data.title} · Score Counter`});}catch(error){if(error?.name!=='AbortError')status.textContent=words.shareFailed;}};
 }catch(error){status.textContent=error?.message||words.createFailed;}
}
