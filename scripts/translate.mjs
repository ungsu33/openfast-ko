import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';

const RAW='.cache/original';
const CATALOG='.cache/catalog.json';
const CACHE='.cache/translations.json';
const SKIP='script,style,pre,code,kbd,samp,math,.math,.highlight,.notranslate,.headerlink,.section-number,.eqno,.citation-reference,.footnote-reference';
const proper=/^(?:OpenFAST|FAST(?:\.Farm)?|AeroDyn|OLAF|AeroDisk|BeamDyn|SubDyn|ExtPtfm|ElastoDyn|HydroDyn|SeaState|InflowWind|MoorDyn|ServoDyn|TurbSim|NWTC|C\+\+|Fortran|Python|MATLAB|Simulink|CMake|GitHub|Sphinx|Read the Docs|[A-Za-z_]+\(\))$/;
const norm=s=>s.replace(/\s+/g,' ').trim();
const eligible=s=>/[A-Za-z]{2}/.test(s)&&!proper.test(s)&&!/^https?:\/\//.test(s)&&s.length>1;
const common={
  'OpenFAST Documentation':'OpenFAST 문서', 'This documentation':'이 문서에 대하여',
  'Installing OpenFAST':'OpenFAST 설치','Working with OpenFAST':'OpenFAST 사용하기',
  'User Documentation':'사용자 문서','Testing OpenFAST':'OpenFAST 테스트',
  'Developer Documentation':'개발자 문서','Licensing':'라이선스','Getting Help':'도움 받기',
  'Acknowledgements':'감사의 글','Documentation Directory':'문서 목차',
  'Search docs':'문서 검색','Search':'검색','Next':'다음','Previous':'이전',
  'View page source':'페이지 원문 소스 보기','Navigation menu':'탐색 메뉴',
  'Page navigation':'페이지 탐색','Mobile navigation menu':'모바일 탐색 메뉴',
  'Permalink to this heading':'이 제목의 고유 링크','Home':'홈','Footer':'하단 탐색',
  'Version':'버전','Date':'날짜','Mar 12, 2026':'2026년 3월 12일',
  'Introduction':'소개','Input Files':'입력 파일','Output Files':'출력 파일',
  'References':'참고문헌','Appendix':'부록','Future Work':'향후 개발 계획',
  'Coordinate systems':'좌표계','Modeling Considerations':'모델링 시 고려사항',
  'Unit tests':'단위 테스트','Regression tests':'회귀 테스트',
  'Glue Code':'글루 코드','General':'일반 사항','Code Style':'코드 스타일',
  'Input file formats':'입력 파일 형식','Known Limitations and Future Work':'알려진 한계와 향후 개발 계획',
  'AeroDyn Users Guide and Theory Manual':'AeroDyn 사용자 가이드 및 이론 설명서',
  'BeamDyn User Guide and Theory Manual':'BeamDyn 사용자 가이드 및 이론 설명서',
  'SubDyn User Guide and Theory Manual':'SubDyn 사용자 가이드 및 이론 설명서',
  'HydroDyn User Guide and Theory Manual':'HydroDyn 사용자 가이드 및 이론 설명서',
  'SeaState User Guide and Theory Manual':'SeaState 사용자 가이드 및 이론 설명서',
  'ElastoDyn Users Guide and Theory Manual':'ElastoDyn 사용자 가이드 및 이론 설명서',
  'InflowWind Users Guide and Theory Manual':'InflowWind 사용자 가이드 및 이론 설명서',
  'MoorDyn Users Guide':'MoorDyn 사용자 가이드','ServoDyn Users Guide':'ServoDyn 사용자 가이드',
  'TurbSim Users Guide Placeholder':'TurbSim 사용자 가이드 (원문의 임시 항목)',
  'FAST.Farm User’s Guide and Theory Manual':'FAST.Farm 사용자 가이드 및 이론 설명서',
  'OLAF User’s Guide and Theory Manual (Free Vortex Wake in AeroDyn)':'OLAF 사용자 가이드 및 이론 설명서 (AeroDyn의 자유 와류 후류)',
};
export function collect($,root,fn){
  function walk(el){
    if(el.type==='text'){const key=norm(el.data);if(eligible(key))fn(el,key);return;}
    if(el.type==='comment'||(el.name&&$(el).is(SKIP)))return;
    for(const c of el.children||[])walk(c);
  }
  walk(root);
}
async function filesIn(dir){let a=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())a.push(...await filesIn(p));else if(e.name.endsWith('.html'))a.push(p);}return a.sort();}
const files=await filesIn(RAW);
const set=new Set();
for(const p of files){const $=cheerio.load(await fs.readFile(p,'utf8'));collect($,$.root()[0],(_,key)=>set.add(key));for(const e of $('[title],[alt],[placeholder],[aria-label]').toArray())for(const a of ['title','alt','placeholder','aria-label']){const s=norm($(e).attr(a)||'');if(eligible(s))set.add(s);}}
const catalog=[...set];
await fs.writeFile(CATALOG,JSON.stringify(catalog,null,2));
let cache={};try{cache=JSON.parse(await fs.readFile(CACHE,'utf8'));}catch{try{cache=JSON.parse(await fs.readFile('translations/machine.json','utf8'));}catch{}}
Object.assign(cache,common);
// Numbered headings reuse the hand-checked glossary.
for(const key of catalog){const m=key.match(/^(\d+(?:\.\d+)*\.?\s+)(.+)$/);if(m&&common[m[2]])cache[key]=m[1]+common[m[2]];}
const pending=catalog.filter(x=>!cache[x]);
console.log(JSON.stringify({pages:files.length,strings:catalog.length,characters:catalog.reduce((a,x)=>a+x.length,0),pending:pending.length}));
const batches=[];let batch=[];let len=0;
for(const key of pending){if(len+key.length+20>3800&&batch.length){batches.push(batch);batch=[];len=0;}batch.push(key);len+=key.length+20;}
if(batch.length)batches.push(batch);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function translate(q){
  for(let attempt=0;attempt<7;attempt++){
    try{
      const url=new URL('https://translate.googleapis.com/translate_a/single');
      url.search=new URLSearchParams({client:'gtx',sl:'en',tl:'ko',dt:'t',q}).toString();
      const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
      if(!r.ok){const retry=r.headers.get('retry-after');throw new Error(`HTTP ${r.status}, retry-after=${retry}`);}
      const data=await r.json();if(!Array.isArray(data[0]))throw new Error('Invalid translation response');
      return data[0].map(x=>x[0]||'').join('');
    }catch(e){if(attempt===6)throw e;console.log('Translation retry: '+e.message);await sleep(Math.min(60000,3000*2**attempt));}
  }
}
function polish(s){return s.replace(/글루코드/g,'글루 코드').replace(/풍력 터빈/g,'풍력터빈').replace(/회귀 검사/g,'회귀 테스트').replace(/단위 검사/g,'단위 테스트');}
let completed=0;let ix=0;let errors=[];
let saveQueue=Promise.resolve();
function save(){saveQueue=saveQueue.then(()=>fs.writeFile(CACHE,JSON.stringify(cache,null,2)));return saveQueue;}
async function single(key){
  if(key.length>3500){let parts=key.match(/.{1,3000}(?:\s|$)|.{1,3000}/gs)||[key];let out=[];for(const p of parts)out.push(await translate(p));return polish(out.join(' '));}
  return polish(await translate(key));
}
async function worker(){
  while(ix<batches.length){
    const idx=ix++;const keys=batches[idx];
    try{
      if(keys.length===1){cache[keys[0]]=await single(keys[0]);}
      else{
        const q=keys.map((key,j)=>`ZXQ${String(j).padStart(4,'0')}QXZ ${key}`).join('\n');
        const out=await translate(q);
        const matches=[...out.matchAll(/ZXQ\s*(\d{4})\s*QXZ\s*/gi)];
        const valid=matches.length===keys.length&&matches.every((m,j)=>Number(m[1])===j&&out.slice(m.index+m[0].length,j+1<matches.length?matches[j+1].index:out.length).trim().length>0);
        if(valid){for(let j=0;j<keys.length;j++)cache[keys[j]]=polish(out.slice(matches[j].index+matches[j][0].length,j+1<matches.length?matches[j+1].index:out.length).trim());}
        else{console.log(`Batch ${idx}: marker validation failed; translating individually (${keys.length})`);for(const key of keys){cache[key]=await single(key);await sleep(150);}}
      }
      completed++;
      if(completed%5===0){await save();console.log(`Translated batches ${completed}/${batches.length}; strings ${Object.keys(cache).length}/${catalog.length}`);}
    }catch(e){errors.push({idx,message:String(e)});console.log('Batch failed '+idx+' '+e.message);}
    await sleep(600);
  }
}
await Promise.all([worker(),worker()]);
await save();
await fs.mkdir('translations',{recursive:true});
await fs.writeFile('translations/machine.json',JSON.stringify(cache,null,2));
await fs.mkdir('reports',{recursive:true});
await fs.writeFile('reports/translation-progress.json',JSON.stringify({engine:'Google Translate public endpoint (gtx)',method:'machine translation with validated numbered text-node batches and reviewed glossary',date:'2026-11-08',catalogStrings:catalog.length,translatedStrings:catalog.filter(x=>cache[x]).length,missing:catalog.filter(x=>!cache[x]),errors,cacheSha256:crypto.createHash('sha256').update(JSON.stringify(cache)).digest('hex')},null,2));
console.log('Translation finished: '+catalog.filter(x=>cache[x]).length+'/'+catalog.length);
