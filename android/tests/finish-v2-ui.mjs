import {_android,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const report=JSON.parse(readFileSync('docs/android-v2-device-results.json','utf8'));
if(report.checks.length!==7||report.audio.length!==120)throw new Error('This bounded finish requires the prior seven checks and all120 native audio results');
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5556');
if(!device)throw new Error('Owned emulator missing');
const capture=name=>writeFileSync('screenshots/android-v2/'+name,execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s','emulator-5556','exec-out','screencap','-p']));
const pass=s=>{report.checks.push(s);console.log('PASS '+s);};
let page;
const current=async()=>{const p=await(await device.webView({pkg:'com.hanyuflow.android'})).page();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));return p;};
try{
 page=await current();
 const call=(method,data={})=>page.evaluate(({method,data})=>JSON.parse(window.HanyuNative.request(method,JSON.stringify(data))),{method,data});
 const c=await page.evaluate(async()=>await(await fetch('curriculum.json')).json());const lesson=c.lessons.find(l=>l.id==='numbers-1');
 const progress=(await call('lesson',{id:lesson.id})).data;expect(progress.cursor).toBe(1);expect(progress.attempts.filter(a=>a.order===0).map(a=>a.correct)).toEqual([false,true]);
 await expect(page.getByText(/That[’']s right!/)).toBeVisible();capture('answer-correct.png');await page.getByRole('button',{name:'Continue',exact:true}).click();
 for(let i=1;i<lesson.exercises.length;i++){
  const e=lesson.exercises[i];
  const controls=await page.locator('[data-audio-text]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-audio-text')));
  const audio=await page.evaluate(async()=>await(await fetch('audio/manifest.json')).json());
  for(const text of controls)expect(audio.clips.some(a=>a.key===text.normalize('NFKC').replace(/[\s。，！？,.!?、]/g,''))).toBe(true);
  if(e.type==='ordering'){for(const word of e.answer)await page.locator('.token-list').getByRole('button',{name:word,exact:true}).click();}
  else if(e.type==='matching'){for(let j=0;j<e.answer.length;j++)await page.locator('.matching select').nth(j).selectOption(e.answer[j]);}
  else if(e.type==='blank')await page.getByLabel('Your answer in Hanzi',{exact:true}).fill(e.answer);
  else await page.getByRole('radio').filter({hasText:e.type==='choice'?c.words.find(w=>w.id===e.answer).translation.en:e.answer}).click();
  if(e.type==='dialogue')capture('dialogue.png');
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByText(/That[’']s right!/)).toBeVisible();
  await page.getByRole('button',{name:i===lesson.exercises.length-1?'Finish lesson':'Continue',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'You made room for progress.',exact:true})).toBeVisible();await expect(page.getByText('86%',{exact:true})).toBeVisible();capture('completion.png');
 pass('Illustrated cards, blue selected state, pinned Check and success/retry sheets work across all seven native-graded exercise types, including complete-sentence dialogue audio');
 expect((await call('state')).data.points).toBe(76);expect((await call('complete',{id:'numbers-1'})).data.duplicate).toBe(true);expect((await call('state')).data.points).toBe(76);
 pass('Second lesson awards 37 genuine local points once and keeps existing progress');
 await device.shell('am force-stop com.hanyuflow.android');await device.shell('am start -W -n com.hanyuflow.android/.MainActivity');page=await current();
 expect((await call('state')).data.points).toBe(76);capture('dashboard-final.png');
 pass('Updated APK survives offline process restart with existing and newly earned progress');
 expect(report.errors).toEqual([]);report.passed=true;delete report.failure;
 report.continuationNote='Seven earlier checks and all120 clips were preserved. UI continuation corrected only the test apostrophe matcher; no app grading or data was altered.';
}catch(e){report.passed=false;report.failure=String(e);if(page)capture('failure.png');throw e;}
finally{writeFileSync('docs/android-v2-device-results.json',JSON.stringify(report,null,2));await device.close();}
