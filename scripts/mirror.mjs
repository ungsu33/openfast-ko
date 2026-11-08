import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const BASE = 'https://openfast.readthedocs.io/en/main/';
const RAW = path.join(ROOT, '.cache/original');
const queue = new Set(['index.html', 'genindex.html', 'search.html', 'searchindex.js', 'objects.inv']);
const done = new Set();
const failures = [];
const records = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
await fs.mkdir(RAW, {recursive:true});

async function fetchBytes(url) {
  for(let attempt=0;attempt<4;attempt++) {
    try {
      const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    }catch(e){if(attempt===3) throw e; await sleep((attempt+1)*1500);}
  }
}
function enqueue(ref, from) {
  if(!ref || /^(data:|javascript:|mailto:|tel:|#)/i.test(ref)) return;
  let u;try{u=new URL(ref, new URL(from,BASE))}catch{return;}
  if(!u.href.startsWith(BASE))return;
  let p=decodeURIComponent(u.pathname.slice(new URL(BASE).pathname.length));
  if(!p || p.endsWith('/'))p+='index.html';
  if(p.includes('..'))return;
  queue.add(p);
}
const index = await fetchBytes(BASE+'searchindex.js');
const s=index.toString();
const si=JSON.parse(s.slice(s.indexOf('(')+1,s.lastIndexOf(')')));
for(const n of si.docnames)queue.add(n+'.html');
await fs.writeFile(path.join(ROOT,'.cache/search-original.json'),JSON.stringify(si));
console.log(`Search index: ${si.docnames.length} document pages`);
async function one(p) {
  const dest=path.join(RAW,p);
  let b;try{b=await fs.readFile(dest);}catch{b=await fetchBytes(BASE+p);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
  const sha=crypto.createHash('sha256').update(b).digest('hex');
  records.push({path:p,bytes:b.length,sha256:sha});
  if(/\.html$/.test(p)) {
    const $=cheerio.load(b.toString());
    $('a[href],link[href]').each((_,e)=>enqueue($(e).attr('href'),p));
    $('img[src],script[src],source[src],video[src],iframe[src],embed[src]').each((_,e)=>enqueue($(e).attr('src'),p));
    $('[srcset]').each((_,e)=>{$(e).attr('srcset').split(',').forEach(t=>enqueue(t.trim().split(/\s+/)[0],p));});
    $('script[src^="https://cdn.jsdelivr.net/npm/mathjax"]').each((_,e)=>{});
  } else if(/\.css$/.test(p)) {
    for(const m of b.toString().matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))enqueue(m[1],p);
  }
}
while([...queue].some(p=>!done.has(p))) {
  const batch=[...queue].filter(p=>!done.has(p)).slice(0,2);
  batch.forEach(p=>done.add(p));
  await Promise.all(batch.map(async p=>{try{await one(p);}catch(e){failures.push({path:p,error:String(e)});console.log('FAILED '+p+' '+e.message);}}));
  if(done.size%40<8)console.log(`Downloaded ${done.size}/${queue.size} files`);
  await sleep(700);
}
records.sort((a,b)=>a.path.localeCompare(b.path));
const manifest={source:BASE,snapshotDate:'2026-11-08',upstreamVersion:'5.0.0',upstreamCommit:'2895884d2be01862173c88d70f86b358d2f1a50a',indexedPages:si.docnames.length,files:records,failures};
await fs.mkdir('reports',{recursive:true});
await fs.writeFile('reports/source-manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({files:records.length,html:records.filter(x=>x.path.endsWith('.html')).length,bytes:records.reduce((a,x)=>a+x.bytes,0),failures},null,2));
for(const name of ['LICENSE','NOTICE']){
  const r=await fetch('https://raw.githubusercontent.com/OpenFAST/openfast/'+manifest.upstreamCommit+'/'+name);
  if(r.ok)await fs.writeFile(name,await r.text());
}
