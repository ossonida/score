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
const varsPath=resolve(root,'android/variables.gradle');let vars=await readFile(varsPath,'utf8');
if(!/rgcfaIncludeGoogle\s*=/.test(vars))vars+='\next { rgcfaIncludeGoogle = true }\n';
else vars=vars.replace(/rgcfaIncludeGoogle\s*=\s*false/g,'rgcfaIncludeGoogle = true');
await writeFile(varsPath,vars);
try{
 const services=JSON.parse(await readFile(resolve(root,'android/app/google-services.json'),'utf8'));
 if(services.project_info?.project_id!=='score-1948e')throw Error('google-services.json의 Firebase 프로젝트가 score-1948e가 아닙니다.');
 const client=services.client?.find(c=>c.client_info?.android_client_info?.package_name==='io.github.ossonida.score');
 if(!client)throw Error('google-services.json 패키지 이름이 io.github.ossonida.score와 다릅니다.');
 if(!client.oauth_client?.some(c=>c.client_type===3))throw Error('google-services.json에 웹 OAuth 클라이언트가 없습니다. Firebase Google 로그인을 사용 설정한 후 다시 다운로드해주세요.');
 console.log('Firebase Android package and Google OAuth configuration verified.');
}catch(error){if(error.code==='ENOENT')console.warn('Google login requires android/app/google-services.json before APK build.');else throw error;}
await import('./android-icons.mjs');
console.log('Android project ready. Run npm run android:open to open Android Studio.');
