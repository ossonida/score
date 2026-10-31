import {build} from 'esbuild';
import {mkdir,rm,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
// Explicit allowlist keeps server code, credentials, tests and dependencies out of the APK.
// 웹앱이 실제로 쓰는 파일 목록(sw.js의 ASSETS, npm run sw:assets로 만든 것)을 그대로 쓴다. 손으로 적은 목록은 새 모듈·privacy.html이 빠지는 일이 있었다.
// 여전히 허용 목록이라 서버 코드·자격 증명·테스트·의존성은 APK에 들어가지 않는다.
const swSource=await readFile(resolve(root,'sw.js'),'utf8'),assetList=swSource.match(/const ASSETS=(\[[^\]]*\])/);
if(!assetList)throw Error('sw.js ASSETS 목록을 찾지 못했습니다. npm run sw:assets를 먼저 실행하세요.');
const files=[...new Set([...JSON.parse(assetList[1].replace(/'/g,'"')).map(item=>item.split('?')[0]).filter(Boolean),'THIRD_PARTY_NOTICES.txt'])];
for(const name of files){await mkdir(dirname(resolve(dist,name)),{recursive:true});await copyFile(resolve(root,name),resolve(dist,name));}
let html=await readFile(resolve(dist,'index.html'),'utf8');
html=html.replace("if('serviceWorker' in navigator&&", "if(false&&'serviceWorker' in navigator&&");
html=html.replace('<head>','<head>\n<style>main{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(28px,env(safe-area-inset-bottom))}#installApp{display:none!important}</style>');
await build({entryPoints:[resolve(root,'scripts/native-auth-entry.mjs')],outfile:resolve(dist,'native-auth.js'),bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,logLevel:'warning'});
html=html.replace('<script type="module" src="./records.js', '<script type="module" src="./native-auth.js"></script>\n<script type="module" src="./records.js');
await writeFile(resolve(dist,'index.html'),html);
console.log(`Bundled ${files.length} web files and native Google auth into dist.`);
