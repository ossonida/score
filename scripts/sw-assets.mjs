// Service worker precache list: only the paths the current sources load.
// `node scripts/sw-assets.mjs` rewrites the ASSETS line in sw.js; tests import computeAssets() to catch drift.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const local=ref=>ref.replace(/^\.\//,'');
const exists=ref=>fs.existsSync(path.join(root,ref.split('?')[0]));

export function computeAssets(){
 const html=read('index.html'),assets=new Set(['','index.html']);
 for(const m of html.matchAll(/(?:href|src)="(?!https?:|data:|mailto:|#)([^"#]+)"/g))if(exists(local(m[1])))assets.add(local(m[1]));
 // Files the stylesheets load with url().
 for(const ref of [...assets].filter(ref=>/\.css(\?|$)/.test(ref)))for(const m of read(ref.split('?')[0]).matchAll(/url\(['"]?(?!data:|https?:|#)([^'")]+)['"]?\)/g))if(exists(local(m[1])))assets.add(local(m[1]));
 // Static and dynamic imports of local modules, followed through the whole graph.
 const queue=[...assets].filter(ref=>/\.js(\?|$)/.test(ref));
 while(queue.length){
  const ref=queue.shift(),src=read(ref.split('?')[0]);
  for(const m of src.matchAll(/(?:import|export)\s*(?:[^'"();]*?from\s*)?\(?\s*['"](\.\/[^'"]+\.js(?:\?v=\d+)?)['"]/g)){const next=local(m[1]);if(!assets.has(next)){assets.add(next);queue.push(next);}}
  // Images and other files a module references by literal path.
  for(const m of src.matchAll(/['"](\.\/(?:assets\/)?[\w./-]+\.(?:webp|png|svg|jpg|jpeg|json))['"]/g))if(exists(local(m[1])))assets.add(local(m[1]));
 }
 const manifest=JSON.parse(read('manifest.webmanifest'));
 for(const icon of manifest.icons||[])if(exists(icon.src))assets.add(local(icon.src));
 return [...assets].filter(ref=>ref===''||exists(ref)).sort();
}

export function assetBytes(list){return list.reduce((sum,ref)=>sum+fs.statSync(path.join(root,(ref||'index.html').split('?')[0])).size,0);}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const list=computeAssets(),sw=read('sw.js');
 const line=`const ASSETS=${JSON.stringify(list).replaceAll('"',"'")}.map(path=>new URL(path,BASE).href);`;
 const next=sw.replace(/^const ASSETS=.*$/m,()=>line);
 if(next===sw&&!sw.includes(line))throw Error('sw.js에서 ASSETS 줄을 찾지 못했습니다.');
 fs.writeFileSync(path.join(root,'sw.js'),next);
 console.log(`sw.js ASSETS ${list.length}개, ${Math.round(assetBytes(list)/1024)}KB`);
}
