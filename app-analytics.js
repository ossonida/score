import {cloudConfigured,connectCloud} from './cloud-records.js?v=59';
import {createAnalyticsGate} from './analytics-policy.js?v=59';
// Keep the site's existing GA property; never pass email, email hashes or Firebase UID to GA.
const measurementId='G-NFEYJ27K5H',disableKey='ga-disable-'+measurementId;
window[disableKey]=true;
const gate=createAnalyticsGate({
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},search:location.search,
 stop:()=>{window[disableKey]=true;},
 start:()=>{
  window[disableKey]=false;window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());window.gtag('config',measurementId);
  const script=document.createElement('script');script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;document.head.append(script);
 }
});
// Wait for restored Firebase auth before loading GA. Auth errors leave collection disabled.
if(cloudConfigured())connectCloud(user=>gate.onAuthState(user)).catch(()=>{window[disableKey]=true;});
else void gate.onAuthState(null);
