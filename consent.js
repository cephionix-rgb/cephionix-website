/*! © 2026 Cephionix Software Developer (OPC) Pvt. Ltd. All rights reserved. Proprietary: no copying or reuse without written permission. hello@cephionix.com */
(function(){
var KEY='cx-consent';
function get(){try{return localStorage.getItem(KEY)}catch(e){return null}}
function set(v){try{localStorage.setItem(KEY,v)}catch(e){}}
function apply(v){if(typeof gtag==='function')gtag('consent','update',{analytics_storage:v});}
var box;
function close(){if(box){box.classList.remove('show');var b=box;setTimeout(function(){b.remove()},400);box=null}}
function choose(v){set(v);apply(v);close()}
function open(){
  if(box)return;
  box=document.createElement('div');
  box.className='cookie-banner';
  box.setAttribute('role','dialog');
  box.setAttribute('aria-label','Cookie preferences');
  box.innerHTML='<b>COOKIES</b><p>We use Google Analytics cookies to understand how visitors use this site. They stay off unless you accept. <a href="/privacy#policy-6">Read more</a></p><div><button type="button" class="cookie-accept">Accept</button><button type="button" class="cookie-decline">Decline</button></div>';
  document.body.appendChild(box);
  box.querySelector('.cookie-accept').addEventListener('click',function(){choose('granted')});
  box.querySelector('.cookie-decline').addEventListener('click',function(){choose('denied')});
  requestAnimationFrame(function(){requestAnimationFrame(function(){box&&box.classList.add('show')})});
}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-cookie-settings]');if(t){e.preventDefault();open()}});
if(!get()){var intro=document.getElementById('opening');setTimeout(open,intro?5200:1200)}
})();
