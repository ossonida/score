import {gameKey,winnerIds,missionSummary,coopKind,scenarioAttempt} from './records-core.js?v=155';
import {metadata,bggId,gameNames} from './bgg-metadata.js?v=171';
import {scoreGameType,scoreGames} from './score-games.js?v=167';
import {missionCleared,missionName} from './mission-names.js?v=4';
import {gameImageUrl,safeGameImage} from './game-artwork.js?v=171';
import {attendanceCount,latestPlayDate} from './stats-overview.js?v=165';
import {nameKey} from './personal-stats.js?v=117';
import {bggSearchUrl} from './firebase-config.js?v=64';
import {starterGames} from './game-catalog.js?v=166';
import {summarizeStats} from './stats-insights.js?v=67';
import {firstPlays,placeCounts} from './stats-extras.js?v=2';

const WIDTH=1080,HEIGHT=1350,MAX_COVERS=6,SIDE_COVERS=12,CLOSE_GAP=3;
const catalogById=new Map(starterGames.map(game=>[String(game.id),game]));
const copy={
 ko:{typesTitle:'어떤 게임을 했을까',typeNames:{strategy:'전략',family:'가족/파티',coop:'협동'},playsUnit:n=>`${n}판`,coopTitle:'협력 게임',coopCover:(play,attempt)=>{const result=play.cooperativeResult==='success'?'성공':play.cooperativeResult==='failure'?'실패':'결과 미입력',kind=coopKind(play);return kind==='difficulty'?`${play.difficulty} 난이도 ${result}`:kind==='campaign'?`시나리오 ${play.scenario}${Number.isInteger(play.scenarioLevel)?` · 레벨 ${play.scenarioLevel}`:''} ${result}${attempt>1?` (${attempt}번째 시도)`:''}`:Number.isFinite(play.sharedScore)?`${result} · ${play.sharedScore.toLocaleString('ko-KR')}점`:result;},coopGames:n=>`협력 게임 ${n}개`,coopResult:(wins,total)=>total===1?(wins?'성공':'실패'):`${total}판 중 ${wins}번 성공`,playedCount:'플레이한 게임 수',peopleCount:'함께한 인원 수',playedShort:'플레이 게임',peopleShort:'함께한 인원',otherGames:'그 밖의 게임',playedGames:'플레이한 게임',anonymous:'익명의 플레이어',recent:'최근 게임기록',dialogTitle:'최근 기록 공유',creating:'공유 이미지를 만드는 중입니다.',save:'이미지 저장',share:'SNS 공유',readyShare:'이미지를 저장하거나 원하는 SNS로 공유할 수 있습니다.',readySave:'이 브라우저에서는 이미지를 기기에 저장할 수 있습니다.',shareFailed:'공유하지 못했습니다. 이미지 저장을 이용해주세요.',empty:'공유할 최근 기록이 없습니다.',createFailed:'공유 이미지를 만들지 못했습니다. 잠시 후 다시 시도해주세요.',previewAlt:'최근 게임 기록 공유 이미지 미리보기',moreGames:n=>`외 ${n}경기`,winnersTitle:'게임별 우승자',closeTitle:'오늘의 접전',closeHeadline:(game,gap)=>`${game} ${gap}점 차`,closeDetail:(first,firstScore,secondScore,second)=>`${first} ${firstScore} : ${secondScore} ${second}`,mvpTitle:'오늘의 MVP',mvpDetail:(wins,plays)=>`${wins}승 · ${plays}판 중`,missionCover:(s,game)=>s.lastCleared?missionCleared(game,s.first,s.lastCleared,s.cleared):`${missionName(game,s.first)} 도전 중`,recapDialog:'기간 결산 공유',recapTitle:label=>`${label} 결산`,recapPlays:'플레이',recapDays:'플레이한 날',recapGames:'서로 다른 게임',recapWinner:'최다 우승',winsDetail:n=>`${n}승`,recapFirsts:'처음 해본 게임',newGames:n=>`${n}개`,recapPlace:'자주 간 곳',recapPreviewAlt:'기간 결산 공유 이미지 미리보기',recapEmpty:'선택 기간에 공유할 기록이 없습니다.',allTime:'전체 기간',monthLabel:(year,month)=>`${year}년 ${month}월`,yearLabel:year=>`${year}년`,place:'장소',atPlace:place=>`${place} 에서`,togetherTitle:date=>`${date} 함께한 기록`},
 en:{typesTitle:'What we played',typeNames:{strategy:'Strategy',family:'Family/Party',coop:'Co-op'},playsUnit:n=>`${n} ${n===1?'play':'plays'}`,coopTitle:'Co-op games',coopCover:(play,attempt)=>{const result=play.cooperativeResult==='success'?'Won':play.cooperativeResult==='failure'?'Lost':'No result',kind=coopKind(play);return kind==='difficulty'?`${play.difficulty} · ${result}`:kind==='campaign'?`Scenario ${play.scenario}${Number.isInteger(play.scenarioLevel)?` · Lv ${play.scenarioLevel}`:''} ${result}${attempt>1?` (try ${attempt})`:''}`:Number.isFinite(play.sharedScore)?`${result} · ${play.sharedScore.toLocaleString('en-US')} pts`:result;},coopGames:n=>`${n} co-op games`,coopResult:(wins,total)=>total===1?(wins?'Won':'Lost'):`${wins} of ${total} won`,playedCount:'Games played',peopleCount:'People',playedShort:'Games',peopleShort:'People',otherGames:'Other games',playedGames:'Games played',anonymous:'Anonymous player',recent:'Recent Game Record',dialogTitle:'Share recent record',creating:'Creating your share image…',save:'Save image',share:'Share',readyShare:'Save the image or share it to another app.',readySave:'You can save the image to this device.',shareFailed:'Could not share the image. Please save it instead.',empty:'There is no recent record to share.',createFailed:'Could not create the share image. Please try again.',previewAlt:'Preview of recent game record share image',moreGames:n=>`+${n} more games`,winnersTitle:'Winners by game',closeTitle:'Closest game',closeHeadline:(game,gap)=>`${game} by ${gap} ${gap===1?'point':'points'}`,closeDetail:(first,firstScore,secondScore,second)=>`${first} ${firstScore} : ${secondScore} ${second}`,mvpTitle:"Today's MVP",mvpDetail:(wins,plays)=>`${wins} wins · ${plays} games`,missionCover:s=>s.lastCleared?`Mission ${s.first}${s.lastCleared!==s.first?'–'+s.lastCleared:''} cleared`:`Mission ${s.first} in progress`,recapDialog:'Share recap',recapTitle:label=>`${label} Recap`,recapPlays:'Plays',recapDays:'Play days',recapGames:'Games',recapWinner:'Most wins',winsDetail:n=>`${n} ${n===1?'win':'wins'}`,recapFirsts:'First plays',newGames:n=>`${n} new ${n===1?'game':'games'}`,recapPlace:'Top place',recapPreviewAlt:'Preview of recap share image',recapEmpty:'There are no records to share in this period.',allTime:'All time',monthLabel:(year,month)=>`${['January','February','March','April','May','June','July','August','September','October','November','December'][month-1]} ${year}`,yearLabel:year=>String(year),place:'Place',atPlace:place=>`at ${place}`,togetherTitle:date=>`Played together · ${date}`}
};
let current=null;

export function shareLanguage(locale){
 const value=Array.isArray(locale)?locale[0]:locale||globalThis.ScoreI18n?.lang||globalThis.navigator?.languages?.[0]||globalThis.navigator?.language||'ko-KR';
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

// 영어: 기본 목록 이름 → 가져온 BGG 영어 이름 → Score 자체 게임의 영어 이름 → 저장된 이름 순.
export function localizedGameName(game,locale){
 const known=catalogById.get(String(game?.bggId||''));
 if(shareLanguage(locale)==='en')return known?.name||gameNames(game).en||scoreGameEnglishName(game?.name)||String(game?.name||'');
 if(!known)return String(game?.name||'');
 return known.aliases.find(name=>/[가-힣]/.test(name))||game.name||known.name;
}

function scoreGameEnglishName(name){const own=scoreGames.find(g=>g.name===name||g.aliases.includes(name));return own?own.aliases.find(alias=>!/[가-힣]/.test(alias))||'':'';}

// 협력 기록 한 판의 결과 한 줄(공유 이미지와 같은 문구). 미션형은 그 판의 미션 진행.
export function coopOutcome(play,records,locale){const words=copy[shareLanguage(locale)];return Array.isArray(play.missionAttempts)&&play.missionAttempts.length?words.missionCover(missionSummary(play.missionAttempts),play.game):words.coopCover(play,scenarioAttempt(records,play));}

// 공유용 게임 성격 3분류: 협동 → 가족/파티(BGG 유형에 가족·파티·어린이가 하나라도 있으면, 전략+가족도 가족) → 전략.
// BGG 유형이 없는 게임은 가족/파티로 봅니다. 무거운 전략 게임은 대부분 BGG 유형이 있기 때문입니다.
// BGG는 전략이지만 모임에서 가볍게 즐기는 게임은 아래 목록으로 가족/파티에 넣습니다(BGG ID 또는 공백 뺀 이름).
const LIGHT_GAMES={ids:['118','279537'],names:['모던아트','modernart','행성x를찾아서','thesearchforplanetx']};
export function shareGameType(play){
 if(play.rule==='cooperative')return 'coop';const plain=String(play.game?.name||'').replace(/s+/g,'').toLowerCase();if(LIGHT_GAMES.ids.includes(bggId(play.game))||LIGHT_GAMES.names.includes(plain))return 'family';const own=scoreGameType(play.game);if(own==='strategy')return 'strategy';if(own==='sports')return 'family';
 const info=metadata(play.game);if(info?.cooperative)return 'coop';const domains=info?.domains||[];
 if(domains.some(domain=>['Family Games','Party Games',"Children's Games",'Children’s Games'].includes(domain)))return 'family';return domains.length?'strategy':'family';
}
const later=(a,b)=>a.date.localeCompare(b.date)>0||a.date===b.date&&String(a.createdAt).localeCompare(String(b.createdAt))>0;
export function recentShareData(records,profile,locale){
 const lang=shareLanguage(locale),words=copy[lang],date=latestPlayDate(records),plays=records.filter(play=>play.date===date),games=new Map();
 for(const play of plays){
  const key=gameKey(play.game),localGame={...play.game,name:localizedGameName(play.game,lang)},entry=games.get(key)||{key,game:localGame,count:0,imageUrl:gameImageUrl(play.game),winners:[]};entry.count++;games.set(key,entry);if(Array.isArray(play.missionAttempts))(entry.missionAttempts||=[]).push(...play.missionAttempts);else if(play.rule==='cooperative'&&(!entry.coopPlay||later(play,entry.coopPlay)))entry.coopPlay=play;
  const ids=new Set(winnerIds(play));
  for(const person of play.players){
   if(!ids.has(person.id))continue;
   const name=person.anonymous===true?words.anonymous:person.name.trim();if(name&&!entry.winners.some(saved=>nameKey(saved)===nameKey(name)))entry.winners.push(name);
  }
 }
 const places=new Map();for(const play of plays){const place=typeof play.location==='string'?play.location.trim():'';if(place)places.set(place,(places.get(place)||0)+1);}
 const location=[...places].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
 // MVP·접전이 없는 날은 빈칸 대신 게임별 우승자 카드 한 장을 넣습니다.
 const cards=pickDayCards(records,date,lang),winnerRows=[...games.values()].filter(entry=>entry.winners.length).map(entry=>({game:entry.game.name,winners:entry.winners}));
 if(!cards.length&&winnerRows.length)cards.push({kind:'winners',title:words.winnersTitle,rows:winnerRows});
 // 협력 판이 있으면 MVP·접전 다음에 협력 게임 카드를 붙입니다. 미션형은 진행한 미션, 그 밖의 방식은 그 게임의 마지막 판 요약(성공·점수/난이도/시나리오)을 씁니다.
 const coop=new Map();for(const play of plays.filter(item=>item.rule==='cooperative')){const key=gameKey(play.game),row=coop.get(key)||{name:localizedGameName(play.game,lang),game:play.game,total:0,wins:0,attempts:[]};row.total++;if(play.cooperativeResult==='success')row.wins++;if(Array.isArray(play.missionAttempts))row.attempts.push(...play.missionAttempts);else if(!row.latest||later(play,row.latest))row.latest=play;coop.set(key,row);}
 const coopRows=[...coop.values()].map(row=>({name:row.name,result:row.attempts.length?words.missionCover(missionSummary(row.attempts),row.game):coopKind(row.latest)==='score'&&row.total>1?words.coopResult(row.wins,row.total):words.coopCover(row.latest,scenarioAttempt(records,row.latest))}));
 if(coopRows.length)cards.push({kind:'coop',title:words.coopTitle,headline:coopRows.length===1?coopRows[0].name:words.coopGames(coopRows.length),detail:coopRows.length===1?coopRows[0].result:coopRows.map(row=>`${row.name} ${row.result}`).join(' · ')});
 return {locale:lang,copy:words,date,title:formatRecentRecordTitle(date,lang),dateLabel:formatShareDate(date,lang),location,playCount:plays.length,peopleCount:attendanceCount(plays,profile),games:[...games.values()].map(({coopPlay,...entry})=>entry.missionAttempts?{...entry,mission:words.missionCover(missionSummary(entry.missionAttempts),entry.game)}:coopPlay?{...entry,mission:words.coopCover(coopPlay,scenarioAttempt(records,coopPlay))}:entry),cards,typeMix:plays.reduce((mix,play)=>{mix[shareGameType(play)]++;return mix;},{strategy:0,family:0,coop:0})};
}

// 그날 MVP(2승 이상, 동률 2명까지)와 접전(1·2위 CLOSE_GAP점 차 이하, 같은 차이면 최근 판)을 각각 찾아 해당하는 카드만 MVP → 접전 순으로 돌려줍니다.
export function pickDayCards(records,date,locale){
 const lang=shareLanguage(locale),words=copy[lang],dayPlays=records.filter(play=>play.date===date),cards=[];if(!dayPlays.length)return cards;
 const {leaders}=summarizeStats(dayPlays,date),wins=leaders[0]?.wins||0,tied=leaders.filter(row=>row.wins===wins);
 if(wins>=2&&tied.length<=2){const names=tied.map(row=>row.name.trim()),total=dayPlays.length;cards.push({kind:'mvp',names,wins,plays:total,title:words.mvpTitle,headline:names.join(' · '),detail:words.mvpDetail(wins,total)});}
 let plays=dayPlays;
 for(let summary=summarizeStats(plays,date);summary.closest;summary=summarizeStats(plays,date)){
  const {play,first,second,gap}=summary.closest;if(gap>CLOSE_GAP)break;
  if(first.anonymous===true||second.anonymous===true){plays=plays.filter(item=>item!==play);continue;}
  const game=localizedGameName(play.game,lang);cards.push({kind:'close',playId:play.id,game,gap,title:words.closeTitle,headline:words.closeHeadline(game,gap),detail:words.closeDetail(first.name.trim(),first.score,second.score,second.name.trim())});break;
 }
 return cards;
}

export function roundRect(ctx,x,y,w,h,r){
 const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
export function fillRound(ctx,x,y,w,h,r,fill){roundRect(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function coverProxy(url){if(!url)return '';const endpoint=new URL(bggSearchUrl);endpoint.searchParams.set('action','cover');endpoint.searchParams.set('url',url);return endpoint.href;}
export function shareImageSource(url,base=globalThis.location?.href){if(!url)return '';if(safeGameImage(url))return coverProxy(url);try{const local=new URL(url,base);return base&&local.origin===new URL(base).origin?local.href:'';}catch{return '';}}
export function loadImage(url){const source=shareImageSource(url);return new Promise(resolve=>{if(!source){resolve(null);return;}const image=new Image();let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>finish(null),12000);image.crossOrigin='anonymous';image.decoding='async';image.referrerPolicy='no-referrer';image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=source;});}
export function fitText(ctx,text,maxWidth,maxSize,minSize=24){let size=maxSize;for(;size>minSize;size-=2){ctx.font=`700 ${size}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;}return size;}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){
 const words=String(text).split(/\s+/),lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word;if(lines.length===maxLines)break;}}
 if(lines.length<maxLines&&line)lines.push(line);
 if(lines.length===maxLines&&words.join(' ')!==lines.join(' ')){while(lines[maxLines-1].length>1&&ctx.measureText(lines[maxLines-1]+'…').width>maxWidth)lines[maxLines-1]=lines[maxLines-1].slice(0,-1);lines[maxLines-1]+='…';}
 lines.forEach((value,index)=>ctx.fillText(value,x,y+index*lineHeight));return lines.length;
}
export function clippedText(ctx,text,maxWidth){let value=String(text);if(ctx.measureText(value).width<=maxWidth)return value;while(value.length>1&&ctx.measureText(value+'…').width>maxWidth)value=value.slice(0,-1);return value+'…';}
// 표지가 10개 이상이면 위·아래 그라데이션 대신 표지 전체에 한 가지 농도의 그늘을 깝니다.
// 표지는 칸을 꽉 채우되, 세로로 남는 부분은 위쪽 15% 지점을 기준으로 잘라 상자 위쪽의 게임 제목·로고가 보이게 합니다.
function drawCover(ctx,image,game,x,y,w,h,flat=false){
 const label=game.winners?.length?'🏆 '+game.winners.join(', '):game.mission||'';fillRound(ctx,x,y,w,h,28,'#17253a');ctx.save();roundRect(ctx,x,y,w,h,28);ctx.clip();
 if(image){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale,sx=(image.naturalWidth-sw)/2,sy=(image.naturalHeight-sh)*.15;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);}else{const gradient=ctx.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#294d79');gradient.addColorStop(1,'#15253c');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);ctx.fillStyle='#93bced';ctx.font='700 34px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';drawWrapped(ctx,game.game.name,x+w/2,y+h/2-20,w-50,42,3);}
 if(flat){ctx.fillStyle='rgba(4,10,20,.5)';ctx.fillRect(x,y,w,h);}else{const shade=ctx.createLinearGradient(0,y+h*.54,0,y+h);shade.addColorStop(0,'transparent');shade.addColorStop(1,'rgba(4,10,20,.92)');ctx.fillStyle=shade;ctx.fillRect(x,y,w,h);
 if(label){const top=ctx.createLinearGradient(0,y,0,y+Math.min(120,h*.5));top.addColorStop(0,'rgba(4,10,20,.82)');top.addColorStop(1,'transparent');ctx.fillStyle=top;ctx.fillRect(x,y,w,h);}}ctx.restore();
 // ×N 배지는 위쪽 우승자와 아래쪽 게임명 사이 가운데에 두고, 게임명은 배지와 상관없이 하단에 둡니다.
 const repeated=game.count>1,nameFont='700 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';let nameY=y+h-56,badgeY=y+h/2-14,labelY=y+47;
 // 단색 그늘(flat)일 때는 우승자 → 게임명을 한 덩어리로 표지 세로 가운데에 두고, ×N 배지는 오른쪽 위 모서리에 둡니다.
 if(flat&&image){ctx.font=nameFont;const lines=drawWrapped({measureText:text=>ctx.measureText(text),fillText(){}},game.game.name,0,0,w-44,31,2),parts=[label?30:0,lines*31-6].filter(Boolean),total=parts.reduce((sum,value)=>sum+value,0)+8*(parts.length-1);let top=y+(h-total)/2;
  if(label){labelY=top+24;top+=38;}nameY=top+25;}
 if(image){ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=nameFont;drawWrapped(ctx,game.game.name,x+w/2,nameY,w-44,31,2);}
 if(repeated){const badgeX=flat?x+w-48:x+w/2;if(flat)badgeY=y+33;fillRound(ctx,badgeX-35,badgeY-21,70,42,21,'rgba(5,13,25,.78)');ctx.fillStyle='#e9f3ff';ctx.font='700 21px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(`×${game.count}`,badgeX,badgeY+8);}
 // 우승자는 표지 위쪽 가운데 정렬.
 if(label){const room=w-44;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';fitText(ctx,label,room,24,18);ctx.fillText(clippedText(ctx,label,room),x+w/2,labelY);}
}
export function drawBackground(ctx){
 const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);gradient.addColorStop(0,'#07111f');gradient.addColorStop(.56,'#10243e');gradient.addColorStop(1,'#0d4a5c');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#72d4ff';for(const [x,y,r]of [[930,70,250],[90,950,300],[990,1110,180],[380,590,120]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function metric(ctx,{x,y,w,h},value,label,{center=false,muted=false}={}){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign=center?'center':'left';const left=center?x+w/2:x+34,text=String(value);
 ctx.fillStyle=muted?'rgba(225,239,255,.68)':'#fff';let size=72;for(;size>36;size-=4){ctx.font=`800 ${size}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;if(ctx.measureText(text).width<=w-40)break;}ctx.fillText(clippedText(ctx,text,w-40),left,y+h/2+14);
 ctx.fillStyle='#9fc8f7';const room=w-(center?28:56);for(let size=26;size>=18;size-=2){ctx.font=`600 ${size}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;if(ctx.measureText(label).width<=room)break;}ctx.fillText(clippedText(ctx,label,room),left,y+h/2+58);
}
// 6개 이하는 상단 표지 → 지표 줄(장소가 있으면 3칸) → 카드 최대 2장, 7개 이상은 왼쪽 2열 표지 + 오른쪽 지표·카드(MVP·접전·협력 최대 3장) 열로 배치합니다.
// 12개 이상(wide)은 표지를 12개(2열 6행)까지 그리고, 오른쪽 열은 가로 지표 2칸 → MVP·접전 → 아래 목록 칸 순입니다. 목록 칸은 12개를 넘는 게임이 있으면 "그 밖의 게임", 없으면 게임별 우승자입니다.
// top은 측면 레이아웃 본문 시작 y입니다. 10개 이상 날은 큰 제목을 빼고 164부터 시작해 늘어난 높이만큼 표지·카드를 키웁니다.
export function shareCoverLayout(gameCount,cardCount=0,hasPlace=false,top=274){
 const gap=18,extra=274-top,cards=Math.min(cardCount,gameCount>MAX_COVERS?3:2);
 if(gameCount>MAX_COVERS&&gameCount<SIDE_COVERS){const rows=Math.ceil(gameCount/2),cellW=(560-gap)/2,cellH=Math.min(cellW,(986+extra-gap*(rows-1))/rows),cardH=(650+extra-gap*(Math.max(cards,2)-1))/Math.max(cards,2);
  return {side:true,wide:false,others:null,cells:Array.from({length:gameCount},(_,index)=>({x:72+index%2*(cellW+gap),y:top+Math.floor(index/2)*(cellH+gap),w:cellW,h:cellH})),metrics:[{x:660,y:top,w:348,h:150},{x:660,y:top+168,w:348,h:150}],cards:Array.from({length:cards},(_,index)=>({x:660,y:top+336+index*(cardH+gap),w:348,h:cardH}))};}
 if(gameCount>=SIDE_COVERS){const shown=Math.min(gameCount,SIDE_COVERS),rows=Math.ceil(shown/2),cellW=(560-gap)/2,cellH=Math.min(cellW,(1016+extra-gap*(rows-1))/rows),overflow=gameCount>SIDE_COVERS,bottom=1285,cardY=top+166;
  const cardH=180,othersY=cardY+cards*(cardH+gap);
  const cells=Array.from({length:shown},(_,index)=>({x:72+index%2*(cellW+gap),y:top+Math.floor(index/2)*(cellH+gap),w:cellW,h:cellH}));
  return {side:true,wide:true,cells,others:{x:660,y:othersY,w:348,h:bottom-othersY},metrics:[{x:660,y:top,w:168,h:148},{x:840,y:top,w:168,h:148}],cards:Array.from({length:cards},(_,index)=>({x:660,y:cardY+index*(cardH+gap),w:348,h:cardH}))};}
 // 6개 이하는 표지 영역이 남는 세로 공간을 모두 차지해 아래쪽이 측면 레이아웃과 같은 1260에서 끝납니다.
 const coverH=1260-122-20-172-(cards?30+196:0),metricY=122+coverH+20;
 const count=Math.max(1,gameCount),cols=count===4?2:count<=2?count:3,rows=Math.ceil(count/cols),cellW=(936-gap*(cols-1))/cols,cellH=(coverH-gap*(rows-1))/rows,slots=hasPlace?3:2,metricGap=39,metricW=(936-metricGap*(slots-1))/slots,cardW=cards>1?(936-gap)/2:936;
 return {side:false,others:null,metrics:Array.from({length:slots},(_,index)=>({x:72+index*(metricW+metricGap),y:metricY,w:metricW,h:172})),cards:Array.from({length:cards},(_,index)=>({x:72+index*(cardW+gap),y:metricY+172+30,w:cardW,h:196})),cells:Array.from({length:Math.min(gameCount,MAX_COVERS)},(_,index)=>{const row=Math.floor(index/cols),col=index%cols,rowCount=Math.min(cols,count-row*cols),offset=(cols-rowCount)*(cellW+gap)/2;return {x:72+offset+col*(cellW+gap),y:122+row*(cellH+gap),w:cellW,h:cellH};})};
}
function otherGames(ctx,games,title,words,{x,y,w,h}){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#9fc8f7';ctx.font='600 24px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(title,x+28,y+44);
 const lineH=36,capacity=Math.max(1,Math.floor((h-70)/lineH)),rows=games.length>capacity?games.slice(0,capacity-1):games;
 rows.forEach((game,index)=>{const text=game.winners?.length?`${game.game.name} · ${game.winners.join(', ')}`:game.game.name;ctx.fillStyle='#fff';fitText(ctx,text,w-56,26,20);ctx.fillText(clippedText(ctx,text,w-56),x+28,y+86+index*lineH);});
 if(rows.length<games.length){ctx.fillStyle='#9fc8f7';ctx.font='600 22px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.moreGames(games.length-rows.length),x+28,y+86+rows.length*lineH);}
}

// 게임 성격 비율 막대: 전략 · 가족/파티 · 협동을 판 수 기준 비율로 그립니다. 낮은 칸(행 높이 60 미만)은 이름 · 막대 · 비율을 한 줄에 둡니다.
function typesCard(ctx,mix,words,{x,y,w,h}){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#9fc8f7';ctx.font='600 24px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.typesTitle,x+28,y+44);
 const rows=[['strategy','#82bfff'],['family','#ffc56b'],['coop','#7ee0b0']],total=rows.reduce((sum,[key])=>sum+(mix?.[key]||0),0)||1,rowH=Math.min(70,(h-76)/3),barW=w-56;
 const compact=rowH<60;
 rows.forEach(([key,color],index)=>{const count=mix?.[key]||0,ratio=count/total,top=y+70+index*rowH;
  if(compact){const barX=x+132,barLen=w-132-118;ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='700 21px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.typeNames[key],x+28,top+22);fillRound(ctx,barX,top+10,barLen,12,6,'rgba(255,255,255,.12)');if(count)fillRound(ctx,barX,top+10,Math.max(12,barLen*ratio),12,6,color);ctx.textAlign='right';ctx.fillStyle='#9fc8f7';ctx.font='600 19px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(`${Math.round(ratio*100)}% · ${words.playsUnit(count)}`,x+w-24,top+22);return;}
  ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='700 23px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.typeNames[key],x+28,top+24);
  ctx.textAlign='right';ctx.fillStyle='#9fc8f7';ctx.font='600 20px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(`${Math.round(ratio*100)}% · ${words.playsUnit(count)}`,x+w-28,top+24);
  fillRound(ctx,x+28,top+36,barW,12,6,'rgba(255,255,255,.12)');if(count)fillRound(ctx,x+28,top+36,Math.max(12,barW*ratio),12,6,color);});
 ctx.textAlign='left';
}
function dayCard(ctx,card,{x,y,w,h}){
 const top=y+(h-196)/2;fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign='left';ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,card.title,w-68),x+34,top+46);
 ctx.fillStyle='#fff';fitText(ctx,card.headline,w-68,40,26);ctx.fillText(clippedText(ctx,card.headline,w-68),x+34,top+104);
 ctx.fillStyle='#9fc8f7';ctx.font='600 22px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,card.detail,w-68),x+34,top+166);
}
function winnersCard(ctx,card,words,{x,y,w,h},columns){
 fillRound(ctx,x,y,w,h,28,'rgba(255,255,255,.10)');ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,card.title,w-68),x+34,y+46);
 const lineH=38,perColumn=Math.max(1,Math.floor((h-74)/lineH)),capacity=perColumn*columns,rows=card.rows.length>capacity?card.rows.slice(0,capacity-1):card.rows,colW=(w-68-(columns-1)*24)/columns;
 const at=index=>({cx:x+34+Math.floor(index/perColumn)*(colW+24),cy:y+92+index%perColumn*lineH});
 rows.forEach((row,index)=>{const {cx,cy}=at(index),text=`${row.game} · 🏆 ${row.winners.join(', ')}`;ctx.fillStyle='#fff';fitText(ctx,text,colW,26,20);ctx.fillText(clippedText(ctx,text,colW),cx,cy);});
 if(rows.length<card.rows.length){const {cx,cy}=at(rows.length);ctx.fillStyle='#9fc8f7';ctx.font='600 22px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.moreGames(card.rows.length-rows.length),cx,cy);}
}

export async function createRecentShareImage(data){
 const words=data?.copy||shareCopy(data?.locale);if(!data?.playCount)throw Error(words.empty);
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');drawBackground(ctx);
 const place=data.location||'',many=data.games.length>=10||data.playCount>=10,cards=(data.cards||[]).filter(card=>!(many&&card.kind==='winners')).concat(many&&data.games.length<SIDE_COVERS&&data.typeMix&&(data.cards||[]).filter(card=>card.kind!=='winners').length<3?[{kind:'types'}]:[]),headless=many&&data.games.length>MAX_COVERS,layout=shareCoverLayout(data.games.length,cards.length,Boolean(place),headless?164:274),shown=data.games.slice(0,layout.cells.length),images=await Promise.all(shown.map(game=>loadImage(game.imageUrl)));
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#82bfff';ctx.font='700 30px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText('SCORE COUNTER',72,71);
 const corner=headless?[data.dateLabel,place?words.atPlace(place):''].filter(Boolean).join(' '):layout.side?(place?words.atPlace(place):''):data.dateLabel||'';if(corner){ctx.fillStyle='#fff';ctx.textAlign='right';ctx.font='700 31px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(clippedText(ctx,corner,600),1008,72);ctx.textAlign='left';}
 if(layout.side){if(!headless){const title=words.togetherTitle(data.dateLabel||'');ctx.fillStyle='#fff';fitText(ctx,title,936,53,40);ctx.fillText(clippedText(ctx,title,936),72,168);}ctx.fillStyle='#9fc8f7';ctx.font='600 25px system-ui, -apple-system, "Noto Sans KR", sans-serif';ctx.fillText(words.playedGames,72,headless?140:250);const wide=layout.wide;metric(ctx,layout.metrics[0],data.games.length,wide?words.playedShort:words.playedCount,{center:wide});metric(ctx,layout.metrics[1],data.peopleCount,wide?words.peopleShort:words.peopleCount,{center:wide});}
 else{const values=[...(place?[[place,words.place,true]]:[]),[data.games.length,words.playedCount,false],[data.peopleCount,words.peopleCount,false]];values.forEach(([value,label,muted],index)=>metric(ctx,layout.metrics[index],value,label,{center:true,muted}));}
 shown.forEach((game,index)=>{const {x,y,w,h}=layout.cells[index];drawCover(ctx,images[index],game,x,y,w,h,data.games.length>=10);});
 if(layout.others){const rest=data.games.slice(shown.length);rest.length?otherGames(ctx,rest,words.otherGames,words,layout.others):data.typeMix?typesCard(ctx,data.typeMix,words,layout.others):otherGames(ctx,data.games.filter(game=>game.winners?.length),words.winnersTitle,words,layout.others);}
 layout.cards.forEach((box,index)=>cards[index].kind==='types'?typesCard(ctx,data.typeMix,words,box):cards[index].kind==='winners'?winnersCard(ctx,cards[index],words,layout.side&&!layout.wide?{...box,h:650}:box,layout.side?1:2):dayCard(ctx,cards[index],box));
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지를 만들지 못했습니다.')),'image/png'));
}

function ensureDialog(){
 let dialog=document.getElementById('recentShareDialog');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='recentShareDialog';dialog.className='recent-share-dialog';dialog.innerHTML='<div class="record-head"><h2></h2><button class="score-close" type="button" aria-label="닫기">×</button></div><p class="record-note recent-share-status" role="status" aria-live="polite"></p><div class="recent-share-preview-wrap"><img class="recent-share-preview" hidden></div><div class="actions recent-share-actions"><button class="secondary recent-share-save" type="button" disabled></button><button class="primary recent-share-send" type="button" disabled></button></div>';
 const close=()=>dialog.close();dialog.querySelector('.score-close').onclick=close;dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.addEventListener('close',()=>{if(current?.url)URL.revokeObjectURL(current.url);current=null;});document.body.append(dialog);return dialog;
}
function download(file,url){const link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();}

async function showShare(data,create){
 const dialog=ensureDialog(),status=dialog.querySelector('.recent-share-status'),preview=dialog.querySelector('.recent-share-preview'),save=dialog.querySelector('.recent-share-save'),send=dialog.querySelector('.recent-share-send');
 const words=data.copy;dialog.lang=data.locale;dialog.querySelector('h2').textContent=data.dialogTitle||words.dialogTitle;dialog.querySelector('.score-close').setAttribute('aria-label',data.locale==='ko'?'닫기':'Close');preview.alt=data.previewAlt||words.previewAlt;save.textContent=words.save;send.textContent=words.share;
 if(current?.url)URL.revokeObjectURL(current.url);current=null;status.textContent=words.creating;preview.hidden=true;preview.removeAttribute('src');save.disabled=true;send.disabled=true;send.hidden=false;if(!dialog.open)dialog.showModal();
 try{const blob=await create(data);if(!dialog.open)return;const file=new File([blob],data.fileName||`score-${data.date}.png`,{type:'image/png'}),url=URL.createObjectURL(blob),canShare=typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[file]}));current={file,url,data};preview.src=url;preview.hidden=false;save.disabled=false;send.disabled=!canShare;send.hidden=!canShare;status.textContent=canShare?words.readyShare:words.readySave;save.onclick=()=>download(file,url);send.onclick=async()=>{try{await navigator.share({files:[file],title:data.title,text:`${data.title} · Score Counter`});}catch(error){if(error?.name!=='AbortError')status.textContent=words.shareFailed;}};
 }catch(error){status.textContent=error?.message||words.createFailed;}
}

export async function openRecentShare(records,profile){return showShare(recentShareData(records,profile),createRecentShareImage);}

// 기간 결산 공유: 선택 기간의 판·플레이한 날·게임 수, 많이 한 게임 표지 3개, 최다 우승·처음 해본 게임·자주 간 곳 카드.
export function periodShareLabel({preset,current:{start,end}},locale){
 const words=copy[shareLanguage(locale)],year=Number(start.slice(0,4)),month=Number(start.slice(5,7));if(preset==='all')return words.allTime;
 if(start.slice(8)==='01'&&start.slice(0,7)===end.slice(0,7))return words.monthLabel(year,month);
 if(start.slice(5)==='01-01'&&start.slice(0,4)===end.slice(0,4))return words.yearLabel(year);
 return `${formatShareDate(start,locale)} ~ ${formatShareDate(end,locale)}`;
}
export function periodShareData(records,model,profile,locale){
 const lang=shareLanguage(locale),words=copy[lang],{start,end}=model.current,plays=records.filter(play=>play.date>=start&&play.date<=end),games=new Map(),wins=new Map();
 for(const play of plays){
  const key=gameKey(play.game),entry=games.get(key)||{key,game:{...play.game,name:localizedGameName(play.game,lang)},count:0,imageUrl:gameImageUrl(play.game)};entry.count++;games.set(key,entry);
  const ids=new Set(winnerIds(play));for(const person of play.players){const name=String(person.name||'').trim();if(!ids.has(person.id)||person.anonymous===true||!name)continue;const row=wins.get(nameKey(name))||{name,wins:0};row.wins++;wins.set(nameKey(name),row);}
 }
 const label=periodShareLabel(model,lang),cards=[],winners=[...wins.values()].sort((a,b)=>b.wins-a.wins),top=winners[0]?.wins||0;
 if(top){const names=winners.filter(row=>row.wins===top).map(row=>row.name);cards.push({kind:'mvp',title:words.recapWinner,headline:names.slice(0,2).join(' · ')+(names.length>2?' …':''),detail:words.winsDetail(top)});}
 const firsts=model.preset==='all'?[]:firstPlays(records,model.current);if(firsts.length)cards.push({kind:'firsts',title:words.recapFirsts,headline:words.newGames(firsts.length),detail:firsts.map(({play})=>localizedGameName(play.game,lang)).join(', ')});
 const place=placeCounts(plays)[0];if(place)cards.push({kind:'place',title:words.recapPlace,headline:place.place,detail:words.playsUnit(place.count)});
 return {locale:lang,copy:words,date:end,label,title:words.recapTitle(label),fileName:`score-${start}-${end}.png`,playCount:plays.length,dayCount:new Set(plays.map(play=>play.date)).size,peopleCount:attendanceCount(plays,profile),games:[...games.values()].sort((a,b)=>b.count-a.count),cards,typeMix:plays.reduce((mix,play)=>{mix[shareGameType(play)]++;return mix;},{strategy:0,family:0,coop:0})};
}
