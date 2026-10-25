/*! © 2026 Cephionix Software Developer (OPC) Pvt. Ltd. All rights reserved. Proprietary: no copying or reuse without written permission. hello@cephionix.com */
const products={neural:{name:'NeuralWings',tag:'AVIATION MANAGEMENT',headline:'A connected flight academy.',description:'Bring flight operations, fleet management, training records and administration into one platform. NeuralWings helps flight training organisations coordinate the work behind every flight.',chips:['Flight operations','Fleet & maintenance','Student management','AI scheduling'],image:'neural-art.webp',alt:'Original NeuralWings flight academy and AI operations illustration',url:'https://neuralwings.org/',cta:'Explore NeuralWings'},earn:{name:'EarnWings',tag:'PILOT LEARNING',headline:'From cadet to captain.',description:'A dedicated learning platform for aspiring pilots. Explore DGCA exam preparation, ground learning, mock exams and flight-planning tools in one place.',chips:['Ground learning','Exam preparation','Flight planning','Pilot tools'],image:'earn-art.webp',alt:'Original EarnWings pilot learning illustration',url:'https://earnwings.org/',cta:'Explore EarnWings'},navcalc:{name:'NavCalc',tag:'IN DEVELOPMENT · COMING SOON',headline:'Precision. Wherever you go.',description:'An aviation calculator bringing 100+ calculations and approximately 25 instruments together. An app and a dedicated exam edition are in development.',chips:['100+ calculations','~25 instruments','App edition','Exam edition planned'],image:'navcalc-art.webp',alt:'NavCalc blue aviation calculator concept',url:'#contact',cta:'Enquire about NavCalc'}};
products.crm={name:'CRM & dashboards',tag:'CUSTOM SOFTWARE / BUILT TO YOUR BRIEF',headline:'A clearer view of your business.',description:'Bring customer relationships, sales pipelines, follow-ups and everyday operations into a system designed for your team. We build custom dashboards and CRMs around the way your business works.',chips:['Lead management','Sales pipelines','Team workflows','Business dashboards'],image:'crm-cutout.webp',alt:'Concept illustration of a custom CRM and business dashboard',url:'#contact',cta:'Plan your custom system'};
const PRODUCT_ORDER=['neural','earn','navcalc','crm'];const panel=document.querySelector('#product-panel');function selectProduct(key,scroll=false){const p=products[key];document.querySelectorAll('.swipe-dots i').forEach((d,i)=>d.classList.toggle('on',PRODUCT_ORDER[i]===key));document.querySelectorAll('[data-product]').forEach(b=>{const active=b.dataset.product===key;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1});panel.innerHTML=`<div class="product-visual original-art ${key==='crm'?'crm-cutout':''}" data-key="${key}"><img src="assets/${p.image}" alt="${p.alt}" loading="lazy"><span class="art-label">${p.name}<small>${key==='navcalc'?'IN DEVELOPMENT':key==='crm'?'SERVICE CONCEPT':'PRODUCT ILLUSTRATION'}</small></span></div><div class="product-content"><span class="tag">${p.tag}</span><h3>${p.headline}</h3><p>${p.description}</p><div class="chips">${p.chips.map(c=>`<span>${c}</span>`).join('')}</div><a class="pill blue" href="${p.url}" ${!['navcalc','crm'].includes(key)?'target="_blank" rel="noopener noreferrer"':''}>${p.cta} <span><ar-g>↗</ar-g><svg class="ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 22 22 2M11 2.2H22V13"/></svg></span></a>${key==='navcalc'?'<p class="form-note">Product visuals are concepts. Exam acceptance is subject to the relevant examining authority.</p>':''}</div>`;if(['navcalc','crm'].includes(key))panel.querySelector('a').onclick=()=>document.querySelector('[name=interest]').value=key==='crm'?'CRM development':'NavCalc launch updates';if(scroll)document.querySelector('#products').scrollIntoView({behavior:reduced?'instant':'smooth'})}const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;selectProduct('neural');document.querySelectorAll('[data-select]').forEach(b=>b.onclick=e=>{e.preventDefault();selectProduct(b.dataset.select,true)});document.querySelectorAll('[data-product]').forEach((b,i,arr)=>{b.onclick=()=>selectProduct(b.dataset.product);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?arr.length-1:(i+(e.key==='ArrowRight'?1:arr.length-1))%arr.length;arr[n].click();arr[n].focus()}}});let paused=reduced;const toggle=document.querySelector('.motion-toggle');function motion(){document.body.classList.toggle('paused',paused);toggle.setAttribute('aria-pressed',paused);toggle.textContent=paused?'Resume motion':'Pause motion'}motion();toggle.onclick=()=>{paused=!paused;motion()};document.querySelectorAll('[data-service]').forEach(a=>a.onclick=()=>document.querySelector('[name=interest]').value=a.dataset.service);document.querySelector('#year').textContent=new Date().getFullYear();const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.section-heading,.services article,.process,.contact>div').forEach(el=>{el.classList.add('reveal');observer.observe(el)});

// Progressive word reveal follows scroll position, including when scrolling back.
const story=document.querySelector('.about-grid');
const revealWords=[];
story.querySelectorAll('h2,p').forEach(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{const fragment=document.createDocumentFragment();node.textContent.split(/(\s+)/).forEach(word=>{if(!word.trim())fragment.append(document.createTextNode(word));else{const span=document.createElement('span');span.className='scroll-word';span.textContent=word;fragment.append(span);revealWords.push(span)}});node.replaceWith(fragment)})});
let scheduled=false;function updateStory(){scheduled=false;const box=story.getBoundingClientRect(),vh=innerHeight,N=revealWords.length,W=Math.min(10,N);const p=Math.max(0,Math.min(1,(vh*.8-box.top)/(box.height+vh*.25))),lead=p*(N+W);revealWords.forEach((word,i)=>{const t=reduced||paused?1:Math.max(0,Math.min(1,(lead-i)/W));word.style.opacity=.28+.72*t;const c=Math.round(135*(1-t));word.style.color=`rgb(${c},${c},${c})`})}addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateStory)}},{passive:true});addEventListener('resize',updateStory);toggle.addEventListener('click',updateStory);updateStory();
const sticker=document.querySelector('.sticker');sticker.addEventListener('pointermove',e=>{if(reduced||paused)return;const b=sticker.getBoundingClientRect();sticker.style.setProperty('--mx',((e.clientX-b.left-b.width/2)*.12)+'px');sticker.style.setProperty('--my',((e.clientY-b.top-b.height/2)*.18)+'px')});sticker.addEventListener('pointerleave',()=>{sticker.style.setProperty('--mx','0px');sticker.style.setProperty('--my','0px')});

const opening=document.querySelector('#opening');let introClosed=false;function splitIntro(){const content=opening.querySelector('.opening-content'),holder=opening.querySelector('.opening-panels');if(!content||!holder)return;for(let i=0;i<5;i++){const op=document.createElement('div');op.className='op';op.style.setProperty('--i',i);const inner=content.cloneNode(true);inner.className='op-inner';inner.setAttribute('aria-hidden','true');inner.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));inner.querySelectorAll('button').forEach(n=>n.tabIndex=-1);op.appendChild(inner);holder.appendChild(op)}opening.classList.add('is-split');requestAnimationFrame(()=>requestAnimationFrame(()=>holder.classList.add('go')))}
function closeIntro(){if(introClosed)return;introClosed=true;splitIntro();document.documentElement.classList.remove('intro-pending');document.documentElement.classList.add('intro-ready');opening.setAttribute('aria-hidden','true');opening.inert=true;setTimeout(()=>opening.remove(),1900)}
document.querySelector('#skip-intro').onclick=closeIntro;
if(window.__skipIntro){introClosed=true;opening.remove()}else if(reduced||location.hash){closeIntro()}else{const assetReady=Promise.all([...document.querySelectorAll('header img,.hero img')].map(img=>img.decode?.().catch(()=>{})||Promise.resolve()));Promise.all([assetReady,new Promise(resolve=>setTimeout(resolve,3800))]).then(closeIntro);setTimeout(closeIntro,6000);setTimeout(()=>{if(!introClosed)document.querySelector('#opening-status').textContent='Shaping what comes next'},2000)}

// Each linked project name reveals as it enters the viewport.
const nameRows=document.querySelectorAll('.project-name-row');
const nameObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('name-in-view',entry.isIntersecting)}),{threshold:.18});
nameRows.forEach(row=>nameObserver.observe(row));


/* Phone: swipe the product panel left/right to move between products */
(function(){const panel=document.querySelector('#product-panel');if(!panel)return;let sx=0,sy=0,tracking=false;
const cur=()=>document.querySelector('.tabs [aria-selected=true]')?.dataset.product||'neural';
function go(dir){const i=PRODUCT_ORDER.indexOf(cur());const k=PRODUCT_ORDER[(i+dir+PRODUCT_ORDER.length)%PRODUCT_ORDER.length];selectProduct(k,false);panel.classList.remove('swipe-next','swipe-prev');void panel.offsetWidth;panel.classList.add(dir>0?'swipe-next':'swipe-prev')}
panel.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;tracking=true},{passive:true});
panel.addEventListener('touchend',e=>{if(!tracking)return;tracking=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)go(dx<0?1:-1)},{passive:true});
document.querySelectorAll('.swipe-dots i').forEach((d,i)=>d.addEventListener('click',()=>selectProduct(PRODUCT_ORDER[i],false)));
})();


/* Enquiry form: sends through the Google Apps Script web app (see apps-script/SETUP.md).
   While ENQUIRY_ENDPOINT is empty it falls back to opening the visitor's email app. */
const ENQUIRY_ENDPOINT='https://script.google.com/macros/s/AKfycby3YuJfXSCsvXGOA94hpDAX_bxrOlPXsiEnzT_S8ihQ7KooeReSw82uOOeFTeqlTnw1/exec';
(function(){
const form=document.querySelector('#enquiry');if(!form)return;
const endpoint=window.CX_ENQUIRY_ENDPOINT||ENQUIRY_ENDPOINT;
const status=document.querySelector('#form-status'),btn=form.querySelector('button[type=submit]'),note=form.querySelector('.form-note');
const opened=Date.now();
if(endpoint){
  const hp=document.createElement('input');hp.type='text';hp.name='website';hp.tabIndex=-1;hp.autocomplete='off';hp.setAttribute('aria-hidden','true');hp.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;opacity:0';form.appendChild(hp);
  const lead=btn.firstChild;if(lead&&lead.nodeType===3)lead.textContent='Send enquiry ';
  if(note)note.textContent='We reply within 1\u20132 working days, and a confirmation is sent to your email.';
}
function say(kind,text,html){status.className=kind||'';if(html)status.innerHTML=html;else status.textContent=text}
form.onsubmit=async e=>{
  e.preventDefault();
  const data=new FormData(form);
  if(!endpoint){
    const subject=`CEPHIONIX enquiry: ${data.get('interest')}`,body=`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nInterest: ${data.get('interest')}\n\n${data.get('message')}`;
    location.href=`mailto:hello@cephionix.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('', 'Your email draft is ready to open. If your email app did not open, email hello@cephionix.com directly. Your enquiry has not been sent yet.');
    return;
  }
  const name=String(data.get('name')||'').trim(),email=String(data.get('email')||'').trim();
  btn.disabled=true;btn.setAttribute('aria-busy','true');say('', 'Sending\u2026');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),25000);
  try{
    const res=await fetch(endpoint,{method:'POST',body:new URLSearchParams({name,email,interest:String(data.get('interest')||''),message:String(data.get('message')||''),website:String(data.get('website')||''),ts:String(opened)}),signal:ctrl.signal});
    const out=await res.json();
    if(!out||!out.ok)throw new Error(out&&out.error||'failed');
    say('ok',`Thank you, ${name.split(/\s+/)[0]}. Your enquiry is on its way, and a confirmation has been sent to ${email}.`);
    form.reset();
  }catch(err){
    say('err','',err&&err.message==='busy'?'We\u2019re receiving a lot of enquiries right now. Please try again shortly, or email <a href="mailto:hello@cephionix.com">hello@cephionix.com</a>.':'We couldn\u2019t send that just now. Please try again, or email <a href="mailto:hello@cephionix.com">hello@cephionix.com</a>.');
  }finally{clearTimeout(timer);btn.disabled=false;btn.removeAttribute('aria-busy')}
};
})();
