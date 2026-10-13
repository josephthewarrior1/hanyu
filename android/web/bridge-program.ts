import {bi,type Word} from '../../src/lib/content';
import {bridgeWords,bridgeQualification,ex} from './bridge';
import {bridgeUnits,bridgeLessons} from './bridge-lessons';
import {bridgeChecks} from './bridge-checks';
const extraSamples={
 他:ex('他每天学习。','Tā měitiān xuéxí.','He studies every day.','Dia belajar setiap hari.'),
 他们:ex('他们都喜欢看书。','Tāmen dōu xǐhuan kàn shū.','They all like reading.','Mereka semua suka membaca.'),
 月:ex('四月六号。','Sì yuè liù hào.','April6.','6 April.'),
 七:ex('七点见面。','Qī diǎn jiànmiàn.','Meet at seven.','Bertemu pukul tujuh.'),
 八:ex('八点回家。','Bā diǎn huí jiā.','Go home at eight.','Pulang pukul delapan.'),
 分钟:ex('走三分钟。','Zǒu sān fēnzhōng.','Walk for three minutes.','Berjalan tiga menit.'),
 周末:ex('周末我们一起看书。','Zhōumò wǒmen yīqǐ kàn shū.','We read together at the weekend.','Akhir pekan kami membaca bersama.'),
 星期天:ex('星期天我有空。','Xīngqītiān wǒ yǒu kòng.','I am free on Sunday.','Saya punya waktu hari Minggu.'),
 路:ex('这是去学校的路。','Zhè shì qù xuéxiào de lù.','This is the route to school.','Ini rute menuju sekolah.'),
 中间:ex('学校在银行和车站中间。','Xuéxiào zài yínháng hé chēzhàn zhōngjiān.','School is between bank and stop.','Sekolah di antara bank dan halte.'),
 甜:ex('茶很甜。','Chá hěn tián.','The tea is sweet.','Tehnya manis.'),
 冷:ex('我想喝冷水。','Wǒ xiǎng hē lěng shuǐ.','I would like cold water.','Saya ingin air dingin.'),
 张:ex('请给我一张纸。','Qǐng gěi wǒ yī zhāng zhǐ.','Please give me a sheet of paper.','Tolong beri saya selembar kertas.'),
 纸:ex('这张纸很大。','Zhè zhāng zhǐ hěn dà.','This sheet of paper is big.','Lembaran kertas ini besar.'),
 包:ex('我想买一包茶。','Wǒ xiǎng mǎi yī bāo chá.','I would like a package of tea.','Saya ingin sebungkus teh.'),
 短:ex('那个比这个短。','Nàge bǐ zhège duǎn.','That is shorter than this.','Itu lebih pendek daripada ini.'),
 最:ex('这件衣服最便宜。','Zhè jiàn yīfu zuì piányi.','This garment is cheapest in the understood set.','Pakaian ini paling murah dalam kelompok yang dimaksud.'),
 问题:ex('我有一个问题。','Wǒ yǒu yī ge wèntí.','I have a question/problem.','Saya punya pertanyaan/masalah.'),
 一下:ex('请等一下。','Qǐng děng yī xià.','Please wait a moment.','Tolong tunggu sebentar.'),
};
export const contextualBridgeWords:Word[]=bridgeWords.map(w=>{
 const unit=bridgeUnits.find(u=>u.id===w.topic)!;
 const available=[...unit.dialogues.flatMap(d=>d.turns),unit.reading,...unit.lessons.flatMap(c=>c.notes.flatMap(n=>n.examples))].filter(e=>e.text.includes(w.hanzi)).sort((a,b)=>a.text.length-b.text.length);
 const sample=extraSamples[w.hanzi as keyof typeof extraSamples]??available[0];
 if(!sample)throw new Error('Missing instructional context for '+w.hanzi);
 return {...w,sample:sample.text,samplePinyin:sample.pinyin,sampleTranslation:sample.meaning};
});
export const bridgeProgram={version:'original-everyday-0.1',qualification:bridgeQualification,title:bi('Everyday situations','Situasi sehari-hari'),units:bridgeUnits.map(u=>({...u,words:contextualBridgeWords.filter(w=>w.topic===u.id)})),lessons:bridgeLessons,checks:bridgeChecks,words:contextualBridgeWords,rule:{perSkillThreshold:80,nextDayHours:24,weeklyDays:7,skills:['listening','reading','production'],exposure:'Whole form made available at opening; previously opened forms are practice only.'},speakingQualification:bi('A private recording or message is attempted practice only. Open writing and pronunciation are not assessed.','Rekaman/pesan privat hanya percobaan latihan. Tulisan bebas dan pelafalan tidak dinilai.')};
export const bridgeAudioTexts=[...new Set([
 ...contextualBridgeWords.map(w=>w.sample),
 ...bridgeUnits.flatMap(u=>[u.reading.text,...u.dialogues.flatMap(d=>d.turns.map(t=>t.text)),...u.lessons.flatMap(c=>[c.speakText,...c.notes.flatMap(n=>n.examples.map(e=>e.text))])]),
 ...[...bridgeLessons,...bridgeChecks].flatMap(c=>c.exercises.map(e=>e.audioText??'').filter(Boolean)),
])];
