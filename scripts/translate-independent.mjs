import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('translations/source-catalog.json','utf8'));
const manual=JSON.parse(await fs.readFile('translations/overrides.json','utf8'));
let memory={};try{memory=JSON.parse(await fs.readFile('.cache/independent.json','utf8'));}catch{}
const words=/\b[A-Za-z][A-Za-z0-9_]*\b/g;
const protectedWord=t=>/_|[a-z][A-Z]|[A-Z]{2,}[a-z]/.test(t)||/^[A-Z][A-Z0-9]{1,}$/.test(t)||['Linearize','Echo','Gravity'].includes(t);
function prepare(key){
 const tokens=[];
 const q=key.replace(words,t=>{if(!protectedWord(t))return t;let i=tokens.indexOf(t);if(i<0){i=tokens.length;tokens.push(t);}return `ZXV${i}VXZ`;});
 return {key,q,tokens};
}
function restore(s,r){
 let out=s;for(const [i,t] of r.tokens.entries())out=out.replace(new RegExp(`ZXV\\s*${i}\\s*VXZ`,'gi'),t);
 if(/ZXV\s*\d+\s*VXZ/i.test(out)||r.tokens.some(t=>!out.includes(t)))throw Error('Identifier preservation failed: '+r.key);
 return out.trim();
}
const pending=[];
for(const key of catalog){
 if(manual[key]){memory[key]=manual[key];continue;}
 if(/^(?:https?:\/\/|\.{1,2}\/|_[A-Za-z]+\/)/.test(key)||(/^[A-Za-z][A-Za-z0-9_]*$/.test(key)&&protectedWord(key))){memory[key]=key;continue;}
 if(!memory[key])pending.push(prepare(key));
}
const batches=[];let batch=[],len=0;
const englishFallbacks=[];
for(const rec of pending){const size=encodeURIComponent(rec.q).length+5;if((len+size>6500||batch.length>=60)&&batch.length){batches.push(batch);batch=[];len=0;}batch.push(rec);len+=size;}
if(batch.length)batches.push(batch);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(batch){
 for(let n=0;n<6;n++){
  try{
   const url=new URL('https://translate.googleapis.com/translate_a/t');url.search=new URLSearchParams({client:'gtx',sl:'en',tl:'ko'}).toString();for(const r of batch)url.searchParams.append('q',r.q);
   const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(!Array.isArray(data)||data.length!==batch.length||data.some(x=>typeof x!=='string'||!x.trim()))throw Error('Independent response count/type mismatch');
   const out=[];
   for(let i=0;i<data.length;i++){
     try{out.push(restore(data[i],batch[i]));}
     catch{
       const plainUrl='https://translate.googleapis.com/translate_a/t?'+new URLSearchParams({client:'gtx',sl:'en',tl:'ko',q:batch[i].key});
       const plain=await fetch(plainUrl).then(r=>r.json());
       if(typeof plain[0]==='string'&&batch[i].tokens.every(t=>plain[0].includes(t)))out.push(plain[0]);
       else{out.push(batch[i].key);englishFallbacks.push(batch[i].key);}
     }
   }
   return out;
  }catch(e){if(n===5)throw e;console.log('Retry '+e.message);await sleep(2500*2**n);}
 }
}
let i=0,done=0;let queue=Promise.resolve();
function save(){queue=queue.then(()=>fs.writeFile('.cache/independent.json',JSON.stringify(memory,null,2)));return queue;}
console.log(JSON.stringify({strings:catalog.length,pending:pending.length,batches:batches.length}));
async function worker(){while(i<batches.length){const current=i++,b=batches[current];let data=await call(b);for(let n=0;n<b.length;n++)memory[b[n].key]=data[n];done++;if(done%10===0){await save();console.log(`Independent translations ${done}/${batches.length}`);}await sleep(500);}}
await Promise.all([worker(),worker()]);await save();
await fs.writeFile('translations/machine.json',JSON.stringify(memory,null,2));
await fs.writeFile('reports/translation-progress.json',JSON.stringify({engine:'Google Translate public endpoint (gtx /translate_a/t)',method:'Independent q parameter per string; strict response count/order/type and technical identifier preservation; manual overrides applied separately',date:'2026-11-08',catalogStrings:catalog.length,translatedStrings:catalog.filter(k=>memory[k]).length,missing:catalog.filter(k=>!memory[k]),englishFallbacks,errors:[]},null,2));
console.log('Independent translation complete: '+catalog.length);
