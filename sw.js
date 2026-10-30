'use strict';
const CACHE='score-counter-shell-v250-dialog-close-fix';
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
// 버전 경로가 고정인 Firebase SDK는 따로 보관해 오프라인·새로고침에서도 바로 쓴다.
const FIREBASE='https://www.gstatic.com/firebasejs/12.4.0/',FIREBASE_CACHE='score-counter-firebase-12.4.0';
// 현재 소스가 참조하는 경로만 미리 저장한다(옛 ?v= 사본은 업데이트마다 다시 받게 되어 제외).
const ASSETS=['','account-delete.js?v=6','analytics-events.js?v=117','analytics-policy.js?v=155','app-analytics.js?v=171','apple-touch-icon.png','assets/icon-search.svg','assets/score-games/badminton.webp','assets/score-games/baseball.webp','assets/score-games/billiards.webp','assets/score-games/bowling.webp','assets/score-games/football.webp','assets/score-games/holdem.webp','assets/score-games/table-tennis.webp','assets/score-games/tennis.webp','bgg-account.js?v=180','bgg-details-client.js?v=65','bgg-export.js?v=100','bgg-link-client.js?v=71','bgg-link.js?v=209','bgg-metadata.js?v=171','bgg-play-format.js?v=152','bgg-public-client.js?v=64','bgg-restore.js?v=1','bgg-validation.js?v=129','bgstats-link.js?v=5','cloud-records.js?v=174','collection-menu.js?v=2','data-transfer.js?v=69','day-share.js?v=12','expansion-picker.js?v=154','firebase-config.js?v=64','game-aliases.js?v=1','game-artwork.js?v=171','game-catalog.js?v=166','game-images.js?v=64','game-index.js?v=2','game-library.js?v=103','game-picker.js?v=64','game-types.js?v=64','games-screen.js?v=213','i18n-en.js?v=9','i18n.js?v=9','icon-192.png','icon-512.png','index.html','jquery-3.7.1.min.js','korean-game-names.js?v=167','manifest.webmanifest','mighty-stats.js?v=2','mission-names.js?v=5','modal-ui.css?v=66','native-auth-flow.js?v=64','overview-dashboard.js?v=191','period-dashboard.js?v=23','period-stats.js?v=5','personal-dashboard.js?v=166','personal-stats.js?v=117','places.js?v=8','player-memory.js?v=67','powered-by-bgg.png','privacy.html','recap-share.js?v=18','record-edit.js?v=153','record-view.js?v=136','records-core.js?v=155','records.css?v=187','records.js?v=234','score-games.js?v=167','select2-4.0.13.min.css','select2-4.0.13.min.js','settings.js?v=165','social-insights.js?v=119','stats-dashboard.js?v=101','stats-extras.js?v=4','stats-insights.js?v=67','stats-overview.js?v=166','stats-share.js?v=156','stored-json.js?v=171','ui-system.css?v=111'].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('score-counter-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
const request=event.request,url=new URL(request.url);
if(request.method==='GET'&&request.url.startsWith(FIREBASE)){event.respondWith((async()=>{const cache=await caches.open(FIREBASE_CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)event.waitUntil(cache.put(request,response.clone()));return response;})());return;}
if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
// 앱 화면(index)만 저장본으로 바로 연다. privacy.html 같은 다른 페이지는 브라우저 기본 요청에 맡긴다(앱 화면 저장본을 덮어쓰지 않게).
if(request.mode==='navigate'){
if(url.pathname!==BASE.pathname&&url.origin+url.pathname!==INDEX)return;
event.respondWith((async()=>{const network=fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(INDEX,copy)));}return response;}),saved=await caches.match(INDEX);if(saved){event.waitUntil(network.catch(()=>{}));return saved;}try{return await network;}catch{const cached=await caches.match(request);return cached||new Response('인터넷에 연결한 뒤 다시 열어주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}})());
}else if(ASSETS.includes(url.href)){
event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})());
}
});
