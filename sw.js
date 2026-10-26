'use strict';
const CACHE='score-counter-shell-v166-fast-account';
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
// 버전 경로가 고정인 Firebase SDK는 따로 보관해 오프라인·새로고침에서도 바로 쓴다.
const FIREBASE='https://www.gstatic.com/firebasejs/12.4.0/',FIREBASE_CACHE='score-counter-firebase-12.4.0';
// 현재 소스가 참조하는 경로만 미리 저장한다(옛 ?v= 사본은 업데이트마다 다시 받게 되어 제외).
const ASSETS=['bgg-public-client.js?v=64','powered-by-bgg.png','game-picker.js?v=64','jquery-3.7.1.min.js','select2-4.0.13.min.js','select2-4.0.13.min.css','','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','native-auth-flow.js?v=64','game-types.js?v=64','game-images.js?v=64','firebase-config.js?v=64','modal-ui.css?v=65','game-artwork.js?v=95','assets/score-games/holdem.webp','assets/score-games/tennis.webp','assets/score-games/bowling.webp','assets/score-games/billiards.webp','assets/score-games/football.webp','assets/score-games/baseball.webp','assets/score-games/badminton.webp','assets/score-games/table-tennis.webp','personal-dashboard.js?v=157','cloud-records.js?v=166','bgg-account.js?v=159','bgg-metadata.js?v=162','score-games.js?v=163','korean-game-names.js?v=164','game-catalog.js?v=164','stats-overview.js?v=164','overview-dashboard.js?v=164','records.css?v=161','records.js?v=166','analytics-policy.js?v=154','expansion-picker.js?v=153','records-core.js?v=152','record-edit.js?v=152','bgg-play-format.js?v=152','bgg-details-client.js?v=65','stats-share.js?v=141','games-screen.js?v=125','bgg-link.js?v=127','settings.js?v=125','stats-dashboard.js?v=98','ui-system.css?v=104','bgg-export.js?v=97','game-library.js?v=99','bgg-validation.js?v=128','app-analytics.js?v=119','bgg-link-client.js?v=66','data-transfer.js?v=66','period-stats.js?v=4','personal-stats.js?v=115','record-view.js?v=133','social-insights.js?v=115','stats-insights.js?v=66','period-dashboard.js?v=4','player-memory.js?v=66','assets/icon-search.svg','mission-names.js?v=3','analytics-events.js?v=117'].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('score-counter-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
const request=event.request,url=new URL(request.url);
if(request.method==='GET'&&request.url.startsWith(FIREBASE)){event.respondWith((async()=>{const cache=await caches.open(FIREBASE_CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)event.waitUntil(cache.put(request,response.clone()));return response;})());return;}
if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
if(request.mode==='navigate'){
event.respondWith((async()=>{const network=fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(INDEX,copy)));}return response;}),saved=await caches.match(INDEX);if(saved){event.waitUntil(network.catch(()=>{}));return saved;}try{return await network;}catch{const cached=await caches.match(request);return cached||new Response('인터넷에 연결한 뒤 다시 열어주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}})());
}else if(ASSETS.includes(url.href)){
event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})());
}
});
