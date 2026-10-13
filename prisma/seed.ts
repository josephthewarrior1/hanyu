import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { units, words, grammar, lessonDrafts, bi } from '../src/lib/content';
const db=new PrismaClient();
async function main(){
 await db.curriculum.upsert({where:{id:'original-beginner'},create:{id:'original-beginner',title:'HanyuFlow Original Beginner',version:'0.1.0',syllabus:'Original beginner draft; not mapped to any official HSK syllabus; not human reviewed'},update:{}});
 await db.level.upsert({where:{id:'beginner'},create:{id:'beginner',curriculumId:'original-beginner',title:'Beginner foundations',order:1},update:{}});
 for(const u of units) await db.unit.upsert({where:{id:u.id},create:{...u,levelId:'beginner'},update:{}});
 for(const w of words) await db.vocabulary.upsert({where:{id:w.id},create:{id:w.id,hanzi:w.hanzi,pinyin:w.pinyin,sample:w.sample,samplePinyin:w.samplePinyin,sampleTranslation:w.sampleTranslation,tags:[w.topic],translations:{create:[{locale:'en',text:w.translation.en},{locale:'id',text:w.translation.id}]}},update:{}});
 for(const g of grammar) await db.grammarPoint.upsert({where:{id:g.id},create:g,update:{}});
 for(const l of lessonDrafts){
  if(await db.lesson.findUnique({where:{id:l.id}}))continue;
  const firstWord=words.find(w=>w.id===l.vocabulary[0])!;
  await db.lesson.create({ data: {
    id:l.id,unitId:l.unitId,order:l.order,
    versions:{ create: {
      version:1,title:l.title,objective:l.objective,estimatedMinutes:l.estimatedMinutes,threshold:l.threshold,status:'PUBLISHED',publishedAt:new Date(),
      vocabulary:{create:l.vocabulary.map(vocabularyId=>({vocabularyId}))},
      grammar:{create:l.grammar.map(grammarId=>({grammarId}))},
      exercises:{create:l.exercises.map((e,i)=>({...e,order:i,options:{create:e.options.map((text,order)=>({text,order}))}}))},
      dialogues:{create:{title:'Say it together',lines:{create:[
        {speaker:'A',hanzi:'你好！',pinyin:'nǐ hǎo',translation:bi('Hello!','Halo!'),order:0},
        {speaker:'B',hanzi:firstWord.sample,pinyin:firstWord.samplePinyin,translation:firstWord.sampleTranslation,order:1}
      ]}}}
    }}
  }});
 }
 for(const [id,threshold,title] of [['first-lesson',1,bi('First steps','Langkah pertama')],['five-lessons',5,bi('Finding your rhythm','Mulai terbiasa')],['thirty-lessons',30,bi('Foundations explored','Dasar telah dijelajahi')]] as const) await db.achievement.upsert({where:{id},create:{id,title,description:bi(`Complete ${threshold} lessons.`,`Selesaikan ${threshold} pelajaran.`),kind:'LESSONS',threshold},update:{}});
 await db.dailyMission.upsert({where:{id:'one-lesson'},create:{id:'one-lesson',title:bi('Finish one lesson','Selesaikan satu pelajaran'),target:1},update:{}});
 if(process.env.SEED_DEV_USERS==='true'&&process.env.NODE_ENV!=='production')for(const [email,role,name] of [['admin@hanyuflow.local','ADMIN','Local Admin'],['editor@hanyuflow.local','EDITOR','Local Editor'],['student@hanyuflow.local','STUDENT','Ari']])await db.user.upsert({where:{email},create:{email,name,role,passwordHash:await hash('LocalStudy!2026',12),profile:{create:{onboardingDone:role!=='STUDENT'}},streak:{create:{}},notifications:{create:{}}},update:{}});
 console.log(`Seeded ${units.length} original units, ${lessonDrafts.length} playable lessons and ${words.length} vocabulary entries. Draft curriculum is NOT human reviewed.`);
}
main().finally(()=>db.$disconnect());
