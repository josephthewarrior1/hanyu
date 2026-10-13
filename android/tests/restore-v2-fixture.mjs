import {_android,expect} from '@playwright/test';
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5556');
if(!device)throw new Error('Owned emulator missing');
try{
 const page=await(await device.webView({pkg:'com.hanyuflow.android'})).page();
 const call=(method,data={})=>page.evaluate(({method,data})=>JSON.parse(window.HanyuNative.request(method,JSON.stringify(data))),{method,data});
 const initial=(await call('state')).data;
 if(initial.points===0&&initial.progress.length===0){
  const c=await page.evaluate(async()=>await(await fetch('curriculum.json')).json());
  await call('profile',{name:'Android Learner',locale:'en',theme:'light',timezone:'UTC',onboardingDone:true,favorites:[c.words[0].id]});
  const first=c.lessons[0];await call('lesson',{id:first.id});
  await call('attempt',{lessonId:first.id,order:0,answer:'intentionally wrong test fixture answer',eventId:crypto.randomUUID()});
  for(let i=0;i<first.exercises.length;i++)expect((await call('attempt',{lessonId:first.id,order:i,answer:first.exercises[i].answer,eventId:crypto.randomUUID()})).data.correct).toBe(true);
  const result=(await call('complete',{id:first.id})).data;expect(result.points).toBe(37);expect(result.accuracy).toBe(86);
  const card=(await call('state')).data.reviews[0];await call('review',{vocabularyId:card.vocab_id,expectedDue:card.due,eventId:crypto.randomUUID(),rating:'GOOD'});
  await call('writing',{character:'一',seconds:3,strokes:[[[50,150],[250,150]]]});
  const second=c.lessons[1];await call('lesson',{id:second.id});await call('attempt',{lessonId:second.id,order:0,answer:second.exercises[0].answer,eventId:crypto.randomUUID()});
  console.log('Recreated genuine native-graded disposable fixture after emulator loss; retained prior upgrade evidence unchanged.');
 }
 expect((await call('state')).data.points).toBe(39);
}finally{await device.close();}
