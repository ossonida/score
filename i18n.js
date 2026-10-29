// 화면 언어: 설정에서 고른 언어(ko·en)가 없으면 한국 접속(시간대 Asia/Seoul 또는 지역 KR)은 한국어, 그 밖은 영어.
// 영어일 때만 사전(i18n-en.js)을 파싱 중에 불러와 첫 화면부터 번역한다.
(function(){
 var KEY='score-language',preference='auto';
 try{var saved=localStorage.getItem(KEY);if(saved==='ko'||saved==='en')preference=saved;}catch(error){}
 function detect(){
  try{if(Intl.DateTimeFormat().resolvedOptions().timeZone==='Asia/Seoul')return 'ko';}catch(error){}
  var langs=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];
  for(var i=0;i<langs.length;i++)if(/-KR$/i.test(langs[i]))return 'ko';
  return 'en';
 }
 var lang=preference==='auto'?detect():preference;
 document.documentElement.lang=lang;
 window.ScoreI18n={lang:lang,locale:lang==='ko'?'ko-KR':'en-US',preference:preference,t:function(text){return text;},
  setPreference:function(next){try{if(next==='ko'||next==='en')localStorage.setItem(KEY,next);else localStorage.removeItem(KEY);}catch(error){}location.reload();}};
 if(lang==='en')document.write('<script src="./i18n-en.js?v=1"><\/script>');
})();
