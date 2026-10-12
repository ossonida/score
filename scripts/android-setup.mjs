import {access,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function run(args){const result=spawnSync(process.execPath,[resolve(root,'node_modules/@capacitor/cli/bin/capacitor'),...args],{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
await import('./build-web.mjs');
try{await access(resolve(root,'android'));}catch{run(['add','android']);}
run(['sync','android']);
const path=resolve(root,'android/app/src/main/AndroidManifest.xml');
let manifest=await readFile(path,'utf8');manifest=manifest.replace('android:allowBackup="true"','android:allowBackup="false"').replace('<application','<application android:usesCleartextTraffic="false"');
manifest=manifest.replace(/(<application android:usesCleartextTraffic="false") android:usesCleartextTraffic="false"/g,'$1');
await writeFile(path,manifest);

const gradlePath=resolve(root,'android/app/build.gradle');
const gradle=await readFile(gradlePath,'utf8');
await writeFile(gradlePath,gradle.replaceAll("getDefaultProguardFile('proguard-android.txt')","getDefaultProguardFile('proguard-android-optimize.txt')"));
console.log('Android project ready. Run npm run android:open to open Android Studio.');
