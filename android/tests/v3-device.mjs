import {_android,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const serial='emulator-5556',pkg='com.hanyuflow.android';
const device=(await _android.devices()).find(d=>d.serial()===serial);
if(!device)throw new Error('The isolated owned emulator is absent; never use another device.');
const mode=process.argv[2]??'flow',reportPath='docs/android-v3-device-results.json';
const report=mode==='audio'?JSON.parse(readFileSync(reportPath,'utf8')):{serial,version:3,checks:[],errors:[],audio:[]};
mkdirSync('screenshots/android-v3',{recursive:true});
let page;
const current=async()=>{page=await(await device.webView({pkg})).page();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));return page;};
const raw=(method,data={})=>page.evaluate(({method,data})=>JSON.parse(window.HanyuNative.request(method,JSON.stringify(data))),{method,data});
const call=async(method,data={})=>{const r=await raw(method,data);if(r.error)throw new Error(method+': '+r.error);return r.data;};
const pass=name=>{report.checks.push(name);writeFileSync(reportPath,JSON.stringify(report,null,2));console.log('PASS '+name);};
const capture=async name=>{await page.waitForTimeout(350);writeFileSync('screenshots/android-v3/'+name+'.png',execFileSync('C:/Users/LENOVO/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s',serial,'exec-out','screencap','-p']));};
const restart=async()=>{await device.shell(`am force-stop ${pkg}`);await device.shell(`am start -W -n ${pkg}/.MainActivity`);await current();};
const answerUI=async task=>{
 if(task.type==='recall'||task.type==='blank')await page.getByLabel('Typed response',{exact:true}).fill(task.alternatives?.find(a=>/\d/.test(a))??task.answer);
 else if(task.type==='ordering')for(const token of task.answer)await page.locator('.token-list').getByRole('button',{name:token,exact:true}).first().click();
 else if(task.type==='matching')for(let j=0;j<task.answer.length;j++)await page.locator('.matching select').nth(j).selectOption(task.answer[j]);
 else {const label=task.labels?.[task.answer]?.en??task.answer;await page.getByRole('radio',{name:label,exact:true}).click();}
 if(task.type==='listen'){
  await page.getByRole('button',{name:'Play sample',exact:true}).click();
  await expect.poll(async()=>{const s=await call('audioState');return s.text===task.audioText&&s.status==='ended';}).toBe(true);
 }
};
const nextUI=async final=>{await page.getByRole('button',{name:final?'Finish module':'Continue',exact:true}).click();};
const guidedNative=async course=>{
 const data=await call('programStart',{id:course.id});
 for(let i=data.run.cursor;i<course.exercises.length;i++)expect((await call('programAttempt',{runId:data.run.id,order:i,answer:course.exercises[i].answer,eventId:randomUUID()})).correct).toBe(true);
 return await call('programComplete',{runId:data.run.id});
};
try{
 await current();
 if(mode==='baseline'){
  const state=await call('state');delete state.now;
  expect(state.points).toBe(39);expect(state.writing).toHaveLength(1);expect(state.profile.favorites).toHaveLength(1);
  expect((await device.shell(`dumpsys package ${pkg}`)).toString()).toContain('versionCode=2');
  writeFileSync('docs/android-v3-upgrade-before.json',JSON.stringify({state,fixture:'Disposable emulator; genuine native graded attempts, review and writing.'},null,2));
  console.log('PASS exact v2 fixture snapshot saved before APK upgrade');
 }else if(mode==='flow'){
  await device.shell('svc wifi disable');await device.shell('svc data disable');await restart();
  const before=JSON.parse(readFileSync('docs/android-v3-upgrade-before.json','utf8')).state;
  const after=await call('state'),legacy={...after};delete legacy.now;delete legacy.program;
  expect(legacy).toEqual(before);expect(after.program.completedCourses).toBe(0);expect(after.program.masteryConfirmed).toBe(false);
  for(const v of Object.values(after.program.skills))expect(v).toEqual({correct:0,total:0});
  expect((await call('programMistakes')).items.some(i=>i.item_key==='greetings-1:0')).toBe(true);
  expect((await device.shell(`dumpsys package ${pkg}`)).toString()).toContain('versionCode=3');
  report.upgrade={retainedOldState:true,points:after.points,originalCompleted:after.progress.filter(p=>p.completed_at).length,mastery:false};
  pass('v2 to v3 installation retains exact old profile, favorites, attempts, cursor, reviews, 39 points and writing; new mastery stays empty');
  const cap=await call('capabilities');expect(cap.audioClips).toBe(200);expect(cap.ai).toBe(false);expect(cap.pronunciation).toBe(false);report.capabilities=cap;
  await page.getByRole('button',{name:'Learn',exact:true}).click();
  await expect(page.locator('.academy-course')).toHaveCount(10);await expect(page.getByText('Later levels: unavailable',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Fresh form 1',exact:true})).toBeDisabled();await capture('learning-path');
  const program=await page.evaluate(async()=>await(await fetch('program.json')).json());
  const first=program.courses[0];await page.locator('.academy-course').filter({hasText:first.title.en}).click();
  await page.getByText('Initials and common finals chart',{exact:true}).click();await expect(page.getByText('21 initial spellings',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
  await page.getByRole('radio').nth(1).click();await page.getByRole('button',{name:'Check response',exact:true}).click();
  await expect(page.getByText('Review this pattern',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry',exact:true}).click();
  await answerUI(first.exercises[0]);await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(false);
  await page.getByRole('button',{name:'Use a hint (assisted)',exact:true}).click();await answerUI(first.exercises[1]);
  await page.getByRole('button',{name:'Check response',exact:true}).click();await expect(page.getByText('Assisted answer - excluded from unhinted evidence',{exact:true})).toBeVisible();await nextUI(false);
  for(let i=2;i<4;i++){await answerUI(first.exercises[i]);await page.getByRole('button',{name:'Check response',exact:true}).click();if(i===2)await nextUI(false);}
  const saved=(await call('programStart',{id:first.id})).run;expect(saved.cursor).toBe(4);
  await restart();await page.getByRole('button',{name:'Learn',exact:true}).click();await page.locator('.academy-course').filter({hasText:first.title.en}).click();
  const resumed=(await call('programStart',{id:first.id})).run;expect(resumed.id).toBe(saved.id);expect(resumed.cursor).toBe(4);
  pass('Real UI wrong-first retry, persisted hint, typed number-tone answer and ordering resume at the next saved activity after process interruption');
  const listening=first.exercises[4];await expect(page.locator('.program-exercise')).not.toContainText(listening.audioText);
  await page.getByRole('radio',{name:listening.answer,exact:true}).click();await expect(page.getByRole('button',{name:'Check response',exact:true})).toBeDisabled();
  const countBefore=(await call('programStart',{id:first.id})).attempts.length;
  await call('speak',{text:'This unsupported test text has no generated audio.'});await expect.poll(async()=>(await call('audioState')).status).toBe('error');
  await expect(page.getByRole('button',{name:'Check response',exact:true})).toBeDisabled();expect((await call('programStart',{id:first.id})).attempts.length).toBe(countBefore);
  await page.getByRole('button',{name:'Play sample',exact:true}).click();await expect.poll(async()=>(await call('audioState')).status).toBe('playing');await call('audioStop');
  await expect(page.getByRole('button',{name:'Check response',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Play sample',exact:true}).click();await expect.poll(async()=>(await call('audioState')).status).toBe('ended');
  await expect(page.getByRole('button',{name:'Check response',exact:true})).toBeEnabled();await capture('audio-first');
  await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(false);await answerUI(first.exercises[5]);
  await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(true);
  await expect(page.getByRole('heading',{name:'Practice recorded',exact:true})).toBeVisible();
  const firstDone=(await call('state')).program.runs.find(r=>r.id===saved.id);expect(firstDone.accuracy).toBe(83);expect(firstDone.unhinted_accuracy).toBe(67);
  expect((await call('state')).points).toBe(76);expect((await call('programComplete',{runId:saved.id})).points).toBe(0);await capture('honest-score');
  pass('Audio-first UI hides script, blocks stopped/failed playback without auto-grading, then records genuine native first-attempt 83% and unhinted 67% with 37 points');
  const evidence=(await call('state')).program.skills;expect(evidence.listening.total).toBe(0);
  await page.getByRole('button',{name:'Repeat',exact:true}).click();await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
  for(let i=0;i<6;i++){await answerUI(first.exercises[i]);await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(i===5);}
  expect((await call('state')).points).toBe(76);expect((await call('state')).program.skills).toEqual(evidence);
  pass('Completed modules remain repeatable; repeated runs and provisional phonetic exercises do not inflate points or skill evidence');
  await page.getByRole('button',{name:'Return to path',exact:true}).click();await page.getByRole('button',{name:'Practice my mistakes',exact:true}).click();
  const queue=await call('programMistakes'),due=queue.items.find(i=>i.due<=queue.now);expect(due).toBeTruthy();await answerUI(due.task);
  await page.getByRole('button',{name:'Check practice',exact:true}).click();await expect(page.getByText('Correct',{exact:true})).toBeVisible();
  const scheduled=(await call('programMistakes')).items.find(i=>i.item_key===due.item_key);expect(scheduled.due).toBeGreaterThan(queue.now+86390000);expect((await call('state')).points).toBe(76);
  await capture('mistake-review');pass('Actual previous mistakes are playable in the UI; a correct response schedules tomorrow with no extra points');
  await page.getByRole('button',{name:'Learn',exact:true}).click();const practical=program.courses.find(c=>c.id==='use-1');
  await page.locator('.academy-course').filter({hasText:practical.title.en}).click();await expect(page.getByText('Two-turn exchange 1',{exact:true})).toBeVisible();await expect(page.getByText('Two-turn exchange 2',{exact:true})).toBeVisible();await capture('dialogues');
  await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
  for(let i=0;i<6;i++){await answerUI(practical.exercises[i]);await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(i===5);}
  expect((await call('state')).points).toBe(116);pass('Practical self-introduction UI plays both dialogue variants and grades listening meaning, response, ordering and typed recall end to end');
  await page.getByRole('button',{name:'Listen, record and compare',exact:true}).click();
  await page.getByRole('button',{name:'Record a self-check',exact:true}).click();
  let xml='';await expect.poll(async()=>{await device.shell('uiautomator dump /sdcard/hanyuflow-v3-permission.xml');xml=(await device.shell('cat /sdcard/hanyuflow-v3-permission.xml')).toString();return xml.includes('permission_deny_button');},{timeout:15000}).toBe(true);
  const bounds=xml.match(/resource-id="[^"]*permission_deny_button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);expect(bounds).toBeTruthy();await device.shell(`input tap ${Math.round((+bounds[1]+ +bounds[3])/2)} ${Math.round((+bounds[2]+ +bounds[4])/2)}`);
  await expect(page.getByRole('button',{name:'Record a self-check',exact:true})).toBeVisible();expect((await call('state')).program.speakingAttempts).toHaveLength(0);
  await page.getByRole('button',{name:'Learn',exact:true}).click();await expect(page.locator('.academy-course')).toHaveCount(10);
  await device.shell(`pm grant ${pkg} android.permission.RECORD_AUDIO`);await page.locator('.academy-course').filter({hasText:practical.title.en}).click();
  // A repeat completed module can be started without altering its earned points.
  await page.getByRole('button',{name:'Start varied practice',exact:true}).click();await page.getByRole('button',{name:'Leave program',exact:true}).click();
  await page.getByRole('button',{name:'Speak',exact:true}).click();
  // Use the guided recording screen through a completed practical result.
  await guidedNative(practical);await page.getByRole('button',{name:'Learn',exact:true}).click();await page.locator('.academy-course').filter({hasText:practical.title.en}).click();await page.getByRole('button',{name:'Start varied practice',exact:true}).click();
  for(let i=0;i<6;i++){await answerUI(practical.exercises[i]);await page.getByRole('button',{name:'Check response',exact:true}).click();await nextUI(i===5);}
  await page.getByRole('button',{name:'Listen, record and compare',exact:true}).click();
  await page.getByRole('button',{name:'Record a self-check',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();
  await page.waitForTimeout(1300);await page.getByRole('button',{name:'Stop recording',exact:true}).click();await expect(page.getByRole('button',{name:'Replay my voice',exact:true})).toBeVisible();
  const recording=(await call('state')).program.speakingAttempts[0];expect(recording.duration_ms).toBeGreaterThanOrEqual(1000);expect((await call('state')).program.pronunciationAssessed).toBe(false);
  await page.getByRole('button',{name:'Replay my voice',exact:true}).click();await page.getByRole('button',{name:'Unsure',exact:true}).click();expect((await call('state')).program.speakingAttempts[0].self_check).toBe('UNSURE');
  await capture('guided-recording');await page.getByRole('button',{name:'Delete audio',exact:true}).click();await expect(page.getByRole('button',{name:'Replay my voice',exact:true})).toHaveCount(0);
  pass('Microphone denial leaves learning open; real native recording/replay/deletion saves attempted self-check only, never a pronunciation score');
  // Remaining modules use genuine native grading as an explicitly labelled test fixture, not claimed UI coverage.
  for(const c of program.courses.filter(c=>!['sound-1','use-1'].includes(c.id)))expect((await guidedNative(c)).accuracy).toBe(100);
  expect((await call('state')).program.completedCourses).toBe(10);expect((await call('state')).points).toBe(436);
  const check=await call('programStart',{id:'check-1'});
  for(let i=0;i<10;i++){if(i<3)await call('programHelp',{runId:check.run.id,order:i,kind:i===0?'REVEAL':'HINT'});expect((await call('programAttempt',{runId:check.run.id,order:i,answer:check.course.exercises[i].answer,eventId:randomUUID()})).correct).toBe(true);}
  const assisted=await call('programComplete',{runId:check.run.id});expect(assisted.accuracy).toBe(100);expect(assisted.unhintedAccuracy).toBe(70);expect(assisted.passed).toBe(false);expect(assisted.points).toBe(0);
  const fresh=await call('programStart',{id:'check-2'});for(let i=0;i<10;i++)await call('programAttempt',{runId:fresh.run.id,order:i,answer:fresh.course.exercises[i].answer,eventId:randomUUID()});
  const passed=await call('programComplete',{runId:fresh.run.id});expect(passed.unhintedAccuracy).toBe(100);expect(passed.passed).toBe(true);
  expect((await raw('programStart',{id:'check-3'})).error).toContain('24hours');const final=await call('state');expect(final.program.masteryConfirmed).toBe(false);expect(final.points).toBe(436);
  pass('Native fixture grades all 60 guided tasks and mixed checks: reveal/hints yield 70% unhinted, passing fresh form still requires a different next-day form; no instant mastery');
  await restart();await page.getByRole('button',{name:'Learn',exact:true}).click();await expect(page.getByRole('button',{name:'Fresh form 3',exact:true})).toBeDisabled();await expect(page.getByText('Retention not yet confirmed',{exact:true})).toBeVisible();
  expect((await call('state')).program).toEqual(final.program);expect((await call('state')).points).toBe(436);await capture('retention-gate');
  report.finalState={points:final.points,completedModules:10,recordingAttempts:final.program.speakingAttempts.length,masteryConfirmed:false,pronunciationAssessed:false};
  pass('Offline process restart preserves all real SQLite runs, assistance, scores, mistake schedule and recording attempt; UI visibly gates fresh retention evidence');
 }else if(mode==='audio'){
  await device.shell('svc wifi disable');await device.shell('svc data disable');
  const baseline=new Set(JSON.parse(readFileSync('android/audio/v2-baseline-ids.json','utf8')));
  const all=await page.evaluate(async()=>await(await fetch('audio/manifest.json')).json());const fresh=all.clips.filter(c=>!baseline.has(c.id));expect(fresh).toHaveLength(80);
  report.audio=[];
  for(const clip of fresh){
   const playback=await page.evaluate(({text})=>new Promise((resolve,reject)=>{
    let playing=null,maxPositionMs=0;const at=performance.now();const timer=setTimeout(()=>{window.removeEventListener('hanyu-native',listen);reject(new Error('Speech timeout'));},10000);
    function listen(ev){const e=ev.detail;if(e.type!=='audio'||e.data.text!==text)return;if(e.data.status==='error'){clearTimeout(timer);window.removeEventListener('hanyu-native',listen);reject(new Error(e.data.error));}if(e.data.status==='playing'&&e.data.isPlaying){playing=e.data;maxPositionMs=Math.max(maxPositionMs,e.data.positionMs);}if(e.data.status==='ended'){clearTimeout(timer);window.removeEventListener('hanyu-native',listen);resolve({playing,ended:e.data,maxPositionMs,elapsedMs:Math.round(performance.now()-at)});}}
    window.addEventListener('hanyu-native',listen);window.HanyuNative.request('speak',JSON.stringify({text}));
   }),{text:clip.text});
   expect(playback.playing?.isPlaying).toBe(true);expect(playback.ended.durationMs).toBeGreaterThan(200);expect(playback.elapsedMs).toBeGreaterThan(playback.ended.durationMs*.8);expect(playback.ended.clipId).toBe(clip.id);expect(playback.ended.offline).toBe(true);if(playback.ended.durationMs>=750)expect(playback.maxPositionMs).toBeGreaterThan(100);
   report.audio.push({id:clip.id,durationMs:playback.ended.durationMs,maxPositionMs:playback.maxPositionMs,elapsedMs:playback.elapsedMs});
   if(report.audio.length%10===0){writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(`PASS native playback ${report.audio.length}/80 new clips`);}
  }
  report.audioLimit='200 clips decoded by native instrumentation; 80 new clips additionally play offline end to end. Existing 120 were played in v2. No acoustic or human linguistic validation; short clips may report zero position in virtual audio sink.';
  pass('All 80 new clips reach real native playing/completion offline, with measured duration and elapsed time; longer clips progress');
  expect(report.errors).toEqual([]);report.passed=true;
 }else throw new Error('Unknown bounded test mode');
}catch(e){report.failure=String(e.stack??e);report.passed=false;throw e;}
finally{if(mode!=='baseline')writeFileSync(reportPath,JSON.stringify(report,null,2));await device.close();}
