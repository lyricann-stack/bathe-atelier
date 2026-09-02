// ===================== lib-edit3d-ui.js =====================
// Phase 5合併(2026-08-20)：以lib-tub-ui.js為底(已有_el()防禦性guard、含pro.html專屬的
// 色票/water/undercut/skirt/ovf等UI綁定，比Edit3D單檔版更完整)，只補1處Edit3D版多出的差異：
// 清除自訂輪廓時同步清空P.customPtsInner/wallMod/rimMod(節點編輯新增的3個狀態，避免殘留)。
// 注意：pro.html既有的skirtToggle('Pedestal skirt base')UI已經是P.skirt的手動開關——
// 裙邊板改手動選項(claude-code-77裁定)可以直接沿用這個既有checkbox，靠牆模式的
// chooseTubType()已經會設P.skirt=true/false，syncUI()跑完checkbox會自動同步勾選狀態，
// 不需要新UI元件，只需確認skirtChk在wall模式下的顯示邏輯(目前跟fac/factory耦合)是否要調整。

// lib-tub-ui.js 滑桿綁定＋syncUI＋setter＋經典款 — 由 customize.html 抽出（行 2521-2633,2888-2909），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== UI 綁定 =====================
// 防禦性 guard：三版本頁各自只有部分控制項，缺的元素以 no-op stub 代替（元素齊全時行為與舊版完全相同）
const _uiStub = { style:{}, classList:{ add(){}, remove(){}, toggle(){} }, value:'', checked:false,
  addEventListener(){}, closest(){ return { style:{} }; } };
function _el(id){ return document.getElementById(id) || _uiStub; }
const sliderMap = [
  ['rL','nL','L'], ['rW','nW','W'], ['rH','nH','H'], ['rT','nT','t'],
  ['rB','nB','b'], ['rR','nR','r'], ['rDH','nDH','dH'], ['rE','nE','egg'], ['rS','nS','taper'], ['rArc','nArc','arc'],
  ['rSlope','nSlope','slope'], ['rWR','nWR','wallR'], ['rWR1','nWR1','wallR'], ['rWR2','nWR2','wallR2'], ['rWM','nWM','wallMid'],
  ['rSkH','nSkH','skirtH'], ['rSkW','nSkW','waistK'], ['rSkR','nSkR','skirtR'],
  ['rLip','nLip','lip'], ['rObL','nObL','obL'], ['rObW','nObW','obW'], ['rIbL','nIbL','ibL'], ['rIbW','nIbW','ibW'],
  ['rRiL','nRiL','riL'], ['rRiW','nRiW','riW'], ['rRoL','nRoL','roL'], ['rRoW','nRoW','roW'],
  ['rBaseSlope','nBaseSlope','baseSlope']   // 佇列項11(2026-08-22)：缸底斜面v1，只在pro.html加HTML，Medium/basic無對應元素時sliderMap自動略過(既有防禦性guard)
];
sliderMap.forEach(([rid,nid,key])=>{
  const r=document.getElementById(rid), n=document.getElementById(nid);
  if(!r || !n) return;   // 該版本頁沒有這組控制項
  r.addEventListener('input', ()=>{
    n.value=r.value; P[key]=+r.value;
    if(enforceBaseOrder(key)){ r.value=P[key]; n.value=P[key]; }   // 外/內缸底順序硬限制
    buildTub();
  });
  n.addEventListener('change', ()=>{
    let v=Math.max(+r.min, Math.min(+r.max, +n.value || +r.min));
    P[key]=v;
    enforceBaseOrder(key);
    n.value=P[key]; r.value=P[key];
    buildTub();
  });
});

function syncUI(){
  sliderMap.forEach(([rid,nid,key])=>{
    _el(rid).value = P[key];
    _el(nid).value = P[key];
  });
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.toggle('active', b.dataset.shape===P.shape));
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.toggle('active', b.dataset.rim===P.rim));
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain===P.drain));
  _el('undercutToggle').checked = P.undercut;
  document.querySelectorAll('.wallmode-btns button').forEach(b=>b.classList.toggle('active', b.dataset.wallmode===P.wallMode));
  const fac = P.wallMode==='factory';
  ['lipRow','obLRow','obWRow','ibLRow','ibWRow','riLRow','riWRow','roLRow','roWRow'].forEach(id=>{ _el(id).style.display = fac ? 'flex' : 'none'; });
  _el('ovfChk').style.display = fac ? 'flex' : 'none';
  _el('ovfToggle').checked = P.ovf;
  _el('faucetToggle').checked = P.faucet;   // Phase 7：龍頭孔不分factory/legacy模式，一律顯示，不用display切換
  _el('wallRRow').style.display  = (P.wallMode==='arc') ? 'flex' : 'none';
  _el('wallR1Row').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('wallR2Row').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('wallMidRow').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('skirtChk').style.display = fac ? 'none' : 'flex';
  _el('skirtToggle').checked = P.skirt;
  ['skirtHRow','skirtWRow','skirtRRow'].forEach(id=>{ _el(id).style.display = (P.skirt && !fac) ? 'flex' : 'none'; });
  _el('skirtTip').style.display = (P.skirt && !fac) ? 'block' : 'none';
  updateRowVis();
  if(typeof updateColorNote === 'function') updateColorNote();
}

function setWallMode(m, btn){
  P.wallMode = m;
  document.querySelectorAll('.wallmode-btns button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  syncUI();
  buildTub();
}

function setShape(s, btn){
  P.shape = s;
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  updateRowVis();
  buildTub();
}
function setMaterial(m, btn){
  P.material = m;
  document.querySelectorAll('.mat-btns button[data-mat]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildTub();
}
function setDrain(d, btn){
  P.drain = d;
  P.drainPos = null;  // Phase 7：切回離散選項時清掉拖曳留下的自訂座標，避免drainXY()誤用舊值
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildTub();
}
function setRim(r, btn){
  P.rim = r;
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildTub();
}

// 照片款預設：不對稱蛋形缸（後緣高、蛋形口、底部內收）
function applyPhotoPreset(){
  Object.assign(P, { shape:'ellipse', L:1700, W:850, H:520, t:15, b:40, dH:130, egg:12, taper:72, drain:'front', wallMode:'curve', ovf:false });
  syncUI();
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain===P.drain));
  buildTub();
}

// 工廠經典款（量產驗證）：Darwin＝2026-07-13 工廠圖精確參數（factory 模式）；
// Marbella/Victoria 仍為銷售線圖近似參數（legacy arc 模式），待工廠圖到位後改 factory
const CLASSICS = {
  marbella: { shape:'stadium', L:1600, W:800, H:485, t:20, b:40, r:150, dH:95,  egg:0, taper:72, arc:60, rim:'round', drain:'center', slope:1.5, wallMode:'arc', wallR:2000, undercut:false, ovf:false },
  victoria: { shape:'stadium', L:1600, W:800, H:490, t:20, b:40, r:150, dH:110, egg:0, taper:75, arc:55, rim:'round', drain:'back',   slope:1.5, wallMode:'arc', wallR:1800, undercut:false, ovf:false },
  darwin:   { shape:'ellipse', L:1600, W:800, H:580, t:20, b:130, r:150, dH:0, egg:0, taper:74, arc:60, rim:'flat', drain:'center', slope:1.5, wallMode:'factory', undercut:false,
              lip:20, obL:1190, obW:600, ibL:1108, ibW:518, riL:1001, riW:1152, roL:887, roW:1743, ovf:true, ovfDrop:75 }
};
function applyClassic(k){
  Object.assign(P, CLASSICS[k]);
  P.customPts = null; P.customPtsInner = null; P.customProfile = null; P.wallMod = null; P.rimMod = null;
  P.drainPos = null; P.ovfPos = null;   // Phase 7：套用經典款時清掉拖曳留下的自訂座標，改用經典款自己的固定位置
  P.faucet = false; P.faucetPos = null; // 龍頭孔是全新配件，經典款本來就沒有這個欄位，切換時重置為關閉
  P.baseSlope = 0;                      // 佇列項11：缸底斜面是全新進階選項，經典款本來就沒有，切換時重置為平底
  // 靠牆缸下放Medium(2026-08-22)迴歸實測發現：經典款都是獨立缸造型，套用時要把wall模式狀態
  // 一併清掉(wallFaceMode/wallEdgeStart)，否則UI的「Tub Type」下拉選單會停在「Wall-mounted」，
  // 跟畫面上已經變回獨立缸造型的實際狀態不一致——這裡跟chooseTubType()的freestanding分支
  // 是同一個修復精神，但不呼叫chooseTubType()本身(它會強制shape=ellipse，蓋掉經典款自己
  // 的stadium/ellipse選擇)。幾何層面的保護(wallIdxWeight()要求P.shape==='custom')在
  // lib-edit3d-wallmount.js另外補上，這裡主要是同步UI/狀態讓使用者不會看到誤導的下拉選單。
  if(typeof wallFaceMode !== 'undefined' && wallFaceMode){
    wallFaceMode = false;
    P.tub_type = 'freestanding';
    P.wallEdgeStart = null; P.wallEdgeEnd = null;
    const tt = document.getElementById('photo2tubType');
    if(tt) tt.value = 'freestanding';
  }
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.toggle('active', b.dataset.rim===P.rim));
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain===P.drain));
  syncUI();
  buildTub();
}

// ===================== 手繪模式 =====================
let useDefaultProfile = true;
let uploadedContour = null;   // 由照片辨識出的輪廓（畫布座標）


function updateRowVis(){
  _el('radiusRow').style.display = (P.shape==='rect') ? 'flex' : 'none';
  _el('rE').closest('.row').style.display = (P.shape==='custom') ? 'none' : 'flex';
  _el('rS').closest('.row').style.display = (P.customProfile || P.wallMode==='factory') ? 'none' : 'flex';  // Phase 6A解耦
  _el('rT').closest('.row').style.display = (P.wallMode==='factory') ? 'none' : 'flex';   // factory：壁厚由內外殼幾何決定
}

document.querySelectorAll('.sw').forEach(sw=>{
  sw.addEventListener('click', ()=>{
    document.querySelectorAll('.sw').forEach(x=>x.classList.remove('active'));
    sw.classList.add('active');
    P.color = sw.dataset.c; buildTub();
    updateColorNote();
  });
});
_el('customColor').addEventListener('input', e=>{
  document.querySelectorAll('.sw').forEach(x=>x.classList.remove('active'));
  P.color = e.target.value; buildTub();
  updateColorNote();
});
_el('waterToggle').addEventListener('change', e=>{ P.water = e.target.checked; buildTub(); });
_el('undercutToggle').addEventListener('change', e=>{ P.undercut = e.target.checked; buildTub(); });
_el('skirtToggle').addEventListener('change', e=>{ P.skirt = e.target.checked; syncUI(); buildTub(); });
_el('ovfToggle').addEventListener('change', e=>{ P.ovf = e.target.checked; buildTub(); });
_el('faucetToggle').addEventListener('change', e=>{ P.faucet = e.target.checked; buildTub(); });

// M6(2026-09-02)：色票下方即時提示客製色加價（金額讀 PRICING，元素不存在直接 return）
function updateColorNote(){
  const el = document.getElementById('colorNote');
  if(!el || typeof PRICING === 'undefined') return;
  const std = (P.color || '').toLowerCase() === STD_COLOR;
  el.textContent = std ? t('Classic White — included') : (t('Custom colour') + ' +USD $' + PRICING.color.toLocaleString('en-US'));
}

// M7(2026-09-02)：客人改任何參數（滑桿／材質／顏色／選項／節點編輯）→ 解鎖詢價按鈕、清掉成功 banner；逐字複製 lib-tub-ui.js 版本
function unlockQuoteBtn(){
  const b = document.getElementById('quoteBtn');
  if(!b || b.dataset.sent !== '1') return;
  delete b.dataset.sent; b.disabled = false;
  if(b.firstChild && b.firstChild.nodeType === 3) b.firstChild.textContent = t('Submit design & get a firm quote →'); else b.textContent = t('Submit design & get a firm quote →');
  if(typeof i18nNodes !== 'undefined' && b.firstChild){ i18nNodes.forEach(pair => { if(pair[0] === b.firstChild) pair[1] = 'Submit design & get a firm quote →'; }); }
  const bn = document.getElementById('quoteBanner'); if(bn){ bn.style.display = 'none'; bn.textContent = ''; }
}
['input','change'].forEach(ev => { const p = document.getElementById('panel'); if(p) p.addEventListener(ev, e => { if(e.target && e.target.id !== 'custEmail' && e.target.id !== 'custName' && e.target.id !== 'custNote' && e.target.id !== 'shipDest' && e.target.id !== 'photoNote') unlockQuoteBtn(); }, true); });
document.querySelectorAll('.sw, .mat-btns button').forEach(el => el.addEventListener('click', unlockQuoteBtn));
// M7(2026-09-02)：節點編輯／滑桿等任何幾何重建都會呼叫 buildTub，包一層順便解鎖詢價按鈕
if(typeof buildTub === 'function'){ const _btUnlock = buildTub; buildTub = function(){ _btUnlock.apply(this, arguments); if(typeof unlockQuoteBtn === 'function') unlockQuoteBtn(); }; }
