import { _android, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5556');
if(!device)throw new Error('Owned emulator missing');
try {
 const page=await(await device.webView({pkg:'com.hanyuflow.android'})).page();
 const call=(method,data={})=>page.evaluate(({method,data})=>JSON.parse(window.HanyuNative.request(method,JSON.stringify(data))),{method,data});
 const c=await page.evaluate(async()=>await(await fetch('curriculum.json')).json());
 const initial=(await call('state')).data;
 if(initial.points===0&&initial.progress.length===0){
  // Disposable read-only emulator fixture: genuine native attempts, not assigned scores.
  await call('profile',{name:'Android Learner',locale:'en',theme:'dark',timezone:'UTC',onboardingDone:true});
  const first=c.lessons[0];await call('lesson',{id:first.id});
  await call('attempt',{lessonId:first.id,order:0,answer:'intentionally wrong test answer',eventId:crypto.randomUUID()});
  for(let i=0;i<first.exercises.length;i++)expect((await call('attempt',{lessonId:first.id,order:i,answer:first.exercises[i].answer,eventId:crypto.randomUUID()})).data.correct).toBe(true);
  const result=(await call('complete',{id:first.id})).data;expect(result.accuracy).toBe(86);expect(result.points).toBe(37);
  const card=(await call('state')).data.reviews[0];await call('review',{vocabularyId:card.vocab_id,expectedDue:card.due,eventId:crypto.randomUUID(),rating:'GOOD'});
  await call('writing',{character:'一',seconds:3,strokes:[[[50,150],[250,150]]]});
 }
 await call('profile',{favorites:[c.words[0].id],onboardingDone:true});
 const l=c.lessons[1];await call('lesson',{id:l.id});
 const attempted=await call('attempt',{lessonId:l.id,order:0,answer:l.exercises[0].answer,eventId:crypto.randomUUID()});
 expect(attempted.data.correct).toBe(true);
 const state=(await call('state')).data;delete state.now;
 expect(state.points).toBe(39);expect(state.writing).toHaveLength(1);
 writeFileSync('docs/android-upgrade-before.json',JSON.stringify({state,version:(await device.shell('dumpsys package com.hanyuflow.android')).toString().match(/versionCode=\d+[^\n]*/)?.[0]},null,2));
 console.log('PASS baseline: version 1 with real 39 points, completed lesson, review, writing, favorite and unfinished lesson');
} finally{await device.close();}
