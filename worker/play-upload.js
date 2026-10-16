const idPattern=/^[1-9][0-9]{0,9}$/;
export function checkedPlay(p){
 if(!p||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id)||!idPattern.test(String(p.game?.bggId||''))||typeof p.game?.name!=='string'||!p.game.name.trim()||p.game.name.length>120||!['highest','lowest','cooperative'].includes(p.rule)||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw Error('INVALID_PLAY');
 const date=new Date(p.date+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==p.date)throw Error('INVALID_PLAY');
 if(!Array.isArray(p.players)||!p.players.length||p.players.length>100||p.players.some(x=>!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>120||!(x.score===null||typeof x.score==='number'&&Number.isFinite(x.score)&&Math.abs(x.score)<=Number.MAX_SAFE_INTEGER)||typeof x.color!=='string'||!/^#[a-f0-9]{6}$/i.test(x.color)))throw Error('INVALID_PLAY');
 return {id:p.id,game:{name:p.game.name.trim(),bggId:String(p.game.bggId)},date:p.date,rule:p.rule,players:p.players.map(x=>({name:x.name.trim(),score:x.score,color:x.color,isSelf:x.isSelf===true,anonymous:x.anonymous===true,...(typeof x.winner==='boolean'?{winner:x.winner}:{})}))};
}
export function playForm(play,username,bggPlayId=''){
 const p=checkedPlay(play),explicit=p.players.some(x=>typeof x.winner==='boolean'),known=p.rule!=='cooperative'&&(explicit?p.players.some(x=>x.winner===true):p.players.every(x=>x.score!==null));
 const scores=p.players.map(x=>x.score),best=known?(p.rule==='lowest'?Math.min(...scores):Math.max(...scores)):null,self=p.players.filter(x=>x.isSelf).length===1;
 const form=new URLSearchParams({ajax:'1',action:'save',version:'2',objecttype:'thing',objectid:p.game.bggId,playdate:p.date,dateinput:p.date,length:'0',location:'',quantity:'1',incomplete:'0',nowinstats:known?'0':'1',comments:'Recorded with Score Counter\n[ScoreCounter:'+p.id+']'});
 if(bggPlayId){if(!idPattern.test(String(bggPlayId)))throw Error('INVALID_PLAY');form.set('playid',String(bggPlayId));}
 p.players.forEach((person,i)=>{const key=name=>'players['+i+']['+name+']';for(const [name,value]of Object.entries({playerid:'player_'+i,name:person.anonymous?'Anonymous player':person.name,username:self&&person.isSelf?username:'',color:person.color,position:'',score:person.score===null?'':String(person.score),rating:'0',new:'0',win:known&&(explicit?person.winner===true:person.score===best)?'1':'0'}))form.set(key(name),value);});return form;
}
export async function playFingerprint(play,username){const bytes=new TextEncoder().encode(playForm(play,username).toString()),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
