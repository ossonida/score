import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const boot=fs.readFileSync(new URL('../i18n.js',import.meta.url),'utf8'),english=fs.readFileSync(new URL('../i18n-en.js',import.meta.url),'utf8');

function start({timeZone='Asia/Seoul',languages=['ko-KR'],saved=null}={}){
 const written=[],store=new Map(saved?[['score-language',saved]]:[]),reloads=[];
 const window={};
 const context={window,document:{documentElement:{lang:''},write:html=>written.push(html)},navigator:{languages,language:languages[0]},
  localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},
  location:{reload:()=>reloads.push(true)},Intl:{DateTimeFormat:()=>({resolvedOptions:()=>({timeZone})})}};
 vm.runInNewContext(boot,context);
 return {i18n:window.ScoreI18n,lang:context.document.documentElement.lang,written,store,reloads};
}

test('visitors in Korea get Korean and everyone else gets English unless a language is chosen',()=>{
 assert.equal(start().lang,'ko');
 assert.equal(start({timeZone:'America/New_York',languages:['ko-KR']}).lang,'ko');
 const abroad=start({timeZone:'America/New_York',languages:['en-US','ko']});
 assert.equal(abroad.lang,'en');assert.equal(abroad.i18n.locale,'en-US');assert.match(abroad.written[0],/i18n-en\.js\?v=\d+/);
 assert.equal(start().written.length,0);
 const chosen=start({saved:'en'});assert.equal(chosen.lang,'en');assert.equal(chosen.i18n.preference,'en');
 assert.equal(start({timeZone:'Europe/Paris',languages:['fr-FR'],saved:'ko'}).lang,'ko');
});

test('choosing a language stores it and reloads, and auto clears the choice',()=>{
 const run=start();run.i18n.setPreference('en');assert.equal(run.store.get('score-language'),'en');
 run.i18n.setPreference('auto');assert.equal(run.store.has('score-language'),false);assert.equal(run.reloads.length,2);
});

test('the English dictionary translates fixed, templated and joined messages but keeps names',()=>{
 const window={ScoreI18n:{lang:'ko'}};vm.runInNewContext(english,{window});
 const {createTranslator,dict}=window.ScoreI18n,t=createTranslator(dict);
 for(const [key,value] of Object.entries(dict))assert.doesNotMatch(value,/[가-힣]/,key);
 assert.equal(t('설정'),'Settings');assert.equal(t('  기록 저장 '),'  Save record ');
 assert.equal(t('철수와의 전적 보기'),'View head-to-head with 철수');
 assert.equal(t('영희을(를) 내 게임 목록에서 삭제할까요?'),'Remove 영희 from my games?');
 assert.equal(t('기록 12회 · 최근 2026-10-01'),'12 plays · Last 2026-10-01');
 assert.equal(t('내보낼 새 기록이나 수정된 기록이 없습니다. 변경 없음 3개 · Score 자체 게임 2개는 제외됩니다.'),'No new or edited records to export. 3 unchanged · 2 Score-only games are excluded.');
 assert.equal(t('2026년 10월'),'Oct 2026');assert.equal(t('3승 2패'),'3W 2L');
 assert.equal(t('하늘'),'하늘');assert.equal(t('Score Counter'),'Score Counter');
});
