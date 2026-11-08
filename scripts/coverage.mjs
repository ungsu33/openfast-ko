import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';
try{await fs.access('.cache/search-original.json');}catch{await import('./restore-cache.mjs');}
const si=JSON.parse(await fs.readFile('.cache/search-original.json','utf8'));
const cache={...JSON.parse(await fs.readFile('translations/machine.json','utf8')),...JSON.parse(await fs.readFile('translations/overrides.json','utf8'))};
const norm=s=>s.replace(/\s+/g,' ').trim();
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const t=s=>cache[norm(s)]||norm(s);
const skip='script,style,pre,code,.math,.highlight,.notranslate,.headerlink,.section-number';
function walk($,el){if(el.type==='text'){const s=norm(el.data);if(cache[s])el.data=cache[s];return;}if(el.name&&$(el).is(skip))return;for(const ch of el.children||[])walk($,ch);}
const pages=[];
for(const name of si.docnames){
 const $=cheerio.load(await fs.readFile('.cache/original/'+name+'.html','utf8'));
 const b=$('[itemprop="articleBody"]');
 const metadata={path:name+'.html',tables:b.find('table').length,figures:b.find('img').length,math:b.find('.math').length,codeBlocks:b.find('pre').length,originalCharacters:b.text().length};
 walk($,b[0]);b.find('.headerlink,style').remove();
 pages.push({...metadata,title:norm(b.find('h1').first().text()),headings:b.find('h2,h3').map((_,el)=>norm($(el).text())).get(),intro:norm(b.find('p').not('.admonition-title').slice(0,2).text()).slice(0,1500),warnings:b.find('.admonition').map((_,el)=>norm($(el).text())).get()});
}
const totals=pages.reduce((a,x)=>{for(const k of ['tables','figures','math','codeBlocks','originalCharacters'])a[k]+=x[k];return a;},{tables:0,figures:0,math:0,codeBlocks:0,originalCharacters:0});
let html=`<h1>전체 문서·번역 범위</h1><p>OpenFAST v5.0.0 main 검색 색인에 등록된 <strong>${pages.length}개 문서</strong>를 기준으로 만든 전수 구조 검토 목록입니다. 아래 각 항목을 펼치면 원문의 도입부·절 구성·주의문을 한국어로 확인할 수 있습니다. 도입부는 페이지 식별을 위한 발췌이며 전체 번역은 제목 링크에서 읽을 수 있습니다.</p><p>본문 기준 집계: 표 ${totals.tables}개, 그림 참조 ${totals.figures}개, 인라인·블록 수식 요소 ${totals.math}개, 코드 블록 ${totals.codeBlocks}개. 그림 참조 수는 고유 이미지 파일 수와 다릅니다.</p><div class="ko-review-callout"><strong>범위 구분</strong><ul><li>HTML 설명·제목·탐색 메뉴를 자동번역하고 주요 용어·누락 구절을 보정했습니다.</li><li>수식·명령어·입력 예제·기술 식별자·그림 내부 글자·PDF·DOCX·원문 RST는 보존했습니다.</li><li>외부 사이트와 dev·이전 릴리스의 문서는 링크만 유지합니다.</li><li>모든 페이지에 대한 전문 감수나 OpenFAST 실행 검증을 의미하지 않습니다.</li></ul></div><p><a href="review.html">기술 리뷰</a> · <a href="reports/source-manifest.json">수집·파일 해시</a> · <a href="reports/verification.json">보존·링크 검증 결과</a> · <a href="reports/translation-effective.json">번역 적용 현황</a></p><div class="ko-inventory">`;
for(const [i,p] of pages.entries()){
 html+=`<details id="page-${i+1}"><summary>${i+1}. ${esc(p.title)}</summary><p><a href="${p.path}">전체 한국어 문서 열기</a> · <a href="https://openfast.readthedocs.io/en/main/${p.path==='index.html'?'':p.path}" target="_blank" rel="noopener">영문 원문</a></p><p class="ko-meta">표 ${p.tables} · 그림 ${p.figures} · 수식 요소 ${p.math} · 코드 블록 ${p.codeBlocks} · 원문 본문 ${p.originalCharacters.toLocaleString()}자</p><p>${esc(p.intro)}${p.intro.length>=1500?'…':''}</p>`;
 if(p.headings.length)html+='<p><strong>포함된 절</strong></p><ul>'+p.headings.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
 if(p.warnings.length)html+='<p><strong>원문 주의문·경고·팁</strong></p>'+p.warnings.map(x=>`<blockquote><p>${esc(x)}</p></blockquote>`).join('');
 html+='</details>';
}
html+='</div>';
await fs.mkdir('content',{recursive:true});await fs.writeFile('content/coverage.html',html);
await fs.writeFile('reports/page-inventory.json',JSON.stringify({date:'2026-11-08',pages:pages.length,totals,inventory:pages},null,2));
const catalog=JSON.parse(await fs.readFile('.cache/catalog.json','utf8'));
const remaining=catalog.filter(k=>!cache[k]);
await fs.writeFile('reports/translation-effective.json',JSON.stringify({catalogStrings:catalog.length,translatedOrReviewed:catalog.length-remaining.length,remaining,method:'Google Translate gtx + manual heading/terminology/fragment overrides; standalone technical identifiers retained',manualOverrides:Object.keys(JSON.parse(await fs.readFile('translations/overrides.json','utf8'))).length,professionalFullTextReview:false,binaryAttachmentsTranslated:false,externalSitesTranslated:false},null,2));
console.log(JSON.stringify({pages:pages.length,totals,remaining:remaining.length}));
