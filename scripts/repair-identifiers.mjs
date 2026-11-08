import fs from 'node:fs/promises';
const file='translations/machine.json';
const cache=JSON.parse(await fs.readFile(file,'utf8'));
const overrides=JSON.parse(await fs.readFile('translations/overrides.json','utf8'));
const keys=JSON.parse(await fs.readFile('translations/source-catalog.json','utf8'));
const tech=s=>[...new Set(s.match(/\b[A-Za-z][A-Za-z0-9_]*\b/g)||[])].filter(x=>/_|[a-z][A-Z]/.test(x));
const pending=keys.filter(k=>!overrides[k]&&tech(k).some(t=>!(cache[k]||'').includes(t)));
let records=[];
for(const key of pending){
 const tokens=tech(key);if(tokens.length===1&&key===tokens[0]){cache[key]=key;continue;}
 const ids=new Map(tokens.map((t,i)=>[t,`ZXV${i}VXZ`]));
 records.push({key,tokens,q:key.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g,t=>ids.get(t)||t)});
}
const batches=[];let batch=[],length=0;
for(const r of records){if(length+r.q.length+16>3300&&batch.length){batches.push(batch);batch=[];length=0;}batch.push(r);length+=r.q.length+16;}if(batch.length)batches.push(batch);
async function tr(q){for(let a=0;a<5;a++){try{const r=await fetch('https://translate.googleapis.com/translate_a/single?'+new URLSearchParams({client:'gtx',sl:'en',tl:'ko',dt:'t',q}),{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);let d=await r.json();return d[0].map(x=>x[0]||'').join('');}catch(e){if(a===4)throw e;await new Promise(r=>setTimeout(r,3000*2**a));}}}
function restore(out,r){let v=out;for(const [i,t] of r.tokens.entries())v=v.replace(new RegExp(`ZXV\\s*${i}\\s*VXZ`,'gi'),t);if(r.tokens.some(t=>!v.includes(t))||/ZXV\s*\d+/.test(v))return null;return v.trim();}
let failed=[];
for(const [i,b] of batches.entries()){
 const out=await tr(b.map((r,j)=>`ZXQ${j}QXZ ${r.q}`).join('\n'));
 const m=[...out.matchAll(/ZXQ\s*(\d+)\s*QXZ\s*/gi)];
 for(const [j,r] of b.entries()){
   let v=null;
   if(m.length===b.length&&m.every((x,k)=>Number(x[1])===k))v=restore(out.slice(m[j].index+m[j][0].length,j+1<m.length?m[j+1].index:out.length),r);
   if(!v)v=restore(await tr(r.q),r);
   if(v)cache[r.key]=v;else{cache[r.key]=r.key;failed.push(r.key);}
 }
 await fs.writeFile(file,JSON.stringify(cache,null,2));
 console.log(`Protected identifier repair ${i+1}/${batches.length}`);
 await new Promise(r=>setTimeout(r,500));
}
await fs.writeFile(file,JSON.stringify(cache,null,2));
await fs.writeFile('reports/identifier-repair.json',JSON.stringify({stringsAudited:keys.length,stringsFlagged:pending.length,retranslatedWithProtectedIdentifiers:records.length,englishFallbacks:failed},null,2));
console.log(JSON.stringify({pending:pending.length,repaired:records.length,failed:failed.length}));
