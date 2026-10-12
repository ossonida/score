import {mkdir,rm,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
// Explicit allowlist keeps server code, credentials, tests and dependencies out of the APK.
const files=['index.html','records.js','records-core.js','records.css','modal-ui.css','cloud-records.js','firebase-config.js','bgg-account.js','bgg-validation.js','game-catalog.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.svg'];
for(const name of files)await copyFile(resolve(root,name),resolve(dist,name));
let html=await readFile(resolve(dist,'index.html'),'utf8');
html=html.replace("if('serviceWorker' in navigator&&", "if(false&&'serviceWorker' in navigator&&");
html=html.replace('<head>','<head>\n<style>main{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(28px,env(safe-area-inset-bottom))}#installApp{display:none!important}</style>');
// Browser popup OAuth must be replaced by native Google authentication before release.
let auth=await readFile(resolve(dist,'cloud-records.js'),'utf8');
auth=auth.replace('export async function login(){','export async function login(){throw Error("Android Google 로그인은 다음 단계에서 연결합니다. 지금은 점수 계산 기능을 테스트해주세요.");');
await writeFile(resolve(dist,'cloud-records.js'),auth);await writeFile(resolve(dist,'index.html'),html);
console.log(`Bundled ${files.length} web files into dist. Native Google login is pending.`);
