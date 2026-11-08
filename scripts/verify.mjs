import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
try{await fs.access('.cache/original/index.html');}catch{await import('./restore-cache.mjs');}
const errors=[],warnings=[];const root=path.resolve('docs');
await fs.mkdir(path.join(root,'reports'),{recursive:true});
try{await fs.access(path.join(root,'reports/verification.json'));}catch{await fs.writeFile(path.join(root,'reports/verification.json'),'{}');}
const m=JSON.parse(await fs.readFile('reports/source-manifest.json','utf8'));
const indexed=JSON.parse(await fs.readFile('.cache/search-original.json','utf8')).docnames;
const docs=new Map();
async function all(dir){let a=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())a.push(...await all(p));else a.push(p);}return a;}
const paths=await all(root),exists=new Set(paths.map(x=>path.resolve(x)));
for(const p of paths.filter(x=>x.endsWith('.html')))docs.set(p,cheerio.load(await fs.readFile(p,'utf8')));
const stats={indexedDocuments:indexed.length,htmlPages:docs.size,checkedCodeElements:0,checkedMathElements:0,checkedTables:0,checkedFigures:0,checkedIds:0,checkedLinks:0,checkedBinaryAssets:0};
for(const name of indexed){
 const rel=name+'.html',orig=cheerio.load(await fs.readFile('.cache/original/'+rel,'utf8')),out=docs.get(path.resolve(root,rel));
 if(!out){errors.push({page:rel,type:'missing-page'});continue;}
 if(out('html').attr('lang')!=='ko')errors.push({page:rel,type:'language'});
 if(!out('.ko-notice').length)errors.push({page:rel,type:'missing-translation-notice'});
 for(const [selector,key] of [['pre,code,kbd,samp','checkedCodeElements'],['.math','checkedMathElements']]){
   const a=orig('[itemprop="articleBody"]').find(selector).map((_,e)=>orig(e).text()).get(),b=out('[itemprop="articleBody"]').find(selector).map((_,e)=>out(e).text()).get();
   stats[key]+=a.length;if(JSON.stringify(a)!==JSON.stringify(b))errors.push({page:rel,type:'changed-protected-content',selector});
 }
 for(const [selector,key] of [['table','checkedTables'],['img','checkedFigures'],['h1,h2,h3,h4,h5,h6','headings']]){
   const a=orig('[itemprop="articleBody"]').find(selector).length,b=out('[itemprop="articleBody"]').find(selector).length;
   if(key in stats)stats[key]+=a;if(a!==b)errors.push({page:rel,type:'changed-structure',selector,original:a,output:b});
 }
 for(const el of orig('[id]').toArray()){
   const id=orig(el).attr('id');stats.checkedIds++;
   if(!out('[id]').toArray().some(e=>out(e).attr('id')===id))errors.push({page:rel,type:'lost-anchor',id});
 }
}
for(const [p,$] of docs){
 if(/ZXQ\d+QXZ/.test($('body').text()))errors.push({page:path.relative(root,p),type:'translation-marker'});
 for(const e of $('[href],[src]').toArray())for(const attr of ['href','src']){
   const ref=$(e).attr(attr);if(!ref||/^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/.test(ref))continue;
   const u=new URL(ref,'http://local/'+path.relative(root,p).replaceAll('\\','/'));
   let target=decodeURIComponent(u.pathname);if(target.endsWith('/'))target+='index.html';target=path.resolve(root,'.'+target);
   stats.checkedLinks++;
   if(!exists.has(target)){errors.push({page:path.relative(root,p),type:'missing-local-target',ref});continue;}
   if(u.hash&&docs.has(target)){
     const id=decodeURIComponent(u.hash.slice(1)),other=docs.get(target);
     if(!other('[id]').toArray().some(x=>other(x).attr('id')===id)&&!other('[name]').toArray().some(x=>other(x).attr('name')===id))warnings.push({page:path.relative(root,p),type:'missing-anchor',ref});
   }
 }
}
for(const f of m.files.filter(x=>!x.path.endsWith('.html'))){
 const b=await fs.readFile(path.join(root,f.path));stats.checkedBinaryAssets++;
 if(crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)errors.push({type:'asset-hash-changed',path:f.path});
}
const report={date:'2026-11-08',passed:errors.length===0,stats,errors,warnings,upstreamUnavailable:m.failures,limits:['No OpenFAST executable simulations run','Machine translation is not a professional full-text technical review','Original images and binary attachments are not translated','External links are retained, not recursively mirrored','Missing upstream anchors are recorded as warnings, not silently rewritten']};
await fs.writeFile('reports/verification.json',JSON.stringify(report,null,2));
await fs.copyFile('reports/verification.json','docs/reports/verification.json');
console.log(JSON.stringify({passed:report.passed,stats,errors,warnings:warnings.length},null,2));
if(errors.length)process.exitCode=1;
