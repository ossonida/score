import sharp from 'sharp';
import {mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),res=resolve(root,'android/app/src/main/res'),source=resolve(root,'icon-512.png');
const bg={r:8,g:10,b:16,alpha:1};
for(const [density,scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]){
 const dir=resolve(res,'mipmap-'+density);await mkdir(dir,{recursive:true});const size=Math.round(48*scale),canvas=Math.round(108*scale),logo=Math.round(64*scale);
 await sharp(source).resize(size,size).png().toFile(resolve(dir,'ic_launcher.png'));
 const round=await sharp(source).resize(Math.round(size*.84)).png().toBuffer();
 const mask=Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
 await sharp({create:{width:size,height:size,channels:4,background:bg}}).composite([{input:round,gravity:'centre'},{input:mask,blend:'dest-in'}]).png().toFile(resolve(dir,'ic_launcher_round.png'));
 const image=await sharp(source).resize(logo,logo).png().toBuffer();
 await sharp({create:{width:canvas,height:canvas,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:image,gravity:'centre'}]).png().toFile(resolve(dir,'ic_launcher_foreground.png'));
}
const adaptive='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n';
await mkdir(resolve(res,'mipmap-anydpi-v26'),{recursive:true});for(const name of ['ic_launcher.xml','ic_launcher_round.xml'])await writeFile(resolve(res,'mipmap-anydpi-v26',name),adaptive);
await writeFile(resolve(res,'values/ic_launcher_background.xml'),'<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#080a10</color></resources>\n');
for(const dir of await readdir(res,{withFileTypes:true}))if(dir.isDirectory()&&dir.name.startsWith('drawable'))await rm(resolve(res,dir.name,'splash.png'),{force:true});
await writeFile(resolve(res,'drawable/splash.xml'),'<?xml version="1.0" encoding="utf-8"?><layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/ic_launcher_background"/><item android:gravity="center"><bitmap android:src="@mipmap/ic_launcher_foreground" android:gravity="center"/></item></layer-list>\n');
const path=resolve(res,'values/styles.xml');let styles=await readFile(path,'utf8');styles=styles.replace(/<style name="AppTheme.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/,`<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`);await writeFile(path,styles);
console.log('Score 2:0 launcher icons and splash screen applied.');
