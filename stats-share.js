import {gameKey,winnerIds} from './records-core.js?v=113';
import {gameImageUrl,safeGameImage} from './game-artwork.js?v=95';
import {attendanceCount,latestPlayDate} from './stats-overview.js?v=64';
import {nameKey} from './personal-stats.js?v=113';
import {bggSearchUrl} from './firebase-config.js';
import {starterGames} from './game-catalog.js?v=95';

const WIDTH=1080,HEIGHT=1350,MAX_COVERS=6;
const catalogById=new Map(starterGames.map(game=>[String(game.id),game]));
const copy={
 ko:{playedCount:'플레이한 게임 수',peopleCount:'함께한 인원 수',winners:'이날의 승자',noWinner:'승자 기록 없음',playedGames:'플레이한 게임',anonymous:'익명의 플레이어',recent:'최근 게임기록',dialogTitle:'최근 기록 공유',creating:'공유 이미지를 만드는 중입니다.',save:'이미지 저장',share:'SNS 공유',readyShare:'이미지를 저장하거나 원하는 SNS로 공유할 수 있습니다.',readySave:'이 브라우저에서는 이미지를 기기에 저장할 수 있습니다.',shareFailed:'공유하지 못했습니다. 이미지 저장을 이용해주세요.',empty:'공유할 최근 기록이 없습니다.',createFailed:'공유 이미지를 만들지 못했습니다. 잠시 후 다시 시도해주세요.',previewAlt:'최근 게임 기록 공유 이미지 미리보기',moreGames:n=>`외 ${n}경기`},
 en:{playedCount:'Games played',peopleCount:'People',winners:"Today's winners",noWinner:'No winner recorded',playedGames:'Games played',anonymous:'Anonymous player',recent:'Recent Game Record',dialogTitle:'Share recent record',creating:'Creating your share image…',save:'Save image',share:'Share',readyShare:'Save the image or share it to another app.',readySave:'You can save the image to this device.',shareFailed:'Could not share the image. Please save it instead.',empty:'There is no recent record to share.',createFailed:'Could not create the share image. Please try again.',previewAlt:'Preview of recent game record share image',moreGames:n=>`+${n} more games`}
};
let current=null;

export function shareLanguage(locale){
 const value=Array.isArray(locale)?locale[0]:locale||globalThis.navigator?.languages?.[0]||globalThis.navigator?.language||'ko-KR';
 return /^ko(?:-|$)/i.test(String(value))?'ko':'en';
}

export function shareCopy(locale){return copy[shareLanguage(locale)];}

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
 const lang=shareLanguage(locale),words=copy[lang],date=latestPlayDate(records),plays=records.filter(play=>play.date===date),games=new Map(),winners=[];
 for(const play of plays){
  const key=gameKey(play.game),localGame={...play.game,name:localizedGameName(play.game,lang)},entry=games.get(key)||{key,game:localGame,count:0,imageUrl:gameImageUrl(play.game)};entry.count++;games.set(key,entry);
  const ids=new Set(winnerIds(play)),names=[];
  for(const person of play.players){
   if(!ids.has(person.id))continue;
   const name=person.anonymous===true?words.anonymous:person.name.trim();if(name&&!names.some(saved=>nameKey(saved)===nameKey(name)))names.push(name);
  }
  if(names.length)winners.push({playId:play.id,gameName:localGame.name,names});
 }
 return {locale:lang,copy:words,date,title:formatRecentRecordTitle(date,lang),playCount:plays.length,peopleCount:attendanceCount(plays,profile),winners,games:[...games.values()]};
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
 if(image){ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='700 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';drawWrapped(ctx,game.game.name,x+22,y+h-56,w-44,31,2);}
 if(game.count>1){fillRound(ctx,x+18,y+18,70,42,21,'rgba(5,13,25,.78)');ctx.fillStyle='#e9f3ff';ctx.font='700 21px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(`×${game.count}`,x+53,y+47);}
 if(more){ctx.fillStyle='rgba(5,13,25,.72)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 52px system-ui, sans-serif';ctx.fillText(`+${more}`,x+w/2,y+h/2);}
}
function drawBackground(ctx){
 const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);gradient.addColorStop(0,'#07111f');gradient.addColorStop(.56,'#10243e');gradient.addColorStop(1,'#0d4a5c');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#72d4ff';for(const [x,y,r]of [[930,70,250],[90,950,300],[990,1110,180],[380,590,120]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function metric(ctx,x,value,label){fillRound(ctx,x,250,448,172,28,'rgba(255,255,255,.10)');ctx.fillStyle='#fff';ctx.font='800 72px system-ui, sans-serif';ctx.textAlign='left';ctx.fillText(String(value),x+34,334);ctx.fillStyle='#9fc8f7';ctx.font='600 26px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(label,x+36,382);}

export async function createRecentShareImage(data){
 const words=data?.copy||shareCopy(data?.locale);if(!data?.playCount)throw Error(words.empty);
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');drawBackground(ctx);
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#82bfff';ctx.font='700 24px system-ui, sans-serif';ctx.fillText('SCORE COUNTER',72,82);
 ctx.fillStyle='#fff';fitText(ctx,data.title,936,68,48);ctx.fillText(data.title,72,184);
 metric(ctx,72,data.playCount,words.playedCount);metric(ctx,560,data.peopleCount,words.peopleCount);
 fillRound(ctx,72,452,936,196,28,'rgba(255,255,255,.10)');ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.winners,106,498);ctx.fillStyle='#fff';const winnerLines=data.winners.length?data.winners.slice(0,3).map(row=>`${row.gameName} · ${row.names.join(' · ')}`):[words.noWinner];if(data.winners.length>3)winnerLines[2]=words.moreGames(data.winners.length-2);winnerLines.forEach((line,index)=>{fitText(ctx,line,868,29,22);ctx.fillText(clippedText(ctx,line,868),106,546+index*40);});
 ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.playedGames,72,705);
 const shown=data.games.slice(0,MAX_COVERS),images=await Promise.all(shown.map(game=>loadImage(game.imageUrl)));const count=Math.max(1,shown.length),cols=count===4?2:count<=2?count:3,rows=Math.ceil(count/cols),gap=18,areaW=936,areaH=528,cellW=(areaW-gap*(cols-1))/cols,cellH=(areaH-gap*(rows-1))/rows;
 shown.forEach((game,index)=>{const row=Math.floor(index/cols),col=index%cols,rowCount=Math.min(cols,count-row*cols),offset=(cols-rowCount)*(cellW+gap)/2,x=72+offset+col*(cellW+gap),y=730+row*(cellH+gap),more=index===MAX_COVERS-1?Math.max(0,data.games.length-MAX_COVERS):0;drawCover(ctx,images[index],game,x,y,cellW,cellH,more);});
 ctx.fillStyle='rgba(225,239,255,.68)';ctx.font='500 22px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('ossonida.github.io/score',WIDTH/2,1315);
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
