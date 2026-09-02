// lib-tub-wizard.js 引導精靈（Basic/Pro） — 由 customize.html 抽出（行 2911-3024），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== 精靈（引導設計）：選用按鈕，頁面本身維持完整設計師版面 =====================
function openWizard(){
  document.getElementById('wizQ').style.display = '';
  document.getElementById('wizP').style.display = 'none';
  document.getElementById('wizModal').style.display = 'flex';
}
function closeWizard(){ document.getElementById('wizModal').style.display = 'none'; }
function wizBack(){
  document.getElementById('wizP').style.display = 'none';
  document.getElementById('wizQ').style.display = '';
}

// ---------- 需求問答狀態 ----------
const BRIEF = { spL:1800, spW:1000, height:170, posture:'recline', bathers:1, look:'organic' };
[['postureBtns','pos','posture'], ['bathersBtns','n','bathers'], ['lookBtns','look','look']].forEach(([id, attr, key])=>{
  document.querySelectorAll('#'+id+' button').forEach(b=> b.addEventListener('click', ()=>{
    document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    BRIEF[key] = attr === 'n' ? +b.dataset[attr] : b.dataset[attr];
  }));
});
// W1(2026-09-02)：空間兩支滑桿「拉到頂＝不限」共用 helper（BRIEF[key]=9999）；身高組維持原邏輯，不套用
function setSpace(r, n, key, v){
  if(v >= +r.max){ r.value = r.max; n.value = r.max + '+'; BRIEF[key] = 9999; }
  else { r.value = v; n.value = v; BRIEF[key] = v; }
}
[['rSpL','nSpL','spL'], ['rSpW','nSpW','spW']].forEach(([rid, nid, key])=>{
  const r = document.getElementById(rid), n = document.getElementById(nid);
  r.addEventListener('input', ()=> setSpace(r, n, key, +r.value));
  n.addEventListener('change', ()=>{
    const v = parseInt(String(n.value).replace(/[^\d]/g,''), 10);
    if(isNaN(v)){ setSpace(r, n, key, +r.min); return; }
    if(v >= +r.max){ setSpace(r, n, key, v); return; }
    const clamped = Math.max(+r.min, Math.min(+r.max, v));
    setSpace(r, n, key, Math.round(clamped/50)*50);
  });
});
[['rBh','nBh','height']].forEach(([rid, nid, key])=>{
  const r = document.getElementById(rid), n = document.getElementById(nid);
  r.addEventListener('input', ()=>{ n.value = r.value; BRIEF[key] = +r.value; });
  n.addEventListener('change', ()=>{ let v = Math.max(+r.min, Math.min(+r.max, +n.value || +r.min)); n.value = v; r.value = v; BRIEF[key] = v; });
});

// ---------- 人體工學 → 四款提案 ----------
// 規則（v1，可依設計部門實測校準；全部以「內缸口長」為人體基準）：
//   半躺屈膝 recline：內口長 ≈ 身高×0.82｜全伸腿 stretch：≈ 身高×0.93｜深湯坐泡 deep：≈ 身高×0.62、內深 540
//   坐姿底線：內口長 ≥ 950（既有工廠規則）｜標準內深 450（總高=內深+130）
//   單人內口寬 580–640；兩人 內口寬 ≥ 720、長 +150、排水中央
//   安裝間隙：每側 50mm → 外缸 ≤ 空間 − 100
// 底部尺寸與四個 R 按達爾文比例隨外缸縮放（obL/L=0.744、obW/W=0.75、ibL/L=0.6925、ibW/W=0.6475）
const LOOK_SHAPE = { organic:'ellipse', rounded:'stadium', linear:'rect' };
function darwinScaled(L, W, D, extra){
  return Object.assign({
    L, W, H: D + 130, b: 130, t: 20, lip: 20, r: 150,
    obL: Math.round(L*0.744/2)*2, obW: Math.round(W*0.75/2)*2,
    ibL: Math.round(L*0.6925/2)*2, ibW: Math.round(W*0.6475/2)*2,
    riL: Math.round(1001*L/1600), riW: Math.round(1152*W/800),
    roL: Math.round(887*L/1600),  roW: Math.round(1743*W/800),
    wallMode:'factory', dH:0, egg:0, arc:60, taper:74, rim:'flat',
    drain:'center', slope:1.5, ovf:true, ovfDrop:75, undercut:false, skirt:false
  }, extra || {});
}
function briefTargets(){
  const hmm = BRIEF.height * 10;
  const two = BRIEF.bathers === 2;
  const maxL = Math.min(2200, (BRIEF.spL || 4000) - 100);
  const maxW = Math.min(1200, (BRIEF.spW || 3000) - 100);
  const innerL = { recline: hmm*0.82, stretch: hmm*0.93, deep: hmm*0.62 };
  const clampL = v => Math.max(1200, Math.min(maxL, Math.round((v + 40 + (two?150:0))/10)*10));
  const clampW = v => Math.max(600, Math.min(maxW, Math.round((v + 40)/10)*10));
  return { two, innerL, clampL, clampW, maxL, maxW };
}
let PROPS = [];
let BRIEF_APPLIED = null;   // A1(2026-09-02)：客人選定提案當下的五題答案快照（之後改滑桿不影響），供詢價信／PDF 帶入
// W1(2026-09-02)：#spaceCap 提示文字抽成函式，applyProposal() 與 applyLang() 共用；兩軸皆到頂（不限）時改顯示絕對上限句
function spaceCapText(capL, capW){
  if(BRIEF.spL >= 2300 && BRIEF.spW >= 1300) return t('No space limit — up to our maximum') + ' 2200 × 1200 mm';
  return t('Sized to your space — up to') + ' ' + capL + ' × ' + capW + ' mm';
}
function generateProposals(){
  const T = briefTargets();
  const shape = LOOK_SHAPE[BRIEF.look] || 'ellipse';
  const wBase = T.two ? 760 : 600;   // 內口寬目標
  const defs = [
    // A3(2026-09-02)：每張提案卡加 why（推薦理由）與 shot（縮圖視角，差異化四張縮圖）
    // P1(2026-09-02)：每張卡加 intent（Shape & comfort 預設）；sculpt 的 dH 改由 intent.backrest 表達，extra 內原本寫死的靠背增高值已移除，避免雙重來源
    { key:'compact', name:'Compact fit',  L:T.clampL(T.innerL.recline), W:T.clampW(wBase - 40), D:450, extra:{shape}, why:'Fits your space, knees relaxed', shot:[Math.PI/4, Math.PI/3.2], intent:{ footprint:45, profile:55, depth:450, backrest:0, lip:20 } },
    { key:'stretch', name:'Full stretch', L:T.clampL(T.innerL.stretch), W:T.clampW(wBase + 20), D:450, extra:{shape}, why:'Lie flat at', shot:[Math.PI/4, Math.PI/3.2], intent:{ footprint:50, profile:50, depth:450, backrest:0, lip:20 } },
    { key:'deep',    name:'Deep soak',    L:T.clampL(T.innerL.deep),    W:T.clampW(wBase + 20), D:540, extra:{shape}, why:'Seated deep soak, 540 mm water, wide floor', shot:[Math.PI/4, Math.PI/2.6], intent:{ footprint:60, profile:40, depth:540, backrest:0, lip:20 } },
    { key:'sculpt',  name:'Sculptural',   L:T.clampL(T.innerL.recline), W:T.clampW(wBase + 20), D:460,
      extra:{ shape, rim:'round', egg: BRIEF.look==='organic' ? 10 : 0 }, why:'Raised backrest, softer rim', shot:[Math.PI*0.75, Math.PI/3.2], intent:{ footprint:45, profile:60, depth:460, backrest:90, lip:20 } }
  ];
  const saved = {}; Object.keys(P).forEach(k=>{ saved[k] = P[k]; });
  PROPS = defs.map(d=>{
    const params = darwinScaled(d.L, d.W, d.D, d.extra);
    Object.assign(P, params);
    P.customPts = null; P.customProfile = null;
    // P1(2026-09-02)：套用該卡的 Shape & comfort 預設，並把結果寫回 params（卡片帶入時直接用，不再重算）
    if(typeof applyIntent === 'function' && d.intent){
      Object.assign(INTENT, d.intent); applyIntent('all');
      ['obL','obW','ibL','ibW','riL','riW','roL','roW','H','dH','lip'].forEach(k => { params[k] = P[k]; });
    }
    buildTub();
    const spec = computeSpec();
    const price = priceParts().total;
    const img = captureRenders({ w:520, h:390, mime:'image/jpeg', q:0.82, shots:[['thumb', d.shot[0], d.shot[1]]], noWatermark:true })[0][1];
    // A3(2026-09-02)：why/whyHeight 供卡片顯示推薦理由；note 標註 Deep soak 撞下限的情況
    return { name:d.name, params, img, dims:`${d.L} × ${d.W} × ${params.H} mm`, depth:d.D, cap:spec.fullVol.toFixed(0), price,
      why: d.why, whyHeight: d.key==='stretch', note: (d.key==='deep' && d.L===1200 && (T.innerL.deep + 40) < 1200) ? 'Minimum length applied' : null,
      intent: d.intent ? Object.assign({}, d.intent) : null };
  });
  Object.keys(saved).forEach(k=>{ P[k] = saved[k]; });
  syncUI(); buildTub();
  if(typeof syncIntentFromP === 'function') syncIntentFromP();   // P1(2026-09-02)：還原 P 後同步滑桿
  renderProposalCards();
  document.getElementById('wizQ').style.display = 'none';
  document.getElementById('wizP').style.display = '';
}
function renderProposalCards(){
  const g = document.getElementById('propGrid');
  g.innerHTML = '';
  // A3(2026-09-02)：四款價格一致（皆 MTM）時，改在網格上方寫一句，卡內不重複；不一致時保留卡內各自價格分支
  const samePrice = PROPS.length > 0 && PROPS.every(p => p.price === PROPS[0].price);
  const pl = document.getElementById('propPriceLine');
  if(pl) pl.textContent = samePrice ? (t('All four are Made-to-Measure') + ' — ' + fromStr(PROPS[0].price)) : '';
  PROPS.forEach((p, i)=>{
    const card = document.createElement('div');
    card.className = 'prop-card';
    card.innerHTML = `<img src="${p.img}" alt="${p.name}">
      <div class="pc-body">
        <b>${t(p.name)}</b>
        <span class="pc-why">${t(p.why)}${p.whyHeight ? ' ' + BRIEF.height + ' cm' : ''}</span>
        <span>${p.dims}</span>
        <span>${t('Depth')} ${p.depth}mm · ~${p.cap} L</span>
        ${p.note ? `<span class="pc-note">${t(p.note)}</span>` : ''}
        ${samePrice ? '' : `<span class="pc-price">${fromStr(p.price)}</span>`}
      </div>`;
    card.addEventListener('click', ()=> applyProposal(i));
    g.appendChild(card);
  });
}
function applyProposal(i){
  const p = PROPS[i];
  if(!p) return;
  BRIEF_APPLIED = Object.assign({}, BRIEF, { proposal: p.name });
  Object.assign(P, p.params);
  P.customPts = null; P.customProfile = null;
  // P1(2026-09-02)：卡片自帶 intent 就直接設（比反推精確），沒有才反推
  if(typeof INTENT !== 'undefined' && p.intent){ Object.assign(INTENT, p.intent); if(typeof intentSyncControls === 'function') intentSyncControls(); }
  else if(typeof syncIntentFromP === 'function') syncIntentFromP();
  sanitizeBase();
  // A2(2026-09-02)：長寬滑桿上限跟客人空間連動（絕對上限 2200/1200 仍守住；下限保護避免 max<min）
  const T = briefTargets();
  const capL = Math.max(1200, T.maxL), capW = Math.max(600, T.maxW);
  [['rL','nL',capL],['rW','nW',capW]].forEach(([rid,nid,cap])=>{ const r=document.getElementById(rid), n=document.getElementById(nid); if(r) r.max = cap; if(n) n.max = cap; });
  if(P.L > capL) P.L = capL;
  if(P.W > capW) P.W = capW;
  const sc = document.getElementById('spaceCap');
  if(sc){ sc.style.display = 'block'; sc.textContent = spaceCapText(capL, capW); }
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.toggle('active', b.dataset.rim === P.rim));
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain === P.drain));
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.toggle('active', b.dataset.shape === P.shape));
  if(typeof unlockQuoteBtn === 'function') unlockQuoteBtn();
  syncUI(); updateRowVis(); buildTub();
  closeWizard();
}
