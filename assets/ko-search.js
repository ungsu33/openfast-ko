/* Static Korean / English full-text search; no external service or credentials. */
(()=>{
 const form=document.getElementById('ko-search'),input=document.getElementById('ko-query'),status=document.getElementById('ko-search-status'),results=document.getElementById('ko-search-results');
 if(!form)return;
 const normalize=s=>s.normalize('NFKC').toLowerCase();
 let index;
 async function run(q){
   input.value=q;results.replaceChildren();
   const terms=normalize(q).trim().split(/\s+/).filter(Boolean);
   if(!terms.length){status.textContent='검색어를 입력해 주세요.';return;}
   status.textContent='문서를 검색하고 있습니다…';
   try{
     index??=await fetch('_static/ko-search-index.json').then(r=>{if(!r.ok)throw Error('index');return r.json()});
     const ranked=index.map(doc=>{let title=normalize(doc.title),text=normalize(doc.text);let score=0;for(const term of terms){if(!text.includes(term)&&!title.includes(term))return null;score+=(title.includes(term)?30:0)+Math.min(20,text.split(term).length-1);}return {doc,score}}).filter(Boolean).sort((a,b)=>b.score-a.score);
     status.textContent=`검색 결과 ${ranked.length}개`;
     for(const {doc} of ranked){const li=document.createElement('li'),a=document.createElement('a'),p=document.createElement('p');a.href=doc.path;a.textContent=doc.title;let pos=normalize(doc.text).indexOf(terms[0]);let start=Math.max(0,pos-70);p.textContent=(start?'…':'')+doc.text.slice(start,start+260)+'…';li.append(a,p);results.append(li);}
     if(!ranked.length)status.textContent='검색 결과가 없습니다. 영문 모듈 이름이나 짧은 한국어 검색어로 다시 시도해 주세요.';
   }catch{status.textContent='검색 색인을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.';}
 }
 form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();history.replaceState(null,'','?'+new URLSearchParams({q}));run(q)});
 const q=new URLSearchParams(location.search).get('q');if(q)run(q);
})();
