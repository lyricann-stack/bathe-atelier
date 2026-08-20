// ===================== lib-edit3d-wallmount.js =====================
// Phase 5抽取(2026-08-20)：逐字抽自wallface-test.html 558-637行(Phase 4 P4-M1/M2的wallFace模式)。
// 依賴：P(state)、resample()/shellKxy()等(geometry.js)、syncUI()/buildTub()。
// ⚠️待辦(尚未做，抽取階段先如實記錄)：
// 1. geometry.js的loftGeometry()/stripGeometry()兩處wallIdxWeight()呼叫點已同步補回(見lib-edit3d-geometry.js)。
// 2. handles.js(EDIT_MODE)的recomputeOutline()還有第3處注入點(貼牆邊索引範圍鎖x)尚未補——
//    抽取handles.js時要對照wallface-test.html 3600-3604行補上，不能漏掉。
// 3. chooseTubType()目前still hide一個'tubTypeChooser'全頁overlay——Phase5規格書已裁定pro.html
//    不用這種全頁overlay(內嵌在照片上傳流程第一步)，整合進pro.html時這個函式要跟著調整UI掛勾點，
//    不能整段照搬。
// 4. P.skirt在這裡被wall模式預設帶true/false——裙邊板改手動選項(claude-code-77裁定)後，
//    這個預設值仍可保留當「靠牆缸預設勾選帶裙邊板，使用者可自行取消」的初始狀態，UI開關即可。
// ===================== Phase 4 P4-M1：靠牆缸(wallFace)模式 =====================
// 這個新頁(wallface-test.html)專用，複製自medium.html——medium.html本身一行未改。
// wallFaceMode=true時：預設輪廓改成D形(平背+弧前)，且對「貼牆平直邊」索引範圍做三處特殊處理：
// (1) 節點編輯時鎖x，貼牆面永遠平直 (2) 外殼裙擺/側壁在該範圍不外鼓，改垂直直落到底(視為隱藏在牆內)
// (3) 缸緣bump(圓角/斜角)在該範圍歸零(貼牆面不需要裝飾性緣邊處理)。
// Phase 4 P4-M2：改成執行期可選的旗標(進站二選一決定)，預設false(獨立缸)，
// 由下方的chooseTubType()在使用者點選後設定，不是頁面載入就寫死。
let wallFaceMode = false;

// 建D形俯視輪廓(平背+半圓弧前)：radFrac=前端弧半徑(normalized，0~0.5)。
// 回傳96點customPts(normalized ±0.5 bbox)＋貼牆平直邊(即「WALL edge」)的索引範圍[wallEdgeStart, wallEdgeEnd)。
function buildWallDOutline(radFrac){
  const hl = 0.5, hw = 0.5, rad = Math.min(radFrac, hw);
  const raw = [];
  const segN = 32;
  raw.push([hl - rad, -hw]);                              // 前端弧起點(前-下)
  for(let i = 1; i < segN; i++){
    const a = -Math.PI/2 + Math.PI*i/segN;
    raw.push([hl - rad + rad*Math.cos(a), rad*Math.sin(a)]);
  }
  raw.push([hl - rad, hw]);                                // 前端弧終點(前-上) / 頂邊起點
  const wallRawStart = raw.length;
  raw.push([-hl, hw]);                                     // 頂邊終點 / 貼牆邊起點(牆-上)
  raw.push([-hl, -hw]);                                    // 貼牆邊終點(牆-下)
  // 收尾(牆-下 → 前端弧起點)為底邊，resample()會自動處理收合，不需再push起點。

  // 複製resample()的弧長累計邏輯，算出貼牆邊在96點輸出裡對應的索引範圍(不重新resample，只算比例)
  const d = [0];
  for(let i = 1; i <= raw.length; i++){
    const a = raw[i-1], b = raw[i % raw.length];
    d.push(d[i-1] + Math.hypot(b[0]-a[0], b[1]-a[1]));
  }
  const total = d[raw.length];
  const N = 96;
  const wallEdgeStart = Math.round(d[wallRawStart] / total * N);
  const wallEdgeEnd = Math.round(d[wallRawStart + 1] / total * N);
  const customPts = resample(raw, N);
  return { customPts, wallEdgeStart, wallEdgeEnd };
}

// 貼牆索引範圍的權重(1=完全貼牆平直, 0=正常獨立缸幾何)，邊界處線性淡出避免硬接縫
function wallIdxWeight(i){
  if(!wallFaceMode || P.wallEdgeStart == null) return 0;
  const s = P.wallEdgeStart, e = P.wallEdgeEnd, n = 96, margin = 4;
  const inRange = idx => (s <= e) ? (idx >= s && idx < e) : (idx >= s || idx < e);
  if(inRange(i)) return 1;
  const distTo = edge => Math.min(Math.abs(i - edge), n - Math.abs(i - edge));
  const dd = Math.min(distTo(s), distTo(e));
  return dd < margin ? 1 - dd/margin : 0;
}

// Phase 4 P4-M2：進站二選一——由使用者點選觸發，不在頁面載入時就套用。
function chooseTubType(type){
  wallFaceMode = (type === 'wall');
  if(wallFaceMode){
    const d0 = buildWallDOutline(0.5);
    P.shape = 'custom';
    P.customPts = d0.customPts;
    P.wallEdgeStart = d0.wallEdgeStart;
    P.wallEdgeEnd = d0.wallEdgeEnd;
    P.tub_type = 'wall';
    P.skirt = true;   // 靠牆缸預設開裙邊板(apron)，wallIdxWeight會讓貼牆那面不外鼓
  } else {
    P.tub_type = 'freestanding';
    // 如果之前選過「靠牆安裝」，D形貼牆輪廓(平背)還留在P.customPts裡，切回獨立式要清掉重置成
    // 預設ellipse，不然會變成「一面莫名其妙是死平的獨立缸」——這是本輪Chrome實測時發現的真實bug，
    // 不是假設性的，修正：只有P.wallEdgeStart有值(代表用過wall模式)時才重置，第一次進站選freestanding
    // 完全不動，等同現有medium.html行為。
    if(P.wallEdgeStart != null){
      P.shape = 'ellipse';
      P.customPts = null;
      P.wallEdgeStart = null;
      P.wallEdgeEnd = null;
      P.skirt = false;
    }
  }
  const overlay = document.getElementById('tubTypeChooser');
  if(overlay) overlay.style.display = 'none';
  syncUI(); buildTub();
}
