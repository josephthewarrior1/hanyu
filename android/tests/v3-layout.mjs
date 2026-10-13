import {_android,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const serial='emulator-5556',pkg='com.hanyuflow.android';
const d=(await _android.devices()).find(d=>d.serial()===serial);if(!d)throw new Error('Owned emulator absent');
const report=JSON.parse(readFileSync('docs/android-v3-device-results.json','utf8'));
let page;
const capture=async name=>{await page.waitForTimeout(500);writeFileSync('screenshots/android-v3/'+name+'.png',execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s',serial,'exec-out','screencap','-p']));};
const call=(method,data={})=>page.evaluate(({method,data})=>{const r=JSON.parse(window.HanyuNative.request(method,JSON.stringify(data)));if(r.error)throw new Error(r.error);return r.data;},{method,data});
try{
 await d.shell(`am force-stop ${pkg}`);await d.shell(`am start -W -n ${pkg}/.MainActivity`);page=await(await d.webView({pkg})).page();page.setDefaultTimeout(15000);
 expect((await call('state')).points).toBe(436);
 await page.getByRole('button',{name:'Learn',exact:true}).click();
 await page.getByRole('button',{name:'Fresh form 3',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Fresh form 3',exact:true})).toBeDisabled();await capture('retention-gate');
 await page.locator('.academy-course').filter({hasText:'Ask for repetition'}).click();
 await expect(page.getByText('Two-turn exchange 1',{exact:true})).toBeVisible();await page.getByText('Two-turn exchange 1',{exact:true}).scrollIntoViewIfNeeded();await capture('dialogues');
 await page.getByRole('button',{name:'Leave program',exact:true}).click();
 await page.locator('.academy-course').filter({hasText:'Build a pinyin syllable'}).click();await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
 const run=await call('programStart',{id:'sound-1'});for(let i=0;i<6;i++){await call('programAttempt',{runId:run.run.id,order:i,answer:run.course.exercises[i].answer,eventId:crypto.randomUUID()});}
 // Refresh the runner via navigation; cursor 6 resumes on the last task for an explicit finish.
 await page.getByRole('button',{name:'Leave program',exact:true}).click();await page.locator('.academy-course').filter({hasText:'Build a pinyin syllable'}).click();
 const last=run.course.exercises[5];await page.getByRole('radio',{name:last.answer,exact:true}).click();await page.getByRole('button',{name:'Check response',exact:true}).click();await page.getByRole('button',{name:'Finish module',exact:true}).click();
 await page.getByRole('button',{name:'Listen, record and compare',exact:true}).click();await page.getByRole('button',{name:'Record a self-check',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();await page.waitForTimeout(1100);await page.getByRole('button',{name:'Stop recording',exact:true}).click();
 await expect(page.locator('.program-self-check')).toBeVisible();await page.locator('.program-self-check').scrollIntoViewIfNeeded();
 const bounds=await page.locator('.program-self-check button').evaluateAll(elements=>elements.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth})));
 expect(bounds.every(b=>b.left>=0&&b.right<=b.width)).toBe(true);await capture('guided-recording');
 await page.getByRole('button',{name:'Delete audio',exact:true}).click();expect((await call('state')).points).toBe(436);
 report.layout={selfCheckButtonsWithinViewport:true,pointsRetainedAfterFinalRebuild:436,nativeFramebuffer:true};report.checks.push('Final layout-only APK preserves v3 data; self-check text/buttons fit the mobile viewport and native screenshots capture rendered dialogues and retention gate');
 writeFileSync('docs/android-v3-device-results.json',JSON.stringify(report,null,2));console.log('PASS final layout, rendered native screenshots and retained v3 data');
}finally{await d.close();}
