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
  ['rBaseSlope','nBaseSlope','baseSlope'],  // 缸底斜面下放Basic(2026-08-22)，元素不存在的頁面本行自動略過(既有guard)
  ['rSkH','nSkH','skirtH'], ['rSkW','nSkW','waistK'], ['rSkR','nSkR','skirtR'],
  ['rLip','nLip','lip'], ['rObL','nObL','obL'], ['rObW','nObW','obW'], ['rIbL','nIbL','ibL'], ['rIbW','nIbW','ibW'],
  ['rRiL','nRiL','riL'], ['rRiW','nRiW','riW'], ['rRoL','nRoL','roL'], ['rRoW','nRoW','roW']
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
  _el('wallRRow').style.display  = (P.wallMode==='arc') ? 'flex' : 'none';
  _el('wallR1Row').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('wallR2Row').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('wallMidRow').style.display = (P.wallMode==='s') ? 'flex' : 'none';
  _el('skirtChk').style.display = fac ? 'none' : 'flex';
  _el('skirtToggle').checked = P.skirt;
  ['skirtHRow','skirtWRow','skirtRRow'].forEach(id=>{ _el(id).style.display = (P.skirt && !fac) ? 'flex' : 'none'; });
  _el('skirtTip').style.display = (P.skirt && !fac) ? 'block' : 'none';
  updateRowVis();
  // B6(2026-09-02)：syncUI 定義在 updateColorNote 之前，故用 typeof 守衛
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
  P.customPts = null; P.customProfile = null;
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
  _el('rS').closest('.row').style.display = ((P.customProfile && P.shape==='custom') || P.wallMode==='factory') ? 'none' : 'flex';
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

// A5(2026-09-02)：Email 欄一有輸入就清掉送出被擋時標的紅框（元素不存在時 _el 回傳 no-op stub）
_el('custEmail').addEventListener('input', () => { _el('custEmail').classList.remove('field-err'); });

// B6(2026-09-02)：色票下方即時提示客製色加價（金額讀 PRICING，元素不存在直接 return）
function updateColorNote(){
  const el = document.getElementById('colorNote');
  if(!el || typeof PRICING === 'undefined') return;
  const std = (P.color || '').toLowerCase() === STD_COLOR;
  el.textContent = std ? t('Classic White — included') : (t('Custom colour') + ' +USD $' + PRICING.color.toLocaleString('en-US'));
}
