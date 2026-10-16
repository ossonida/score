'use strict';
const CACHE='score-counter-shell-v66-bgg-settings-actions';
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
const ASSETS=[...new Set(['bgg-link.js','bgg-link.js?v=66','bgg-link-client.js','bgg-public-client.js','games-screen.js','game-library.js','korean-game-names.js','powered-by-bgg.png','ui-system.css','ui-system.css?v=64','ui-system.css?v=65','ui-system.css?v=66','game-picker.js','jquery-3.7.1.min.js','select2-4.0.13.min.js','select2-4.0.13.min.css','./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','bgg-account.js?v=64','bgg-account.js?v=65','bgg-account.js','native-auth-flow.js','app-analytics.js?v=64','app-analytics.js','analytics-policy.js','settings.js?v=64','personal-dashboard.js?v=64','settings.js','data-transfer.js','social-insights.js','bgg-metadata.js','bgg-details-client.js','record-edit.js','stats-overview.js','overview-dashboard.js','game-types.js','game-artwork.js','game-images.js','player-memory.js','personal-stats.js','personal-dashboard.js','stats-insights.js','stats-dashboard.js','records.js','records.js?v=64','records-core.js','records-core.js?v=64','bgg-validation.js','cloud-records.js','cloud-records.js?v=64','firebase-config.js','modal-ui.css?v=64','modal-ui.css?v=65','modal-ui.css','records.css','records.css?v=64','records.css?v=65','records.css?v=66','game-catalog.js'].flatMap(path=>path.endsWith('.js')?[path,path+'?v=64']:[path]).map(path=>new URL(path,BASE).href))];
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
