import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const RAW='.cache/original', OUT='docs', BASE='https://openfast.readthedocs.io/en/main/';
try{await fs.access('.cache/original/index.html');}catch{await import('./restore-cache.mjs');}
const cache=JSON.parse(await fs.readFile('translations/machine.json','utf8'));
const glossary=JSON.parse(await fs.readFile('translations/overrides.json','utf8'));
Object.assign(cache,glossary);
const skip='script,style,pre,code,kbd,samp,math,.math,.highlight,.notranslate,.headerlink,.section-number,.eqno,.citation-reference,.footnote-reference';
const normalize=s=>s.replace(/\s+/g,' ').trim();
const brands=new Set(['OpenFAST','AeroDyn','OLAF','AeroDisk','BeamDyn','SubDyn','ExtPtfm','ElastoDyn','HydroDyn','SeaState','InflowWind','MoorDyn','ServoDyn','TurbSim','FAST.Farm','Simulink','WaveTank']);
function lookup(key){const m=key.match(/^(\d+(?:\.\d+)*\.?\s+)(.+)$/);if(m){if(brands.has(m[2]))return m[1]+m[2];if(glossary[m[2]])return m[1]+glossary[m[2]];}return cache[key];}
const counts={pages:0,textNodes:0,translated:0,unchanged:0};
const search=[];
async function all(dir){let a=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())a.push(...await all(p));else a.push(p);}return a.sort();}
const files=await all(RAW);const known=new Set(files.map(p=>path.relative(RAW,p).replaceAll('\\','/')));
known.add('_static/ko.css');known.add('_static/ko-search.js');known.add('_static/ko-search-index.json');
await fs.mkdir(OUT,{recursive:true});
await fs.cp(RAW,OUT,{recursive:true});
function translate($,el){
  if(el.type==='text'){
    const key=normalize(el.data);
    // Standalone technical identifiers also occur in strong/em/table cells.
    if(/^[A-Za-z][A-Za-z0-9_.:+()\-]*$/.test(key)&&(/_|[a-z][A-Z]/.test(key)||/^[A-Z0-9_]{2,}$/.test(key)))return;
    if(lookup(key)){const leading=el.data.match(/^\s*/)[0],trailing=el.data.match(/\s*$/)[0];el.data=leading+lookup(key)+trailing;counts.translated++;}
    counts.textNodes++;return;
  }
  if(el.type==='comment'||(el.name&&$(el).is(skip+', [role="contentinfo"]')))return;
  for(const ch of el.children||[])translate($,ch);
}
for(const file of files.filter(p=>p.endsWith('.html'))){
  const rel=path.relative(RAW,file).replaceAll('\\','/');
  const $=cheerio.load(await fs.readFile(file,'utf8'));
  translate($,$.root()[0]);
  for(const el of $('[title],[alt],[placeholder],[aria-label]').toArray())for(const attr of ['title','alt','placeholder','aria-label']){
    const v=$(el).attr(attr);if(v&&cache[normalize(v)])$(el).attr(attr,cache[normalize(v)]);
  }
  $('html').attr('lang','ko');
  $('head').prepend('<!-- Modified 2026-11-08: unofficial Korean machine translation of OpenFAST 5.0.0. Equations, code, figures, input values and attribution retained. -->\n');
  // Remove upstream analytics and Read the Docs runtime injections from this independent mirror.
  $('script[src*="readthedocs-addons"],script[src*="googletagmanager"],meta[name^="readthedocs-"]').remove();
  $('script:not([src])').each((_,el)=>{if(/gtag\(|google-analytics|dataLayer/.test($(el).html()||''))$(el).remove();});
  // The original cdn.mathjax.org endpoint is retired; keep the compatible 2.x renderer pinned.
  $('script[src*="cdn.mathjax.org"]').attr('src','https://cdn.jsdelivr.net/npm/mathjax@2.7.9/MathJax.js?config=TeX-AMS-MML_HTMLorMML');
  const prefix=path.posix.relative(path.posix.dirname(rel),'.')||'.';
  const rootLink=p=>(prefix==='.'?'':prefix+'/')+p;
  $('head').append(`<link rel="stylesheet" href="${rootLink('_static/ko.css')}"><link rel="canonical" href="https://ungsu33.github.io/openfast-ko/${rel==='index.html'?'':rel}">`);
  $('link[rel="canonical"]').slice(0,-1).remove();
  $('[href],[src]').each((_,el)=>{
    for(const attr of ['href','src']){
      const ref=$(el).attr(attr);if(!ref||/^(data:|javascript:|mailto:|#)/.test(ref))continue;
      const url=new URL(ref,BASE+rel);
      if(url.href.startsWith(BASE)){
        let dest=decodeURIComponent(url.pathname.slice(new URL(BASE).pathname.length));if(!dest||dest.endsWith('/'))dest+='index.html';
        if(known.has(dest))$(el).attr(attr,(path.posix.relative(path.posix.dirname(rel),dest)||path.posix.basename(dest))+url.search+url.hash);
        else $(el).attr(attr,url.href);
      }else if(ref.startsWith('/'))$(el).attr(attr,url.href);
    }
    if(el.name==='a'&&/^https?:/.test($(el).attr('href')||''))$(el).attr('target','_blank').attr('rel','noopener noreferrer');
  });
  $('.wy-side-nav-search .version').text('5.0 · 한국어');
  $('.wy-menu-vertical').append(`<ul class="ko-tools"><li><a href="${rootLink('review.html')}">문서 상세 리뷰</a></li><li><a href="${rootLink('coverage.html')}">전체 문서·번역 범위</a></li><li><a href="https://github.com/ungsu33/openfast-ko" target="_blank" rel="noopener noreferrer">GitHub 소스</a></li></ul>`);
  $('.rst-content > [role="navigation"]').first().after(`<aside class="ko-notice" aria-label="한국어 번역 안내"><strong>한국어 자동번역</strong> · OpenFAST v5.0.0 · 2026-11-08 기준<br>비공식 번역본입니다. 수식·명령어·입력 변수와 첨부자료는 원문을 보존합니다. <a href="${BASE+(rel==='index.html'?'':rel)}" target="_blank" rel="noopener noreferrer" lang="en">영문 원문 대조 ↗</a></aside>`);
  const body=$('[itemprop="articleBody"]');
  if(rel==='search.html'){
    $('script[src*="searchtools"],script[src*="language_data"]').remove();
    $('script:not([src])').each((_,el)=>{if(/Search\.loadIndex|Search\.init|DOCUMENTATION_OPTIONS.*SEARCH/.test($(el).html()||''))$(el).remove();});
    body.html('<h1>문서 검색</h1><p>전체 한국어 문서의 제목과 본문을 검색합니다. 한국어·영문 모듈 이름과 입력 변수 이름을 사용할 수 있습니다.</p><form id="ko-search"><label for="ko-query">검색어</label><div class="ko-search-row"><input id="ko-query" name="q" type="search" placeholder="예: HydroDyn, 선형화, 시간 간격" required><button type="submit">검색</button></div></form><p id="ko-search-status" role="status" aria-live="polite"></p><ol id="ko-search-results" class="search"></ol>');
    $('body').append(`<script src="${rootLink('_static/ko-search.js')}" defer></script>`);
  }else if(!['genindex.html'].includes(rel)){
    search.push({path:rel,title:body.find('h1').first().text().replace(//g,'').trim()||$('title').text(),text:normalize(body.text())});
  }
  await fs.writeFile(path.join(OUT,rel),$.html());counts.pages++;
}
// Added Korean review pages reuse the exact upstream Sphinx theme and page frame.
const template=await fs.readFile(path.join(OUT,'index.html'),'utf8');
for(const [name,title] of [['review','문서 상세 리뷰'],['coverage','전체 문서·번역 범위']]){
  const $=cheerio.load(template);
  $('title').text(title+' — OpenFAST 한국어 문서');
  $('link[rel="canonical"]').attr('href',`https://ungsu33.github.io/openfast-ko/${name}.html`);
  $('.breadcrumb-item.active').text(title);$('.wy-breadcrumbs-aside').remove();
  $('.ko-notice').html('<strong>번역·리뷰 부록</strong> · 원문과 구분되는 추가 자료입니다. 기술 리뷰는 원문 근거와 검토자의 해석을 구분합니다.');
  $('[itemprop="articleBody"]').html(await fs.readFile('content/'+name+'.html','utf8'));
  $('.rst-footer-buttons').remove();
  search.push({path:name+'.html',title,text:normalize($('[itemprop="articleBody"]').text())});
  await fs.writeFile(path.join(OUT,name+'.html'),$.html());
}
await fs.cp('assets',path.join(OUT,'_static'),{recursive:true});
await fs.writeFile(path.join(OUT,'_static/ko-search-index.json'),JSON.stringify(search));
await fs.writeFile(path.join(OUT,'.nojekyll'),'');
await fs.copyFile('LICENSE',path.join(OUT,'LICENSE'));
await fs.copyFile('NOTICE',path.join(OUT,'NOTICE'));
await fs.cp('licenses',path.join(OUT,'licenses'),{recursive:true});
await fs.mkdir(path.join(OUT,'reports'),{recursive:true});
await fs.cp('reports',path.join(OUT,'reports'),{recursive:true});
await fs.writeFile('reports/build-summary.json',JSON.stringify({...counts,addedPages:2,searchEntries:search.length},null,2));
console.log(JSON.stringify({...counts,addedPages:2,searchEntries:search.length}));
