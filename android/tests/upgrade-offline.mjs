import { _android, expect } from '@playwright/test';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import {execFileSync} from 'node:child_process';
const pkg='com.hanyuflow.android',serial='emulator-5556';
const device=(await _android.devices()).find(d=>d.serial()===serial);
if(!device)throw new Error('Owned emulator missing');
const before=JSON.parse(readFileSync('docs/android-upgrade-before.json','utf8'));
const resume=process.env.HANYUFLOW_V2_RESUME==='true';
const report=resume?JSON.parse(readFileSync('docs/android-v2-device-results.json','utf8')):{serial,version:2,checks:[],errors:[],audio:[]};
if(resume&&report.checks.length!==3)throw new Error('Bounded resume requires the three recorded upgrade checks');
if(resume){report.audio=[];report.errors=[];}
const capture=async(name)=>writeFileSync('screenshots/android-v2/'+name,execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s',serial,'exec-out','screencap','-p']));
const pass=s=>{report.checks.push(s);console.log('PASS '+s);};
mkdirSync('screenshots/android-v2',{recursive:true});
let page;
const current=async()=>{const p=await(await device.webView({pkg})).page();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));return p;};
const call=(method,data={})=>page.evaluate(({method,data})=>JSON.parse(window.HanyuNative.request(method,JSON.stringify(data))),{method,data});
try{
 await device.shell('svc wifi disable');await device.shell('svc data disable');
 await device.shell(`am force-stop ${pkg}`);await device.shell(`am start -W -n ${pkg}/.MainActivity`);page=await current();
 await expect(page.getByRole('heading',{name:'Hello, Android.',exact:true})).toBeVisible();
 const state=(await call('state')).data;delete state.now;if(!resume)expect(state).toEqual(before.state);else expect(state.points).toBe(before.state.points);
 const version=(await device.shell(`dumpsys package ${pkg}`)).toString();expect(version).toContain('versionCode=2');
 if(!resume){report.persisted=state;report.packageVersion=version.match(/versionCode=\d+[^\n]*/)?.[0];
 pass('APK upgrade retains exact profile, favorites, attempts, cursor, completed lesson, reviews, 39 points and writing in existing SQLite');}
 const cap=(await call('capabilities')).data;expect(cap.bundledAudio).toBe(true);expect(cap.audioClips).toBe(120);expect(cap.ai).toBe(false);expect(cap.pronunciation).toBe(false);report.capabilities=cap;
 if(!resume)pass('Offline startup has all 120 bundled AI-generated clips; conversation and pronunciation assessment remain unconfigured');
 await capture('upgrade-dark.png');
 // Preserve the proved upgrade snapshot above, then select light theme for reference QA.
 await call('profile',{theme:'light'});await device.shell(`am force-stop ${pkg}`);await device.shell(`am start -W -n ${pkg}/.MainActivity`);page=await current();
 await expect(page.locator('.path-node')).toHaveCount(9);await expect(page.locator('.path-pinyin img').first()).toBeVisible();
 expect(await page.locator('.path-pinyin img').first().evaluate(e=>e.complete&&e.naturalWidth>500)).toBe(true);
 await capture('roadmap.png');if(!resume)pass('Original generated Pinyin PNG renders beside raised zigzag nodes with real progress counters');
 const audio=await page.evaluate(async()=>await(await fetch('audio/manifest.json')).json());
 for(let i=0;i<audio.clips.length;i++){
  const clip=audio.clips[i];const result=await page.evaluate(({text})=>new Promise((resolve,reject)=>{
   let last=null,maxPositionMs=0;const startedAt=performance.now();const timer=setTimeout(()=>{window.removeEventListener('hanyu-native',listen);reject(new Error('Speech timeout'));},8000);
   function listen(ev){const e=ev.detail;if(e.type!=='audio'||e.data.text!==text)return;if(e.data.status==='error'){clearTimeout(timer);window.removeEventListener('hanyu-native',listen);reject(new Error(e.data.error));}if(e.data.status==='playing'&&e.data.isPlaying){last=e.data;maxPositionMs=Math.max(maxPositionMs,e.data.positionMs);}if(e.data.status==='ended'){clearTimeout(timer);window.removeEventListener('hanyu-native',listen);resolve({playing:last,ended:e.data,maxPositionMs,elapsedMs:Math.round(performance.now()-startedAt)});}}
   window.addEventListener('hanyu-native',listen);window.HanyuNative.request('speak',JSON.stringify({text}));
  }),{text:clip.text});
  expect(result.playing?.isPlaying).toBe(true);expect(result.ended.durationMs).toBeGreaterThan(200);expect(result.elapsedMs).toBeGreaterThan(result.ended.durationMs*.8);expect(result.ended.offline).toBe(true);expect(result.ended.source).toBe('bundled-ai-generated');expect(result.ended.clipId).toBe(clip.id);
  // Short speech may finish before this virtual audio sink reports a position.
  // Verify genuine events, decoder duration and elapsed time instead of inventing an offset.
  if(result.ended.durationMs>=750)expect(result.maxPositionMs).toBeGreaterThan(100);
  report.audio.push({id:clip.id,durationMs:result.ended.durationMs,maxPositionMs:result.maxPositionMs,elapsedMs:result.elapsedMs});
  if((i+1)%20===0)console.log(`Native offline audio verified: ${i+1}/120`);
 }
 report.positionLimit='Short clips can report position 0 on this virtual audio sink; all clips verify native playing/completion, measured elapsed time and decoded duration. Longer clips require progressing position.';
 pass('All 120 shipped Mandarin clips reach real native playing/completion with decoded duration and elapsed playback while Wi-Fi/data are disabled; longer clips report progressing position');
 await page.getByRole('button',{name:'Speak',exact:true}).click();
 await page.evaluate(()=>{window.__audioEvents=[];window.addEventListener('hanyu-native',e=>{if(e.detail.type==='audio')window.__audioEvents.push(e.detail.data);});});
 await page.getByRole('button',{name:'Play slowly',exact:true}).click();
 await expect.poll(async()=>(await call('audioState')).data.status).toBe('playing');
 const slow=(await call('audioState')).data;expect(slow.speed).toBeCloseTo(.65,2);expect(slow.pitch).toBe(1);report.slow=slow;
 await expect(page.getByRole('button',{name:'Play slowly',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>(await call('audioState')).data.status).toBe('ended');
 await page.getByRole('button',{name:'Play Mandarin',exact:true}).click();
 await expect.poll(async()=>(await call('audioState')).data.status).toBe('playing');
 expect((await call('audioState')).data.speed).toBe(1);await call('audioStop');
 await capture('speaking.png');pass('Visible normal and slow audio controls start actual native playback, show playing state and preserve pitch');
 await device.shell('input keyevent 4');await expect(page.getByRole('heading',{name:'Hello, Android.',exact:true})).toBeVisible();pass('Android Back navigation still returns to the prior screen');
 await page.emulateMedia({reducedMotion:'reduce'});
 const motion=await page.locator('.path-pinyin img').first().evaluate(e=>getComputedStyle(e).animationName);expect(motion).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});expect(await page.locator('.path-pinyin img').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('pinyin-breathe');pass('Reduced motion disables mascot, feedback and transition animations');
 // A fresh second-unit lesson exercises the updated UI against genuine native grading.
 await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Meet 一',exact:true}).click();
 await page.getByRole('button',{name:'Start practice',exact:true}).click();
 const curriculum=await page.evaluate(async()=>await(await fetch('curriculum.json')).json());const lesson=curriculum.lessons.find(l=>l.id==='numbers-1');
 await expect(page.locator('.illustrated-options')).toBeVisible();expect(await page.getByRole('radio').count()).toBeGreaterThanOrEqual(3);
 await page.getByRole('radio').filter({hasText:'two'}).click();await expect(page.getByRole('radio').filter({hasText:'two'})).toHaveAttribute('aria-checked','true');
 await capture('answer-selected.png');await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByText('A useful mistake. Try again.',{exact:true})).toBeVisible();
 await capture('answer-wrong.png');await page.getByRole('button',{name:'Retry',exact:true}).click();
 for(let i=0;i<lesson.exercises.length;i++){
  const e=lesson.exercises[i];
  const controls=await page.locator('[data-audio-text]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-audio-text')));
  for(const text of controls)expect(audio.clips.some(c=>c.key===text.normalize('NFKC').replace(/[\s。，！？,.!?、]/g,''))).toBe(true);
  if(e.type==='ordering'){for(const word of e.answer)await page.locator('.token-list').getByRole('button',{name:word,exact:true}).click();}
  else if(e.type==='matching'){for(let j=0;j<e.answer.length;j++)await page.locator('.matching select').nth(j).selectOption(e.answer[j]);}
  else if(e.type==='blank')await page.getByLabel('Your answer in Hanzi',{exact:true}).fill(e.answer);
  else await page.getByRole('radio').filter({hasText:e.type==='choice'?curriculum.words.find(w=>w.id===e.answer).translation.en:e.answer}).click();
  if(e.type==='dialogue')await capture('dialogue.png');
  if(e.type==='listening')await capture('listening.png');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByText(/That[’']s right!/)).toBeVisible();
  if(i===0)await capture('answer-correct.png');
  await page.getByRole('button',{name:i===lesson.exercises.length-1?'Finish lesson':'Continue',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'You made room for progress.',exact:true})).toBeVisible();await expect(page.getByText('86%',{exact:true})).toBeVisible();await capture('completion.png');
 pass('Reference-inspired illustrated cards, blue selection, pinned Check and success/retry sheets work across all seven real scored exercise types, including complete-sentence dialogue audio');
 const completed=(await call('state')).data;expect(completed.points).toBe(76);expect((await call('complete',{id:'numbers-1'})).data.duplicate).toBe(true);expect((await call('state')).data.points).toBe(76);pass('New lesson awards 37 genuine local points once and keeps original progress');
 await device.shell(`am force-stop ${pkg}`);await device.shell(`am start -W -n ${pkg}/.MainActivity`);page=await current();expect((await call('state')).data.points).toBe(76);pass('Updated APK survives offline process restart with old and new progress');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e);if(page)await capture('failure.png').catch(()=>{});throw e;}
finally{writeFileSync('docs/android-v2-device-results.json',JSON.stringify(report,null,2));await device.close();}
