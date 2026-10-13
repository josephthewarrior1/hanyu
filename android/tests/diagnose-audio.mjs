import {_android} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5556');
if(!device)throw new Error('Owned emulator missing');
try{
 const page=await(await device.webView({pkg:'com.hanyuflow.android'})).page();
 const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scale:visualViewport.scale,nodes:[...document.querySelectorAll('.path-step')].slice(0,3).map(e=>({className:e.className,bounds:e.getBoundingClientRect().toJSON(),transform:getComputedStyle(e).transform,zoom:getComputedStyle(e).zoom,node:e.querySelector('.path-node').getBoundingClientRect().toJSON(),font:getComputedStyle(e.querySelector('strong')).fontSize}))}));
 const samples=await page.evaluate(async()=>{
  const clips=(await(await fetch('audio/manifest.json')).json()).clips;const result=[];
  for(const clip of clips.slice(0,10))result.push(await new Promise((resolve,reject)=>{
   const events=[],start=performance.now();const timer=setTimeout(()=>reject(new Error('Timeout')),8000);
   function listen(ev){if(ev.detail.type!=='audio'||ev.detail.data.text!==clip.text)return;events.push({...ev.detail.data,elapsedMs:Math.round(performance.now()-start)});if(['error','ended'].includes(ev.detail.data.status)){clearTimeout(timer);window.removeEventListener('hanyu-native',listen);resolve({id:clip.id,events});}}
   window.addEventListener('hanyu-native',listen);window.HanyuNative.request('speak',JSON.stringify({text:clip.text}));
  }));return result;
 });
 writeFileSync('docs/android-audio-diagnostic.json',JSON.stringify({layout,samples},null,2));console.log(JSON.stringify({layout,samples:samples.map(s=>({id:s.id,status:s.events.at(-1)?.status,duration:s.events.at(-1)?.durationMs,elapsed:s.events.at(-1)?.elapsedMs,positions:s.events.map(e=>e.positionMs)}))}));
 await page.screenshot({path:'screenshots/android-v2/roadmap-diagnostic.png',animations:'disabled'});
}finally{await device.close();}
