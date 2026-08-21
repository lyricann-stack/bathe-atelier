// ===================== lib-edit3d-ar-ui.js =====================
// Phase 8 M8-1b(2026-08-21)：「在你的空間查看」按鈕＋QR流程。
//
// 模型檔交付方式決策(規格書工作項3明列「實作時定」的待決事項)：選擇零後端、
// QR只帶設計參數不帶模型檔的混合方案——
// - iOS同機直接開：AR Quick Look吃blob: URL沒問題(同一個Safari分頁內產生的handoff)，
//   手機直接開pro.html點按鈕，前端當場生成usdz blob就能用，零後端
// - 跨裝置(桌機生成QR、手機掃)：QR裡放的不是模型檔，是這個設計的規格參數(JSON經
//   base64url編碼)+`ar=1`旗標，手機掃到後開pro.html帶著這組參數，頁面自動還原設計
//   (importSpecJSON)再讓手機自己當場生成blob——把「跨裝置」問題轉換成「先讓手機端
//   變成同機情境」，不用蓋一個檔案暫存/短鏈後端
//
// **已知限制(誠實記錄，不是遺漏)**：Android的Scene Viewer架構上一定要一個真正可被
// 抓取的https URL，不吃blob: URL——這個零後端方案只支援iOS/iPadOS。Android若要支援，
// 勢必需要真的暫存模型檔的後端(規格書選項b)，v1明確不做，留給之後有需求再評估。

function isIOSDevice(){
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS偽裝成Mac UA
}

// UTF-8安全的base64url編碼/解碼(設計參數含中文欄位名，btoa()原生不支援多位元組字元)
function b64urlEncode(str){
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g,'+').replace(/_/g,'/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}

// 只取設計參數(不含計算規格/客戶資訊)，縮小QR資料量
function buildShareSpecParam(){
  const full = JSON.parse(exportJSON(true).content);
  return b64urlEncode(JSON.stringify({ 設計參數: full.設計參數 }));
}
function buildShareURL(){
  return `${location.origin}${location.pathname}?spec=${buildShareSpecParam()}&ar=1`;
}

async function launchARSameDevice(){
  if(!isIOSDevice()){
    alert(t('AR preview currently supports iPhone/iPad — Android support is on our roadmap.'));
    return;
  }
  try {
    const { arrayBuffer } = await exportUSDZ(true);
    const blob = new Blob([arrayBuffer], {type:'model/vnd.usdz+zip'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('rel', 'ar');
    a.setAttribute('href', url);
    const img = document.createElement('img'); img.style.display = 'none';
    a.appendChild(img);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
  } catch(err){
    console.error(err);
    alert(t('Could not prepare the AR model for this design. Please try again.'));
  }
}

function renderShareQR(){
  const errEl = document.getElementById('arQrError');
  const imgEl = document.getElementById('arQrImg');
  errEl.style.display = 'none'; imgEl.style.display = 'block';
  try {
    const url = buildShareURL();
    const qr = qrcode(0, 'L');
    qr.addData(url);
    qr.make();
    imgEl.src = qr.createDataURL(6, 4);
  } catch(err){
    console.error(err);
    imgEl.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = t('This design is too complex to share as a QR code — try a simpler shape, or browse this page directly on your iPhone.');
  }
}

function openARPreview(){
  document.getElementById('arModal').style.display = 'flex';
  const ios = isIOSDevice();
  document.getElementById('arIOSPanel').style.display = ios ? 'block' : 'none';
  document.getElementById('arDesktopPanel').style.display = ios ? 'none' : 'block';
  if(!ios) renderShareQR();
}
function closeARPreview(){
  document.getElementById('arModal').style.display = 'none';
}

// 頁面載入時檢查?spec=...&ar=1：掃碼進來的手機，自動還原設計後直接跳AR，不用使用者再找按鈕
(function(){
  const params = new URLSearchParams(location.search);
  if(params.get('ar') !== '1' || !params.get('spec')) return;
  window.addEventListener('load', () => {
    try {
      importSpecJSON(b64urlDecode(params.get('spec')));
    } catch(err){ console.error('[AR] spec還原失敗', err); return; }
    setTimeout(() => { isIOSDevice() ? launchARSameDevice() : openARPreview(); }, 400);   // 等buildTub()跑完、幾何穩定
  });
})();
