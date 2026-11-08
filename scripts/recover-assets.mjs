import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const file='reports/source-manifest.json';
const m=JSON.parse(await fs.readFile(file,'utf8'));
async function all(dir){let a=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name==='.git')continue;const p=path.join(dir,e.name);if(e.isDirectory())a.push(...await all(p));else a.push(p);}return a;}
const upstream='.cache/upstream/docs';
const paths=await all(upstream);
const failures=[];
for(const f of m.failures){
  const p=f.path;
  let candidates=[];
  if(p.startsWith('_sources/'))candidates=[path.join(upstream,p.slice(9).replace(/\.txt$/,''))];
  else if(p.startsWith('_images/')||p.startsWith('_downloads/'))candidates=paths.filter(x=>path.basename(x)===path.basename(p));
  else if(p.startsWith('_static/css/fonts/')){
    const name=path.basename(p);
    // Original theme embeds these unchanged font files.
    const url='https://raw.githubusercontent.com/readthedocs/sphinx_rtd_theme/1.3.0/sphinx_rtd_theme/static/css/fonts/'+name;
    const r=await fetch(url);if(r.ok){const b=Buffer.from(await r.arrayBuffer());const dest=path.join('.cache/original',p);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);m.files.push({path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),recoveredFrom:url});console.log('FONT '+name);continue;}
  }
  if(candidates.length===1){
    try{const b=await fs.readFile(candidates[0]);const dest=path.join('.cache/original',p);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);m.files.push({path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),recoveredFrom:candidates[0].replaceAll('\\','/')});console.log('RECOVERED '+p);continue;}catch{}
  }
  failures.push({...f,candidates});
}
m.failures=failures;
m.files.sort((a,b)=>a.path.localeCompare(b.path));
await fs.writeFile(file,JSON.stringify(m,null,2));
console.log('Remaining: '+JSON.stringify(failures,null,2));
