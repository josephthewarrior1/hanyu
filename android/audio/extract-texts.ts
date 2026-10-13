import {words,grammar,lessonDrafts} from '../../src/lib/content';
import {program,extraWords,guidedTexts} from '../web/program';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const canonical=(s:string)=>s.normalize('NFKC').replace(/[\s。，！？,.!?、]/g,'');
const utterances=new Map<string,{id:string;text:string;key:string;uses:string[]}>();
function add(text:string,use:string){const key=canonical(text);if(!/[\p{Script=Han}]/u.test(key))throw new Error('Expected Mandarin Hanzi: '+text);const existing=utterances.get(key);if(existing){existing.uses.push(use);return;}utterances.set(key,{id:createHash('sha256').update(key).digest('hex').slice(0,16),text,key,uses:[use]});}
for(const word of words){add(word.hanzi,'word:'+word.id);add(word.sample,'sample:'+word.id);}
for(const g of grammar)for(const e of g.examples)add(e.hanzi,'grammar:'+g.id);
add('你好！我叫安娜。','speaking-introduction');
for(const lesson of lessonDrafts)for(const exercise of lesson.exercises){if(exercise.hanzi){if(exercise.type==='dialogue'){const word=words.find(w=>w.id===lesson.vocabulary[1])!;add(word.sample,'dialogue:'+lesson.id);}else add(exercise.hanzi,'exercise:'+lesson.id);}}
for(const w of extraWords){add(w.hanzi,'v3-word:'+w.id);add(w.sample,'v3-sample:'+w.id);}
for(const c of [...program.courses,...program.checkForms]){for(const n of c.notes)for(const e of n.examples)add(e.text,'v3-note:'+c.id);for(const e of c.exercises)if(e.audioText)add(e.audioText,'v3-task:'+e.id);}
for(const text of guidedTexts)add(text,'v3-guided-recording');
mkdirSync('android/audio',{recursive:true});
const result={version:1,language:'zh-CN',format:'Mandarin Hanzi only',canonicalization:'NFKC, remove whitespace and basic Chinese/Latin punctuation',utterances:[...utterances.values()]};
writeFileSync('android/audio/utterances.json',JSON.stringify(result,null,2));
console.log(`Prepared ${utterances.size} unique Mandarin audio clips covering words, examples, grammar, exercises and speaking prompt. Dialogue audio uses the complete sentence, not underscores.`);
