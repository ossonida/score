import {isPlay} from './records-core.js?v=64';
export function editRecordedPlayer(play,playerId,field,value){
 if(!play.players.some(p=>p.id===playerId))throw Error('플레이어를 찾을 수 없습니다.');
 if(!['name','score'].includes(field))throw Error('수정 항목을 확인해주세요.');
 if(field==='name'){value=String(value).trim();if(!value||value.length>120)throw Error('이름을 1~120자로 입력해주세요.');}
 else {const raw=String(value??'').trim();if(raw&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))throw Error('올바른 점수를 입력해주세요.');value=raw===''?null:Number(raw);if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER))throw Error('점수가 입력 가능한 범위를 넘었습니다.');}
 const original=play.players.find(p=>p.id===playerId);if(original[field]===value)return play;
 const updated={...play,players:play.players.map(p=>{const next={...p};if(field==='score'){delete next.winner;delete next.rank;}if(p.id===playerId){next[field]=value;if(field==='name')next.anonymous=false;}return next;})};
 if(!isPlay(updated))throw Error('기록 형식을 확인해주세요.');return updated;
}
export function removeRecordedPlayer(play,playerId){
 if(!play.players.some(p=>p.id===playerId))throw Error('플레이어를 찾을 수 없습니다.');
 if(play.players.length<=1)throw Error('마지막 플레이어는 삭제할 수 없습니다. 경기 전체를 지우려면 기록 삭제를 이용해주세요.');
 const updated={...play,players:play.players.filter(p=>p.id!==playerId).map(p=>{const next={...p};delete next.winner;delete next.rank;return next;})};
 if(!isPlay(updated))throw Error('기록 형식을 확인해주세요.');return updated;
}
