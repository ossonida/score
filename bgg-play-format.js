const idPattern=/^[1-9][0-9]{0,9}$/;
const missionNote=play=>{const list=Array.isArray(play.missionAttempts)?play.missionAttempts:[];if(!list.length)return Number.isSafeInteger(play.scenario)?`Scenario ${play.scenario}
`:typeof play.difficulty==='string'&&play.difficulty?`Difficulty ${play.difficulty}
`:'';const first=list[0].mission,last=list.at(-1).mission,cleared=list.filter(item=>item.result==='success').length;return `Missions ${first}${last!==first?'-'+last:''} · cleared ${cleared} · ${list.length} attempts\n`;};

export function bggPlayForm(play,username,bggPlayId=''){
 const explicit=play.players.some(person=>typeof person.winner==='boolean');
 const known=play.rule!=='cooperative'&&(explicit?play.players.some(person=>person.winner===true):play.players.every(person=>person.score!==null));
 const scores=play.players.map(person=>person.score),best=!explicit&&known?(play.rule==='lowest'?Math.min(...scores):Math.max(...scores)):null,self=play.players.filter(person=>person.isSelf===true).length===1;
 const form=new URLSearchParams({ajax:'1',action:'save',version:'2',objecttype:'thing',objectid:String(play.game.bggId),playdate:play.date,dateinput:play.date,length:'0',location:typeof play.location==='string'?play.location.slice(0,120):'',quantity:'1',incomplete:'0',nowinstats:known?'0':'1',comments:'Recorded with Score Counter\n'+missionNote(play)+'[ScoreCounter:'+play.id+']'});
 if(bggPlayId){if(!idPattern.test(String(bggPlayId)))throw Error('INVALID_PLAY');form.set('playid',String(bggPlayId));}
 play.players.forEach((person,index)=>{const key=name=>'players['+index+']['+name+']';for(const [name,value]of Object.entries({playerid:'player_'+index,name:person.anonymous?'Anonymous player':person.name.trim(),username:self&&person.isSelf===true?username:'',color:person.color,position:'',score:person.score===null?'':String(person.score),rating:'0',new:'0',win:known&&(explicit?person.winner===true:person.score===best)?'1':'0'}))form.set(key(name),value);});
 return form;
}

export async function bggPlayFingerprint(play,username){
 const bytes=new TextEncoder().encode(bggPlayForm(play,username).toString()),hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
