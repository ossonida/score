'use strict';
const CACHE='score-counter-shell-v107-result-roster-sync';
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
const ASSETS=[...new Set(['bgg-link.js','bgg-link.js?v=66','bgg-link.js?v=68','bgg-link.js?v=69','bgg-link.js?v=70','bgg-link.js?v=72','bgg-link-client.js','bgg-export.js','bgg-export.js?v=70','bgg-export.js?v=72','bgg-play-format.js','bgg-play-format.js?v=72','bgg-public-client.js','games-screen.js','game-library.js','korean-game-names.js','powered-by-bgg.png','ui-system.css','ui-system.css?v=64','ui-system.css?v=65','ui-system.css?v=66','ui-system.css?v=67','ui-system.css?v=68','ui-system.css?v=69','ui-system.css?v=70','game-picker.js','jquery-3.7.1.min.js','select2-4.0.13.min.js','select2-4.0.13.min.css','./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','bgg-account.js?v=64','bgg-account.js?v=65','bgg-account.js?v=68','bgg-account.js?v=69','bgg-account.js','native-auth-flow.js','app-analytics.js?v=64','app-analytics.js','analytics-policy.js','settings.js?v=64','settings.js?v=71','personal-dashboard.js?v=64','personal-dashboard.js?v=71','settings.js','data-transfer.js','social-insights.js','bgg-metadata.js','bgg-details-client.js','record-edit.js','record-edit.js?v=75','stats-overview.js','overview-dashboard.js','overview-dashboard.js?v=73','overview-dashboard.js?v=74','stats-share.js','stats-share.js?v=73','stats-share.js?v=74','game-types.js','game-artwork.js','game-images.js','player-memory.js','personal-stats.js','personal-dashboard.js','stats-insights.js','stats-dashboard.js','records.js','records.js?v=64','records.js?v=73','records.js?v=74','records.js?v=75','records-core.js','records-core.js?v=64','bgg-validation.js','cloud-records.js','cloud-records.js?v=64','firebase-config.js','modal-ui.css?v=64','modal-ui.css?v=65','modal-ui.css','records.css','records.css?v=64','records.css?v=65','records.css?v=66','records.css?v=73','records.css?v=75','game-catalog.js'].flatMap(path=>path.endsWith('.js')?[path,path+'?v=64']:[path]).map(path=>new URL(path,BASE).href))];
for(const path of ['score-games.js','score-games.js?v=76','game-catalog.js?v=76','records-core.js?v=76','stats-overview.js?v=76','overview-dashboard.js?v=76','bgg-export.js?v=76','bgg-link.js?v=76','records.js?v=76','games-screen.js?v=76','records.css?v=76'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['record-edit.js?v=77','bgg-link.js?v=77','records.js?v=77','games-screen.js?v=77','records.css?v=77'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['ui-system.css?v=71','bgg-link.js?v=78','records.js?v=78','games-screen.js?v=78','records.css?v=78'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['bgg-link.js?v=86','records.js?v=86','games-screen.js?v=86','records.css?v=86'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=87','records.css?v=87'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['ui-system.css?v=87'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=88','records.css?v=88','records-core.js?v=88','bgg-metadata.js?v=88'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=89','ui-system.css?v=89'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=90','ui-system.css?v=90'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['ui-system.css?v=91'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=92'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['settings.js?v=94'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.css?v=97','ui-system.css?v=95','records.js?v=95','settings.js?v=95','games-screen.js?v=95','bgg-link.js?v=95','game-artwork.js?v=95','game-catalog.js?v=95','game-library.js?v=95','score-games.js?v=95','overview-dashboard.js?v=95','stats-dashboard.js?v=95','personal-dashboard.js?v=95','stats-share.js?v=95','stats-overview.js?v=95','bgg-export.js?v=95','assets/score-games/holdem.webp','assets/score-games/tennis.webp','assets/score-games/bowling.webp','assets/score-games/billiards.webp','assets/score-games/football.webp','assets/score-games/baseball.webp','assets/score-games/badminton.webp'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=98'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=99','records.css?v=99'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=100','records.css?v=100'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=101','records.css?v=101','ui-system.css?v=101'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=102','records.css?v=102'])ASSETS.push(new URL(path,BASE).href);
for(const path of ['records.js?v=105','records-core.js?v=105'])ASSETS.push(new URL(path,BASE).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('score-counter-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
const request=event.request,url=new URL(request.url);
if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
if(request.mode==='navigate'){
event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(INDEX,copy)));}return response;}catch{const cached=await caches.match(INDEX)||await caches.match(request);return cached||new Response('인터넷에 연결한 뒤 다시 열어주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}})());
}else if(ASSETS.includes(url.href)){
event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}catch{const cached=await caches.match(request);return cached||Response.error();}})());
}
});
