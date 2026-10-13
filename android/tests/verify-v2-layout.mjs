import {_android,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const report=JSON.parse(readFileSync('docs/android-v2-device-results.json','utf8'));
if(!report.passed||report.audio.length!==120)throw new Error('Prior full audio/UI verification required');
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5556');
if(!device)throw new Error('Owned emulator missing');
try{
 await device.shell('am force-stop com.hanyuflow.android');await device.shell('am start -W -n com.hanyuflow.android/.MainActivity');
 const page=await(await device.webView({pkg:'com.hanyuflow.android'})).page();
 await expect(page.getByRole('heading',{name:'Hello, Android.',exact:true})).toBeVisible();
 const state=await page.evaluate(()=>JSON.parse(window.HanyuNative.request('state','{}')).data);expect(state.points).toBe(76);
 const title=await page.evaluate(async()=>(await(await fetch('curriculum.json')).json()).lessons.find(l=>l.id==='numbers-2').title.en);
 await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:title,exact:true}).click();await page.getByRole('button',{name:'Start practice',exact:true}).click();
 await page.getByRole('radio').first().click();await page.evaluate(()=>window.scrollTo(0,0));
 const button=await page.locator('.check-button').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,viewport:innerWidth}));
 expect(button.left).toBeGreaterThanOrEqual(19);expect(button.right).toBeLessThanOrEqual(button.viewport-19);
 const screenshot=execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s','emulator-5556','exec-out','screencap','-p']);writeFileSync('screenshots/android-v2/check-layout-final.png',screenshot);
 report.layout=button;report.checks.push('Pinned Check remains within the real Android viewport with both side margins after visual QA correction');
 writeFileSync('docs/android-v2-device-results.json',JSON.stringify(report,null,2));console.log('PASS final viewport layout and retained 76 points');
}finally{await device.close();}
