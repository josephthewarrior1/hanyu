import {_android,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const serial='emulator-5556',pkg='com.hanyuflow.android',mode=process.argv[2];
const adb='C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Only the isolated owned emulator is allowed');
let page;const reportPath='docs/android-correction-device-results.json';
const report=mode==='verify'?JSON.parse(readFileSync(reportPath,'utf8')):{versionCode:4,checks:[],errors:[],fixture:'Disposable emulator: genuine native-graded answers; only run/attempt timestamps are explicitly adjusted to represent an old early-exposure history, not an actual 24h learner experiment.'};
const connect=async()=>{page=await(await device.webView({pkg})).page();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));};
const call=(method,data={})=>page.evaluate(({method,data})=>{const r=JSON.parse(window.HanyuNative.request(method,JSON.stringify(data)));if(r.error)throw new Error(r.error);return r.data;},{method,data});
const pass=s=>{report.checks.push(s);writeFileSync(reportPath,JSON.stringify(report,null,2));console.log('PASS '+s);};
const capture=async name=>{await page.waitForTimeout(700);writeFileSync('screenshots/android-correction/'+name+'.png',execFileSync(adb,['-s',serial,'exec-out','screencap','-p']));};
const restart=async()=>{await device.shell(`am force-stop ${pkg}`);await device.shell(`am start -W -n ${pkg}/.MainActivity`);await connect();};
try{
 mkdirSync('screenshots/android-correction',{recursive:true});await connect();
 if(mode==='seed'){
  expect((await device.shell(`dumpsys package ${pkg}`)).toString()).toContain('versionCode=3');expect((await call('state')).points).toBe(39);
  const program=await page.evaluate(async()=>await(await fetch('program.json')).json());
  for(const c of program.courses){const p=await call('programStart',{id:c.id});for(let i=0;i<6;i++)expect((await call('programAttempt',{runId:p.run.id,order:i,answer:c.exercises[i].answer,eventId:randomUUID()})).correct).toBe(true);expect((await call('programComplete',{runId:p.run.id})).points).toBe(40);}
  const early=await call('programStart',{id:'check-2'});for(let i=0;i<10;i++)await call('programAttempt',{runId:early.run.id,order:i,answer:early.course.exercises[i].answer,eventId:randomUUID()});
  const first=await call('programStart',{id:'check-1'});for(let i=0;i<10;i++)await call('programAttempt',{runId:first.run.id,order:i,answer:first.course.exercises[i].answer,eventId:randomUUID()});await call('programComplete',{runId:first.run.id});
  expect((await call('state')).points).toBe(439);
  writeFileSync('../LibraryPatch/clock-fixture.json',JSON.stringify({first:first.run.id,early:early.run.id,emulatorNow:(await call('state')).now},null,2));
  console.log('Seeded old v3 with actual native grading: original data +10 guided modules + early answered active form. No scores were assigned.');
 }else if(mode==='capture'){
  expect((await call('state')).program.masteryConfirmed).toBe(false);await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Repeat form 2',exact:true}).click();
  const p=await call('programStart',{id:'check-2'});expect(p.run.cursor).toBe(10);await page.getByLabel('Typed response',{exact:true}).fill(p.course.exercises[9].answer);await page.getByRole('button',{name:'Check response',exact:true}).click();await page.getByRole('button',{name:'Finish module',exact:true}).click();
  const state=await call('state');delete state.now;expect(state.program.masteryConfirmed).toBe(true);expect(state.points).toBe(439);
  writeFileSync('docs/android-correction-upgrade-before.json',JSON.stringify({state,fixture:report.fixture},null,2));
  pass('Released v3 real UI reproduces invalid retention badge from preanswered/early-opened form after delayed Finish; all scores came from native grading');
 }else if(mode==='verify'){
  await device.shell('svc wifi disable');await device.shell('svc data disable');await restart();
  expect((await device.shell(`dumpsys package ${pkg}`)).toString()).toContain('versionCode=4');
  const before=JSON.parse(readFileSync('docs/android-correction-upgrade-before.json','utf8')).state;const expected={...before,program:{...before.program,masteryConfirmed:false}};const after=await call('state');delete after.now;expect(after).toEqual(expected);
  await page.getByRole('button',{name:'Learn',exact:true}).click();await expect(page.getByText('Retention not yet confirmed',{exact:true})).toBeVisible();
  pass('Actual v3 to 0.4.1 install keeps exact old state, run IDs, attempts/cursor summaries, profile, favorites, reviews, writing and 439 points; only invalid computed retention is removed');
  await page.getByText('Retention not yet confirmed',{exact:true}).scrollIntoViewIfNeeded();await capture('corrected-retention');
  await device.shell(`am force-stop ${pkg}`);
  writeFileSync('../LibraryPatch/after-upgrade.db',execFileSync(adb,['-s',serial,'exec-out','run-as',pkg,'cat','databases/hanyuflow-device.db']));
  const snapshot=JSON.parse(execFileSync('python',['android/tests/correction-fixture.py','snapshot','../LibraryPatch/after-upgrade.db'],{encoding:'utf8'}));
  const earlier=JSON.parse(readFileSync('../LibraryPatch/before-upgrade-snapshot.json','utf8'));expect(snapshot).toEqual(earlier);
  report.exactSqlRowsPreserved=true;pass('Every real SQLite table/column/row and schema version is identical across APK upgrade; no stored history was rewritten or deleted');
  await device.shell(`am start -W -n ${pkg}/.MainActivity`);await connect();await page.getByRole('button',{name:'Learn',exact:true}).click();
  await expect(page.getByRole('button',{name:'Fresh form 3',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Fresh form 3',exact:true}).click();
  const fresh=await call('programStart',{id:'check-3'});expect(fresh.run.started_at-before.program.firstFreshPassAt).toBeGreaterThanOrEqual(86400000);await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
  for(let i=0;i<10;i++){
   const t=fresh.course.exercises[i];if(t.type==='listen'){
    await expect(page.locator('.program-exercise')).not.toContainText(t.audioText);await page.getByRole('radio',{name:t.labels?.[t.answer]?.en??t.answer,exact:true}).click();await expect(page.getByRole('button',{name:'Check response',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Play sample',exact:true}).click();await expect.poll(async()=>(await call('audioState')).status).toBe('ended');
   }else await page.getByLabel('Typed response',{exact:true}).fill(i===3?'qing3 shuo1 man4 yi1 dian3 r':t.answer);
   await page.getByRole('button',{name:'Check response',exact:true}).click();await expect(page.getByText('Correct',{exact:true})).toBeVisible();if(i===3)await capture('valid-number-pinyin');await page.getByRole('button',{name:i===9?'Finish module':'Continue',exact:true}).click();
  }
  const passed=await call('state');expect(passed.program.masteryConfirmed).toBe(true);expect(passed.points).toBe(439);expect(passed.program.runs.find(r=>r.id===fresh.run.id).unhinted_accuracy).toBe(100);
  pass('Corrected real offline mixed-check UI accepts the previously rejected pinyin and retains hidden-script audio gating; legitimately late-opened unseen form confirms scoped retention with no point increase');
  await restart();expect((await call('state')).program.masteryConfirmed).toBe(true);expect((await call('state')).points).toBe(439);await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Repeat form 2',exact:true}).click();
  const repeated=await call('programStart',{id:'check-2'});expect(repeated.run.novel).toBe(0);expect(repeated.run.status).toBe('ACTIVE');
  expect((await call('state')).program.runs.find(r=>r.id===before.program.runs.find(r=>r.course_id==='check-2').id).status).toBe('DONE');
  pass('Offline restart preserves corrected evidence and points; the early-used form remains repeatable practice and its original completed history remains intact');
  expect(report.errors).toEqual([]);report.passed=true;report.finalFixturePoints=439;
 }else throw new Error('Use seed, capture or verify');
}catch(e){report.failure=String(e.stack??e);report.passed=false;throw e;}finally{if(mode!=='seed')writeFileSync(reportPath,JSON.stringify(report,null,2));await device.close();}
