import {build} from 'esbuild';
import {mkdir,rm,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
// Explicit allowlist keeps server code, credentials, tests and dependencies out of the APK.
const files=['bgg-link.js','bgg-link-client.js','bgg-export.js','bgg-public-client.js','games-screen.js','game-library.js','korean-game-names.js','powered-by-bgg.png','ui-system.css','THIRD_PARTY_NOTICES.txt','game-picker.js','jquery-3.7.1.min.js','select2-4.0.13.min.js','select2-4.0.13.min.css','social-insights.js','bgg-metadata.js','bgg-details-client.js','record-edit.js','stats-overview.js','overview-dashboard.js','game-types.js','game-artwork.js','game-images.js','player-memory.js','personal-stats.js','personal-dashboard.js','stats-insights.js','stats-dashboard.js','settings.js','data-transfer.js','app-analytics.js','analytics-policy.js','native-auth-flow.js','index.html','records.js','records-core.js','records.css','modal-ui.css','cloud-records.js','firebase-config.js','bgg-account.js','bgg-validation.js','game-catalog.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
for(const name of files)await copyFile(resolve(root,name),resolve(dist,name));
let html=await readFile(resolve(dist,'index.html'),'utf8');
html=html.replace("if('serviceWorker' in navigator&&", "if(false&&'serviceWorker' in navigator&&");
html=html.replace('<head>','<head>\n<style>main{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(28px,env(safe-area-inset-bottom))}#installApp{display:none!important}</style>');
await build({entryPoints:[resolve(root,'scripts/native-auth-entry.mjs')],outfile:resolve(dist,'native-auth.js'),bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,logLevel:'warning'});
html=html.replace('<script type="module" src="./records.js', '<script type="module" src="./native-auth.js"></script>\n<script type="module" src="./records.js');
await writeFile(resolve(dist,'index.html'),html);
console.log(`Bundled ${files.length} web files and native Google auth into dist.`);
