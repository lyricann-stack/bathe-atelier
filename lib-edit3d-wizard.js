// ===================== lib-edit3d-wizard.js =====================
// Phase 5合併(2026-08-20)：以lib-tub-wizard.js為底，兩處"清除自訂輪廓"補上P.customPtsInner/
// wallMod/rimMod(節點編輯新增狀態)，跟lib-edit3d-ui.js/wizard.js同一組差異，非單獨新邏輯。
// 比對結果：wizard的問答流程/四提案卡生成邏輯(generateProposals/renderProposalCards/applyProposal)
// pro.html既有版跟Edit3D單檔版完全一致，沒有需要判斷合併方向的實質差異——規格書原本標記的
// "需要比對決定合併方向"風險，實測後發現風險比預期低，pro.html既有精靈邏輯可直接沿用。

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
const BRIEF = { spL:2400, spW:1600, height:170, posture:'recline', bathers:1, look:'organic' };
[['postureBtns','pos','posture'], ['bathersBtns','n','bathers'], ['lookBtns','look','look']].forEach(([id, attr, key])=>{
  document.querySelectorAll('#'+id+' button').forEach(b=> b.addEventListener('click', ()=>{
    document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    BRIEF[key] = attr === 'n' ? +b.dataset[attr] : b.dataset[attr];
  }));
});
[['rSpL','nSpL','spL'], ['rSpW','nSpW','spW'], ['rBh','nBh','height']].forEach(([rid, nid, key])=>{
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
  return { two, innerL, clampL, clampW };
}
let PROPS = [];
// Phase 5(2026-08-21)：修正wallface-test.html/photo2tub-app.html/medium.html既有的一個真實bug
// (非本次引入，逐字沿用時原樣繼承)——EDIT_MODE(lib-edit3d-handles.js)把captureRenders monkey-patch
// 成async function(為了在截圖前後隱藏節點編輯的edge/node群組)，但generateProposals()這裡原本同步
// 呼叫`captureRenders(...)[0][1]`，async函式回傳Promise，`[0]`直接是undefined，整個精靈四提案卡
// 生成當場丟TypeError中斷。用「新舊架構wizard輸出diff比對」方法實測時抓到(捨舊架構pro.html
// 沒有EDIT_MODE、同一段呼叫本來就相容，新架構才會炸)——同一個bug目前確認也存在於現正上線的
// medium.html(EDIT_MODE版)，屬於使用者可直接踩到的活躍bug，需另外通知盡快修正上線頁。
// 修法：generateProposals()改async，await captureRenders()。
async function generateProposals(){
  const T = briefTargets();
  const shape = LOOK_SHAPE[BRIEF.look] || 'ellipse';
  const wBase = T.two ? 760 : 600;   // 內口寬目標
  const defs = [
    { key:'compact', name:'Compact fit',  L:T.clampL(T.innerL.recline), W:T.clampW(wBase - 40), D:450, extra:{shape} },
    { key:'stretch', name:'Full stretch', L:T.clampL(T.innerL.stretch), W:T.clampW(wBase + 20), D:450, extra:{shape} },
    { key:'deep',    name:'Deep soak',    L:T.clampL(T.innerL.deep),    W:T.clampW(wBase + 20), D:540, extra:{shape} },
    { key:'sculpt',  name:'Sculptural',   L:T.clampL(T.innerL.recline), W:T.clampW(wBase + 20), D:460,
      extra:{ shape, dH:90, rim:'round', egg: BRIEF.look==='organic' ? 10 : 0 } }
  ];
  const saved = {}; Object.keys(P).forEach(k=>{ saved[k] = P[k]; });
  PROPS = [];
  for(const d of defs){
    const params = darwinScaled(d.L, d.W, d.D, d.extra);
    Object.assign(P, params);
    P.customPts = null; P.customPtsInner = null; P.customProfile = null; P.wallMod = null; P.rimMod = null;
    buildTub();
    const spec = computeSpec();
    const price = priceParts().total;
    const img = (await captureRenders({ w:520, h:390, mime:'image/jpeg', q:0.82, shots:[['thumb', Math.PI/4, Math.PI/3.2]], noWatermark:true }))[0][1];
    PROPS.push({ name:d.name, params, img, dims:`${d.L} × ${d.W} × ${params.H} mm`, depth:d.D, cap:spec.fullVol.toFixed(0), price });
  }
  Object.keys(saved).forEach(k=>{ P[k] = saved[k]; });
  syncUI(); buildTub();
  renderProposalCards();
  document.getElementById('wizQ').style.display = 'none';
  document.getElementById('wizP').style.display = '';
}
function renderProposalCards(){
  const g = document.getElementById('propGrid');
  g.innerHTML = '';
  PROPS.forEach((p, i)=>{
    const card = document.createElement('div');
    card.className = 'prop-card';
    card.innerHTML = `<img src="${p.img}" alt="${p.name}">
      <div class="pc-body">
        <b>${t(p.name)}</b>
        <span>${p.dims}</span>
        <span>${t('Depth')} ${p.depth}mm · ~${p.cap} L</span>
        <span class="pc-price">${fromStr(p.price)}</span>
      </div>`;
    card.addEventListener('click', ()=> applyProposal(i));
    g.appendChild(card);
  });
}
function applyProposal(i){
  const p = PROPS[i];
  if(!p) return;
  Object.assign(P, p.params);
  P.customPts = null; P.customPtsInner = null; P.customProfile = null; P.wallMod = null; P.rimMod = null;
  // 靠牆缸下放Medium(2026-08-22)迴歸實測發現的同一個狀態同步問題(見applyClassic()同段註解)：
  // 精靈提案永遠是獨立缸造型，套用時要清掉wall模式狀態，避免UI下拉選單停在「Wall-mounted」
  if(typeof wallFaceMode !== 'undefined' && wallFaceMode){
    wallFaceMode = false;
    P.tub_type = 'freestanding';
    P.wallEdgeStart = null; P.wallEdgeEnd = null;
    const tt = document.getElementById('photo2tubType');
    if(tt) tt.value = 'freestanding';
  }
  sanitizeBase();
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.toggle('active', b.dataset.rim === P.rim));
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain === P.drain));
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.toggle('active', b.dataset.shape === P.shape));
  syncUI(); updateRowVis(); buildTub();
  closeWizard();
}
