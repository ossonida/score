// Startup/navigation performance budget in headless Chrome (phone-like: mobile UA, 4x CPU throttle).
// Seeds a remembered account with many records and a BGG cache, then fails if the main thread blocks too long.
// Usage: npm run perf  (CHROME=<path> to override the browser, RECORDS=<n> for the record count)
import http from 'node:http';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),N=Number(process.env.RECORDS||600);
const BUDGET={longTasks:3000,firstGames:1000,nav:500};
const chromePath=process.env.CHROME||['C:/Program Files/Google/Chrome/Application/chrome.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
if(!chromePath){console.error('Chrome을 찾지 못했습니다. CHROME 환경 변수로 경로를 지정하세요.');process.exit(2);}
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/score\/?/,'/');const f=path.join(ROOT,u==='/'?'index.html':u);fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(b);});});
await new Promise(r=>server.listen(0,r));const PORT=server.address().port;
const ids=[...fs.readFileSync(path.join(ROOT,'game-catalog.js'),'utf8').matchAll(/"id": "(\d+)",\s*"name": "([^"]+)"/g)].slice(0,150).map(m=>[m[2],m[1]]);
const names=['나','민수','지영','철수','영희','현우'],uid='perfUser';
const records=Array.from({length:N},(_,i)=>{const [name,bggId]=ids[(i*7)%ids.length],d=new Date(Date.UTC(2023,0,1)+i*86400000*1.2).toISOString().slice(0,10);return {id:'r'+i,date:d,createdAt:d+'T12:00:00.000Z',game:{name,bggId},rule:'highest',players:names.slice(0,3+i%3).map((n,j)=>({id:'p'+j,name:n,score:(i*7+j*13)%60,isSelf:false}))};});
const collection=ids.map(([name,id],i)=>({id,gameId:id,name,owned:i%2===0,wishlist:i%5===0,numPlays:i%9}));
const plays=Array.from({length:1000},(_,i)=>{const [name,id]=ids[i%ids.length];return {id:String(1000+i),gameId:id,name,date:new Date(Date.UTC(2022,0,1)+i*86400000).toISOString().slice(0,10),quantity:1,players:[{name:'나',username:'me',score:10,win:true},{name:'민수',username:'',score:8,win:false}]};});
// BGG 게임 정보 저장분(게임별 확장 목록 포함): 실제 계정처럼 크게 채운다.
const meta={};for(const [name,id] of [...ids,...Array.from({length:250},(_,i)=>['Game '+i,String(500000+i)])])meta[id]={v:4,domains:['Strategy Games'],cooperative:false,deduction:false,name,koName:'',subtype:'boardgame',expansions:Array.from({length:20},(_,j)=>({id:String(800000+Number(id)%5000*20+j),name:name+': Expansion '+j})),expands:[],checkedAt:Date.now()};
const put=(k,v)=>`localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(typeof v==='string'?v:JSON.stringify(v))});`;
const seed=`try{if(!localStorage.getItem('perf.seeded')){${put('score.lastUser.v1',uid)}${put(`score.plays.v1.user.${uid}`,{records,pending:[]})}${put(`score.identity.v1.score.plays.v1.user.${uid}`,{primary:'나',aliases:[]})}${put(`score.bgg.${uid}.collection`,collection)}${put(`score.bgg.${uid}.plays`,plays)}${put('score.bgg.metadata.v1',meta)}${put('score.bgg.covers.v1',Object.fromEntries(Object.keys(meta).slice(0,1000).map(id=>[id,`https://cf.geekdo-images.com/perf/${id}.jpg`])))}localStorage.setItem('perf.seeded','1');}}catch(e){}
window.__lt=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(Math.round(e.duration));}).observe({type:'longtask',buffered:true});}catch{}`;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'score-perf-'));
const chrome=spawn(chromePath,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=412,915','--no-first-run','about:blank'],{stdio:['ignore','ignore','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wsUrl=await new Promise((resolve,reject)=>{let buf='';chrome.stderr.on('data',d=>{buf+=d;const m=buf.match(/DevTools listening on (ws:\/\/\S+)/);if(m)resolve(m[1]);});setTimeout(()=>reject(Error('Chrome DevTools 연결 시간 초과')),15000);});
const port=new URL(wsUrl).port;let target;for(let i=0;i<50&&!target;i++){try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{}if(!target)await sleep(200);}
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const wait=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&wait.has(m.id)){wait.get(m.id)(m);wait.delete(m.id);}};
const send=(method,params={})=>new Promise(r=>{const i=++id;wait.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async expr=>{for(let i=0;i<5;i++){const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});if(!r.result?.exceptionDetails)return r.result?.result?.value;await sleep(300);}throw Error('evaluate failed: '+expr.slice(0,60));};
let failed=false;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*cf.geekdo-images.com*']});await send('Page.addScriptToEvaluateOnNewDocument',{source:seed});
 await send('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'});
 await send('Emulation.setCPUThrottlingRate',{rate:4});
 const url=`http://localhost:${PORT}/score/index.html`;
 await send('Page.navigate',{url});await sleep(6000);
 await send('Page.navigate',{url});await sleep(300);
 const boot=await ev(`new Promise(r=>{const t=()=>document.documentElement.dataset.bootPending?setTimeout(t,10):r(Math.round(performance.now()));t();})`);
 const nav=target=>ev(`new Promise(r=>{const t0=performance.now();window.addEventListener('hashchange',()=>requestAnimationFrame(()=>setTimeout(()=>r(Math.round(performance.now()-t0)),0)),{once:true});document.getElementById('${target}').click();})`);
 const times={};for(const n of ['navStats','navGames','navSettings','navHome','navStats','navGames','navHome']){const ms=await nav(n);(times[n]??=[]).push(ms);await sleep(400);}
 await sleep(3000);const longTasks=(await ev('window.__lt')).reduce((a,b)=>a+b,0);
 const checks=[['long tasks total',longTasks,BUDGET.longTasks],['first games tab',times.navGames[0],BUDGET.firstGames],...['navStats','navSettings','navHome'].map(n=>[n,Math.max(...times[n]),BUDGET.nav]),['games tab revisit',times.navGames[1],BUDGET.nav]];
 console.log(`records ${N}, boot ${boot}ms (4x CPU)`);
 for(const [label,value,limit] of checks){const ok=value<=limit;if(!ok)failed=true;console.log(`${ok?'ok  ':'FAIL'} ${label}: ${value}ms (budget ${limit}ms)`);}
}finally{ws.close();chrome.kill();server.close();try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
process.exit(failed?1:0);
