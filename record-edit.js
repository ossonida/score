import {isPlay} from './records-core.js?v=64';
export function editRecordedPlayer(play,playerId,field,value){
 if(!play.players.some(p=>p.id===playerId))throw Error('플레이어를 찾을 수 없습니다.');
 if(!['name','score','result'].includes(field))throw Error('수정 항목을 확인해주세요.');
 if(field==='name'){value=String(value).trim();if(!value||value.length>120)throw Error('이름을 1~120자로 입력해주세요.');}
 else if(field==='score'){const raw=String(value??'').trim();if(raw&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))throw Error('올바른 점수를 입력해주세요.');value=raw===''?null:Number(raw);if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER))throw Error('점수가 입력 가능한 범위를 넘었습니다.');}
 else {value=String(value??'').trim();const rank=value.startsWith('rank:')?Number(value.slice(5)):null;if(play.rule==='cooperative')throw Error('협력 게임에는 개인 승패나 순위를 지정할 수 없습니다.');if(play.players.find(p=>p.id===playerId).score!==null)throw Error('점수가 없는 플레이어만 결과를 직접 지정할 수 있습니다.');if(value!==''&&value!=='winner'&&value!=='draw'&&value!=='loser'&&(!Number.isSafeInteger(rank)||rank<1||rank>play.players.length))throw Error('승패·무승부 또는 올바른 순위를 선택해주세요.');}
 const original=play.players.find(p=>p.id===playerId);if(original[field]===value)return play;
 if(field==='result'){const rank=value.startsWith('rank:')?Number(value.slice(5)):null;if((value===''&&original.winner===undefined&&original.draw===undefined&&original.rank===undefined)||(value==='winner'&&original.winner===true&&original.draw===undefined&&original.rank===undefined)||(value==='draw'&&original.draw===true&&original.winner===undefined&&original.rank===undefined)||(value==='loser'&&original.winner===false&&original.draw===undefined&&original.rank===undefined)||(rank!==null&&original.rank===rank&&original.winner===(rank===1)&&original.draw===undefined))return play;}
 const updated={...play,players:play.players.map(p=>{const next={...p};if(field==='score'){delete next.winner;delete next.draw;delete next.rank;}if(p.id===playerId){if(field==='result'){delete next.winner;delete next.draw;delete next.rank;if(value==='winner')next.winner=true;else if(value==='draw')next.draw=true;else if(value==='loser')next.winner=false;else if(value.startsWith('rank:')){next.rank=Number(value.slice(5));next.winner=next.rank===1;}}else{next[field]=value;if(field==='name')next.anonymous=false;}}return next;})};
 if(!isPlay(updated))throw Error('기록 형식을 확인해주세요.');return updated;
}
export function removeRecordedPlayer(play,playerId){
 if(!play.players.some(p=>p.id===playerId))throw Error('플레이어를 찾을 수 없습니다.');
 if(play.players.length<=1)throw Error('마지막 플레이어는 삭제할 수 없습니다. 경기 전체를 지우려면 기록 삭제를 이용해주세요.');
 const updated={...play,players:play.players.filter(p=>p.id!==playerId).map(p=>{const next={...p};delete next.winner;delete next.draw;delete next.rank;return next;})};
 if(!isPlay(updated))throw Error('기록 형식을 확인해주세요.');return updated;
}
