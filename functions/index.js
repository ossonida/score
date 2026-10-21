import {gameDetails} from './game-details.js';
import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {bearerToken,boundedXml,rateWindow} from './request-security.js';
import {getAuth} from 'firebase-admin/auth';
import {XMLParser} from 'fast-xml-parser';
import {collectionData,playsData} from './bgg-data.js';
initializeApp();
const token=defineSecret('BGG_API_TOKEN');
export const bggSearch=onRequest({region:'asia-northeast3',cors:['https://ossonida.github.io'],secrets:[token],maxInstances:2,timeoutSeconds:20},async(req,res)=>{
  res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');
  const origin=req.get('Origin');if(origin&&origin!=='https://ossonida.github.io'){res.status(403).json({error:'Origin not allowed'});return;}
  if(req.method!=='GET'){res.status(405).json({error:'GET only'});return;}
  const authorization=bearerToken(req.get('Authorization'));let session;
  try{if(!authorization)throw Error('Missing token');session=await getAuth().verifyIdToken(authorization,true);}catch{res.status(401).json({error:'Sign in required'});return;}
  try{const db=getFirestore(),ref=db.collection('_bggLimits').doc(session.uid);const allowed=await db.runTransaction(async tx=>{const snap=await tx.get(ref),next=rateWindow(snap.exists?snap.data():null,Date.now());if(!next)return false;tx.set(ref,next);return true;});if(!allowed){res.set('Retry-After','60');res.status(429).json({error:'Too many requests'});return;}}catch{res.status(503).json({error:'Request limit service unavailable'});return;}

  const action=typeof req.query.action==='string'?req.query.action:'search';
  if(!['search','collection','plays','details'].includes(action)){res.status(400).json({error:'Invalid action'});return;}
  if(action==='details'){
    const ids=typeof req.query.ids==='string'?req.query.ids.split(','):[];
    if(!ids.length||ids.length>20||ids.some(id=>!/^[1-9][0-9]{0,9}$/.test(id))){res.status(400).json({error:'Invalid game IDs'});return;}
    try{
      const url=new URL('https://boardgamegeek.com/xmlapi2/thing');url.searchParams.set('id',[...new Set(ids)].join(','));url.searchParams.set('stats','1');
      const response=await fetch(url,{redirect:'error',headers:{Authorization:`Bearer ${token.value()}`},signal:AbortSignal.timeout(12000)});
      if(response.status===202||response.status===429){res.status(response.status).json({error:'BGG temporarily busy'});return;}
      if(!response.ok)throw Error('BGG request failed');
      const parsed=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>['item','name','link','rank'].includes(name)}).parse(await boundedXml(response));
      res.json({games:gameDetails(parsed)});
    }catch{res.status(502).json({error:'BGG game details unavailable'});}return;
  }
  if(action!=='search'){
    const username=typeof req.query.username==='string'?req.query.username.trim():'';
    const page=Number(req.query.page||1);
    if(!username||username.length>64||/[\u0000-\u001f\u007f]/.test(username)||!Number.isInteger(page)||page<1||page>10){res.status(400).json({error:'Invalid username or page'});return;}
    try{
      const url=new URL('https://boardgamegeek.com/xmlapi2/'+action);url.searchParams.set('username',username);
      if(action==='collection'){url.searchParams.set('subtype','boardgame');url.searchParams.set('brief','1');}else url.searchParams.set('page',String(page));
      const response=await fetch(url,{redirect:'error',headers:{Authorization:`Bearer ${token.value()}`},signal:AbortSignal.timeout(12000)});
      if(response.status===202||response.status===429){res.status(response.status).json({error:'BGG temporarily busy'});return;}
      if(!response.ok){res.status(502).json({error:'BGG request failed'});return;}
      const xml=await boundedXml(response);
      const parsed=new XMLParser({ignoreAttributes:false,processEntities:false,parseAttributeValue:false,isArray:name=>['item','play','player'].includes(name)}).parse(xml);
      if(parsed.errors||parsed.error||(action==='collection'?!parsed.items:!parsed.plays))throw Error('BGG user unavailable');
      // Item nodes must be scalar within each play, but arrays in collections.
      if(action==='plays')for(const play of parsed.plays?.play||[])if(Array.isArray(play.item))play.item=play.item[0];
      res.json(action==='collection'?collectionData(parsed):playsData(parsed));
    }catch{res.status(502).json({error:'BGG public data unavailable'});}return;
  }
  const query=typeof req.query.query==='string'?req.query.query.trim():'';
  if(query.length<2||query.length>120){res.status(400).json({error:'Query must be 2–120 characters'});return;}
  try{
    const url=new URL('https://boardgamegeek.com/xmlapi2/search');url.searchParams.set('query',query);url.searchParams.set('type','boardgame');
    const response=await fetch(url,{redirect:'error',headers:{Authorization:`Bearer ${token.value()}`},signal:AbortSignal.timeout(12000)});
    if(response.status===202||response.status===429){res.status(response.status).json({error:'BGG temporarily busy'});return;}
    if(!response.ok){res.status(502).json({error:'BGG request failed'});return;}
    const xml=await boundedXml(response);
    const parsed=new XMLParser({ignoreAttributes:false,processEntities:false,isArray:name=>name==='item'}).parse(xml);
    const games=(parsed.items?.item||[]).slice(0,40).map(item=>{const names=Array.isArray(item.name)?item.name:[item.name];const name=names.find(n=>n?.['@_type']==='primary')||names[0];return {id:String(item['@_id']),name:String(name?.['@_value']||''),year:String(item.yearpublished?.['@_value']||'')};}).filter(game=>/^[1-9][0-9]{0,9}$/.test(game.id)&&game.name);
    res.json({games});
  }catch{res.status(502).json({error:'BGG search unavailable'});}
});
