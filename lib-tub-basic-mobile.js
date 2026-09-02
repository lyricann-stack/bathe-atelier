// lib-tub-basic-mobile.js — D1(2026-09-02)：Basic 手機版固定底部 CTA。basic.html 與 medium.html 載入（M15b 2026-09-03）。
// 價格同步：不改 lib-tub-pricing.js（medium/pro 共用），改用 MutationObserver 監看 #fromTotal 的文字變化。
(function(){
  const cta = document.getElementById('mobileCta');
  const priceEl = document.getElementById('mobileCtaPrice');
  const src = document.getElementById('fromTotal');
  if(!cta || !priceEl || !src) return;
  const sync = () => { priceEl.textContent = src.textContent; };
  sync();
  new MutationObserver(sync).observe(src, { childList:true, characterData:true, subtree:true });
})();
function mobileCtaGo(){
  const btn = document.getElementById('quoteBtn'), em = document.getElementById('custEmail');
  if(!btn) return;
  btn.scrollIntoView({ behavior:'smooth', block:'center' });
  if(em && !em.value.trim()){ setTimeout(() => { em.scrollIntoView({ behavior:'smooth', block:'center' }); em.focus(); }, 450); }
}
