export const PLAYER_COUNT_BUCKETS=['1','2','3-4','5+'];

const allowed={
 setup_started:{entry_point:['game_setup','scoreless_setup']},
 player_added:{entry_point:['manual','random','bulk','saved','game_setup','scoreless_setup'],player_count:PLAYER_COUNT_BUCKETS},
 player_removed:{context:['scoreboard','record','result_board']},
 player_reordered:{context:['rank','team']},
 player_updated:{change_type:['name','color','team']},
 game_started:{mode:['score','win','team','rank','cooperative'],player_count:PLAYER_COUNT_BUCKETS},
 first_score_changed:{direction:['increase','decrease'],input_method:['step','direct']},
 score_changed:{direction:['increase','decrease'],input_method:['step','direct']},
 game_end_started:{mode:['score','win','team','rank','cooperative']},
 game_ended:{mode:['score','win','team','rank','cooperative'],outcome:['saved','discarded']},
 statistics_viewed:{entry_point:['navigation','game_library','record']},
 history_viewed:{entry_point:['navigation','statistics']},
 record_changed:{change_type:['name','score','result','cooperative_result','shared_score','player_removed','identity']},
 record_deleted:{},
 feature_used:{
  feature:['scoreboard','record_mode','statistics','history','game_library','data_transfer','account','cloud_sync','bgg','install'],
  action:['scores_reset','players_reset','mode_selected','result_changed','filter_changed','game_opened','game_added','search_completed','import_previewed','import_completed','import_cancelled','export_completed','login_completed','logout_completed','sync_completed','recovery_completed','guest_records_merged','guest_records_deleted','link_completed','unlink_completed','share_completed','install_accepted']
 }
};
const required={setup_started:['entry_point'],player_added:['entry_point','player_count'],player_removed:['context'],player_reordered:['context'],player_updated:['change_type'],game_started:['mode','player_count'],first_score_changed:['direction','input_method'],score_changed:['direction','input_method'],game_end_started:['mode'],game_ended:['mode','outcome'],statistics_viewed:['entry_point'],history_viewed:['entry_point'],record_changed:['change_type'],feature_used:['feature','action']};

export const ANALYTICS_EVENTS=Object.freeze(Object.fromEntries(Object.keys(allowed).map(name=>[name,name])));

export function playerCountBucket(value){
 const count=Number(value);if(!Number.isFinite(count)||count<1)return undefined;
 if(count===1)return '1';if(count===2)return '2';if(count<=4)return '3-4';return '5+';
}

function cleanParams(name,params){
 const schema=allowed[name];if(!schema)return null;const clean={};
 for(const [key,values] of Object.entries(schema))if(values.includes(params?.[key]))clean[key]=params[key];
 if(required[name]?.some(key=>!clean[key]))return null;
 return clean;
}

export function createFeatureAnalytics({send,storage}={}){
 const store=storage||{getItem:()=>null,setItem:()=>{}};let setupStarted=false,gameEnded=false;
 let firstScoreChanged=store.getItem('score.analytics.firstScore.v1')==='1';
 const track=(name,params={})=>{const clean=cleanParams(name,params);if(clean===null)return false;try{send?.(name,clean);return true;}catch{return false;}};
 const markFirstScore=value=>{firstScoreChanged=value;try{store.setItem('score.analytics.firstScore.v1',value?'1':'0');}catch{}};
 return {
  track,
  setup(entry_point){if(setupStarted)return false;setupStarted=true;return track('setup_started',{entry_point});},
  playerAdded(entry_point,count){return track('player_added',{entry_point,player_count:playerCountBucket(count)});},
  gameStarted(mode,count){gameEnded=false;markFirstScore(false);return track('game_started',{mode,player_count:playerCountBucket(count)});},
  scoreChanged(direction,input_method){if(!firstScoreChanged){markFirstScore(true);track('first_score_changed',{direction,input_method});}return track('score_changed',{direction,input_method});},
  gameEndStarted(mode){return track('game_end_started',{mode});},
  gameEnded(mode,outcome){if(gameEnded)return false;gameEnded=true;return track('game_ended',{mode,outcome});},
  resetGame(){gameEnded=false;markFirstScore(false);}
 };
}
