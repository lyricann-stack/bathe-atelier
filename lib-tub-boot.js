// lib-tub-boot.js 頁面啟動：網址參數／語言接線／初始建模＋主迴圈 — 由 customize.html 抽出（行 3190-3261），逐字保留；wizard 開啟加 guard。
// 支援網址參數：?preset=photo 照片款；?phi/theta 視角；?lang 語言；
// 任意設計參數可由網址覆寫（如 ?shape=stadium&L=1600&color=2b2b2b&rim=bevel）；
// ?clean=1 攝影棚模式：隱藏介面/格線，背景米白，供擷取產品渲染圖
const q = new URLSearchParams(location.search);
if(q.get('preset') === 'photo') applyPhotoPreset();
['L','W','H','t','b','r','dH','egg','taper','arc','slope','wallR','wallR2','wallMid','skirtH','waistK','skirtR',
 'lip','obL','obW','ibL','ibW','riL','riW','roL','roW','ovfDrop'].forEach(k=>{ if(q.get(k) !== null) P[k] = +q.get(k); });
if(q.get('skirt') !== null) P.skirt = q.get('skirt') === '1';
if(q.get('ovf') !== null) P.ovf = q.get('ovf') === '1';
['shape','rim','drain'].forEach(k=>{ if(q.get(k)) P[k] = q.get(k); });
if(q.get('undercut') !== null) P.undercut = q.get('undercut') === '1';
if(q.get('wallMode') && ['factory','curve','arc','s'].includes(q.get('wallMode'))) P.wallMode = q.get('wallMode');
else if(q.get('wallArc') === '1') P.wallMode = 'arc';
if(q.get('color')) P.color = '#' + q.get('color').replace('#','');
if(q.get('water')) P.water = q.get('water') === '1';
sanitizeBase();   // 網址參數也不得違反外>內缸底
syncUI();
if(q.get('phi')) orbit.phi = +q.get('phi');
if(q.get('theta')) orbit.theta = +q.get('theta');
if(q.get('zoom')) orbit.radius = +q.get('zoom');
if(q.get('clean') === '1'){
  const cream = 0xf4f1ea;
  scene.background = new THREE.Color(cream);
  floor.visible = false;
  grid.visible = false;
  const hd = document.querySelector('header');
  if(hd) hd.style.display = 'none';
  document.getElementById('panel').style.display = 'none';
  document.getElementById('hint').style.display = 'none';
  window._noHandles = true;
}
// ?shot=檔名：渲染穩定後輸出 canvas 高解析 PNG（產品渲染圖批次輸出用）
// 優先 POST 到本機收檔伺服器（開發批次用），失敗則觸發瀏覽器下載
if(q.get('shot')){
  setTimeout(()=>{
    resize(); updateCamera(); renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    fetch('http://localhost:8124/save?name=' + encodeURIComponent(q.get('shot')), { method:'POST', body: dataURL })
      .then(r=>{ document.title = 'SHOT_SAVED_' + q.get('shot'); })
      .catch(()=>{
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = q.get('shot') + '.png';
        a.click();
      });
  }, 1200);
}
collectI18nNodes();
// 語言與站上同步：讀取全站的 site_lang（en/zh/th），th 目前以英文顯示設計器內容
const SITE2LAB = { en:'en', zh:'zhS', th:'th' };
let siteLang = 'en';
try { siteLang = localStorage.getItem('site_lang') || 'en'; } catch(e){}
if(!['en','zh','th'].includes(siteLang)) siteLang = 'en';
const ql = q.get('lang');
LANG = ['zhT','zhS','en','th'].includes(ql) ? ql : (SITE2LAB[siteLang] || 'en');
const langSel = document.getElementById('langSel');
if(langSel){
  langSel.value = siteLang;
  langSel.addEventListener('change', ()=>{
    try {
      localStorage.setItem('site_lang', langSel.value);
      document.cookie = 'site_lang=' + langSel.value + ';path=/;max-age=31536000';
    } catch(e){}
    LANG = SITE2LAB[langSel.value] || 'en';
    applyLang();
  });
}
// ?wizard=1 → 開啟引導設計視窗（分享連結用）；basic.html 以 window.PAGE_AUTO_WIZARD=true 進站即開
if((q.get('wizard') === '1' || window.PAGE_AUTO_WIZARD) && typeof openWizard === 'function') openWizard();
applyLang();
buildTub();
animate();
