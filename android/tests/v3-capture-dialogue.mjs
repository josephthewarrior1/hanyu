import {_android,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const serial='emulator-5556';const d=(await _android.devices()).find(x=>x.serial()===serial);if(!d)throw new Error('Owned emulator absent');
try{
 const p=await(await d.webView({pkg:'com.hanyuflow.android'})).page();p.setDefaultTimeout(15000);
 await p.getByRole('button',{name:'Learn',exact:true}).click();await p.locator('.academy-course').filter({hasText:'Ask for repetition'}).click();
 await expect(p.getByText('Two-turn exchange 1',{exact:true})).toBeVisible();
 // A native swipe makes the headless emulator compositor draw this long newly-loaded page.
 await d.shell('input swipe 500 1900 500 950 350');await p.waitForTimeout(1200);
 await p.getByText('Two-turn exchange 1',{exact:true}).scrollIntoViewIfNeeded();await p.waitForTimeout(1200);
 writeFileSync('screenshots/android-v3/dialogues.png',execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s',serial,'exec-out','screencap','-p']));
 console.log('Captured native dialogue framebuffer after native compositor swipe; no answers or scores changed.');
}finally{await d.close();}
