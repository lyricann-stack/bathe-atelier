// lib-tub-basic-mobile.js — D1(2026-09-02)：Basic 手機版固定底部 CTA。basic.html、medium.html（M15b 2026-09-03）與 pro.html（S4-0d 2026-09-04）載入。
// 價格同步：不改 lib-tub-pricing.js（medium/pro 共用），改用 MutationObserver 監看 #fromTotal 的文字變化。
// S10b(2026-09-05)：Step 0–3 顯示起價、Step 4 顯示實價（M1=b）
(function(){
  const cta = document.getElementById('mobileCta');
  const priceEl = document.getElementById('mobileCtaPrice');
  const src = document.getElementById('fromTotal');
  if(!cta || !priceEl || !src) return;

  // S10b：BASE＝頁面預設規格的起價文字（#fromTotal 第一次出現含數字的文字），原樣沿用。
  let BASE = null;
  const captureBase = (text) => { if(BASE === null && /\d/.test(text)) BASE = text; };
  captureBase(src.textContent);

  const stepsEnabled = window.PAGE_STEPS === true;
  const isSummary = () => {
    const ss = window.StudioSteps;
    if(!stepsEnabled || !ss || typeof ss.current !== 'function' || typeof ss.steps !== 'function') return false;
    const steps = ss.steps();
    return ss.current() === steps[steps.length - 1];
  };

  const sync = () => {
    captureBase(src.textContent);
    if(!stepsEnabled){
      // 沒有 StudioSteps／PAGE_STEPS 未啟用：維持原本全程鏡射
      priceEl.textContent = src.textContent;
      return;
    }
    priceEl.textContent = isSummary() ? src.textContent : (BASE !== null ? BASE : src.textContent);
  };
  sync();
  new MutationObserver(sync).observe(src, { childList:true, characterData:true, subtree:true });

  // 步驟切換重新同步：本檔在 lib-studio-steps.js 之前載入，此時 window.StudioSteps 尚不存在，
  // 不监听其方法；改監聽 lib-studio-steps.js 的 go() 內既有派發的 'studiostep' CustomEvent
  // （next()/back()/dots/hashchange/revealSub 最終都經過 go()，故都會觸發），不需侵入包一層 go。
  window.addEventListener('studiostep', sync);
  // 深連結／初次載入即落在非 Step 0 的情況（此時尚無 'studiostep' 事件可觸發）：
  // 等 DOM 解析完（lib-studio-steps.js 屆時已同步執行完成、StudioSteps 已就緒）再補跑一次。
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', sync, { once:true });
  } else {
    sync();
  }
})();
function mobileCtaGo(){
  const btn = document.getElementById('quoteBtn'), em = document.getElementById('custEmail');
  if(!btn) return;
  btn.scrollIntoView({ behavior:'smooth', block:'center' });
  if(em && !em.value.trim()){ setTimeout(() => { em.scrollIntoView({ behavior:'smooth', block:'center' }); em.focus(); }, 450); }
}
