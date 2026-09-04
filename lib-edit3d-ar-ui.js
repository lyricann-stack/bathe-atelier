// ===================== lib-edit3d-ar-ui.js =====================
// Phase 8 M8-1b(2026-08-21)：「在你的空間查看」按鈕＋QR流程。
//
// 模型檔交付方式決策(規格書工作項3明列「實作時定」的待決事項)：選擇零後端、
// QR只帶設計參數不帶模型檔的混合方案——
// - iOS同機直接開：AR Quick Look吃blob: URL沒問題(同一個Safari分頁內產生的handoff)，
//   手機直接開pro.html點按鈕，前端當場生成usdz blob就能用，零後端
// - 跨裝置(桌機生成QR、手機掃)：QR裡放的不是模型檔，是這個設計「跟預設值的差異」
//   (壓縮後base64url編碼)+`ar=1`旗標，手機掃到後開pro.html帶著這組參數，頁面自動
//   還原設計再讓手機自己當場生成blob——把「跨裝置」問題轉換成「先讓手機端變成
//   同機情境」，不用蓋一個檔案暫存/短鏈後端
//
// **已知限制(誠實記錄，不是遺漏)**：Android的Scene Viewer架構上一定要一個真正可被
// 抓取的https URL，不吃blob: URL——這個零後端方案只支援iOS/iPadOS。Android若要支援，
// 勢必需要真的暫存模型檔的後端(規格書選項b)，v1明確不做，留給之後有需求再評估。
//
// **2026-08-21實機測試回報修正**：第一版直接把完整`設計參數`(含全部中文欄位名)
// base64編碼進QR，預設設計就已經逼近QR容量上限，密度太高手機螢幕掃描實測掃不動——
// 「QR生成成功」不等於「QR掃得到」，這是先前驗收漏掉的一步。修法：
// (1) 只編碼P狀態「跟初始預設值的差異」而非全部欄位——預設缸幾乎是空diff，QR極稀疏；
//     且用P的原生英文短鍵名(L/W/H/drainPos...)而非中文欄位名，比對照`設計參數`的
//     詳細鍵名省字元
// (2) 疊加fflate deflate壓縮(fflate已因USDZExporter而載入，不是新依賴)，數值陣列
//     (customPts/wallMod/rimMod/customProfile)這類重度客製欄位壓縮率高
// (3) 壓縮後仍超過安全密度門檻(QR_SAFE_BYTE_LIMIT)才顯示降級說明——主動預判，
//     不是被動等函式庫拋例外才處理

function isIOSDevice(){
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS偽裝成Mac UA
}

// 頁面載入當下(使用者互動前)的P快照，供diff編碼比對基準；ar-ui.js是最後載入的lib script，
// 這行同步執行時，唯一可能搶先修改P的?spec=<url>.json舊機制(lib-edit3d-handles.js)是包在
// setTimeout()裡，一定排在所有同步腳本之後才跑，時序上不會搶先污染這份快照
const AR_DEFAULT_STATE = JSON.parse(JSON.stringify(P));

function buildStateDiff(){
  const diff = {};
  Object.keys(P).forEach(k => {
    if(JSON.stringify(P[k]) !== JSON.stringify(AR_DEFAULT_STATE[k])) diff[k] = P[k];
  });
  return diff;
}

// 二進位安全的base64url編碼/解碼(壓縮後是bytes，不是字串，不能用btoa()的字串版慣用法)
function bytesToBase64url(bytes){
  let bin = '';
  for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlToBytes(str){
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g,'+').replace(/_/g,'/') + pad);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const QR_SAFE_BYTE_LIMIT = 800;   // 壓縮後位元組數上限，超過就不硬掃QR容量上限、直接顯示降級說明

// 回傳{ok:true,param,byteLen}或{ok:false,byteLen}(超過安全密度門檻)
function buildShareSpecParam(){
  const diff = buildStateDiff();
  const compressed = fflate.deflateSync(fflate.strToU8(JSON.stringify(diff)));
  const byteLen = compressed.length;
  if(byteLen > QR_SAFE_BYTE_LIMIT) return { ok: false, byteLen };
  return { ok: true, param: bytesToBase64url(compressed), byteLen };
}
function decodeShareSpecParam(param){
  return JSON.parse(fflate.strFromU8(fflate.inflateSync(base64urlToBytes(param))));
}

async function launchARSameDevice(){
  if(!isIOSDevice()){
    alert(t('AR preview currently supports iPhone/iPad. Android support is on our roadmap.'));
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
  const share = buildShareSpecParam();
  if(!share.ok){
    imgEl.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = t('This design is too complex to share as a QR code. Try a simpler shape, or browse this page directly on your iPhone.');
    return;
  }
  try {
    const url = `${location.origin}${location.pathname}?arspec=${share.param}&ar=1`;
    const qr = qrcode(0, 'L');
    qr.addData(url);
    qr.make();
    imgEl.src = qr.createDataURL(6, 4);
  } catch(err){
    console.error(err);
    imgEl.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = t('This design is too complex to share as a QR code. Try a simpler shape, or browse this page directly on your iPhone.');
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

// 頁面載入時檢查?arspec=...&ar=1：掃碼進來的手機，自動還原設計後直接跳AR，不用使用者再找按鈕。
// 注意：參數名故意用`arspec`而不是`spec`——lib-edit3d-handles.js已有一個既有的`?spec=<url>.json`
// 機制(抓網址指到的json檔)，語意完全不同，撞名會混淆，改名避免任何疑慮(正規表示式本來就不會
// 誤吃這裡的base64url值，沒有真的衝突，但撞名本身就是可讀性風險)
(function(){
  const params = new URLSearchParams(location.search);
  if(params.get('ar') !== '1' || !params.get('arspec')) return;
  window.addEventListener('load', () => {
    try {
      const diff = decodeShareSpecParam(params.get('arspec'));
      Object.assign(P, diff);
      if(typeof sanitizeBase === 'function') sanitizeBase();
      if(typeof syncUI === 'function') syncUI();
      buildTub();
    } catch(err){ console.error('[AR] spec還原失敗', err); return; }
    setTimeout(() => { isIOSDevice() ? launchARSameDevice() : openARPreview(); }, 400);   // 等buildTub()跑完、幾何穩定
  });
})();
