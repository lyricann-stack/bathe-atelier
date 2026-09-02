// lib-tub-basic-intent.js — Basic v2(2026-09-02)：Shape & comfort 意圖層。只有 basic.html 載入。
// INTENT 是「控制面」，P 仍是唯一真實來源；applyIntent 把 INTENT 寫進 P 並守門，syncIntentFromP 反向同步滑桿。
// 常數（V2-Q6 2026-09-02 監督裁：4× 極限渲染成圓錐杯，收窄為 0.5×～2×；footprint 幅度減半）
const INTENT_FOOT_BASE_L = 0.744, INTENT_FOOT_BASE_W = 0.75, INTENT_FOOT_STEP = 0.0016;   // Darwin obL/L、obW/W；每格 0.16%
const INTENT_IB_GAP_L = 0.0515, INTENT_IB_GAP_W = 0.1025;                                  // Darwin 內外底差（比例）
const INTENT_R_BASE = { riL:1001/1600, riW:1152/800, roL:887/1600, roW:1743/800 };        // Darwin R 對 L 或 W 的比例
const INTENT_R_MIN = 300, INTENT_R_MAX = 5000, INTENT_PROFILE_SPAN = 50;                   // m = 2^((v-50)/50) → 0.5×～2×
const INTENT = { footprint:50, profile:50, depth:450, backrest:0, lip:20 };

const INTENT_LIPS = [15, 20, 30];
const INTENT_DEF = { footprint:50, profile:50, depth:450, backrest:0, lip:20 };   // 退守方向的目標（Darwin 已知安全）
function intentRound2(x){ return Math.round(x/2)*2; }                              // 與 darwinScaled 取偶一致
function intentClamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// INTENT → P。sizeOnly=true（外部長寬變動時）只重算隨 L/W 的底部與 R，不動 H/dH/lip
function intentWriteP(sizeOnly){
  const L = P.L, W = P.W;
  const fL = INTENT_FOOT_BASE_L + (INTENT.footprint - 50) * INTENT_FOOT_STEP;
  const fW = INTENT_FOOT_BASE_W + (INTENT.footprint - 50) * INTENT_FOOT_STEP;
  P.obL = intentRound2(fL * L); P.obW = intentRound2(fW * W);
  // S1-1b(2026-09-02)：與 darwinScaled 同樣直接取偶（0.744−0.0515＝0.6925、0.75−0.1025＝0.6475），提案往返逐位元一致
  P.ibL = intentRound2((fL - INTENT_IB_GAP_L) * L);
  P.ibW = intentRound2((fW - INTENT_IB_GAP_W) * W);
  const m = Math.pow(2, (INTENT.profile - 50) / INTENT_PROFILE_SPAN);
  P.riL = Math.round(intentClamp(INTENT_R_BASE.riL * L * m, INTENT_R_MIN, INTENT_R_MAX));
  P.riW = Math.round(intentClamp(INTENT_R_BASE.riW * W * m, INTENT_R_MIN, INTENT_R_MAX));
  P.roL = Math.round(intentClamp(INTENT_R_BASE.roL * L * m, INTENT_R_MIN, INTENT_R_MAX));
  P.roW = Math.round(intentClamp(INTENT_R_BASE.roW * W * m, INTENT_R_MIN, INTENT_R_MAX));
  if(!sizeOnly){
    P.H = INTENT.depth + P.b;
    P.dH = INTENT.backrest;
    P.lip = INTENT.lip;
  }
}
// 守門退一格：把 changedKey 往 Darwin 預設值方向退（size/all 時先退 footprint，再退 profile）
function intentRetreat(changedKey){
  const step = (k, s) => { const d = INTENT_DEF[k]; if(INTENT[k] === d) return false; INTENT[k] += (INTENT[k] < d ? s : -s); return true; };
  if(changedKey === 'lip'){ const i = INTENT_LIPS.indexOf(INTENT.lip); if(i > 1){ INTENT.lip = INTENT_LIPS[i-1]; return true; } return false; }
  if(changedKey === 'depth') return step('depth', 10);
  if(changedKey === 'backrest') return step('backrest', 10);
  if(changedKey === 'profile') return step('profile', 1);
  if(changedKey === 'footprint') return step('footprint', 1);
  return step('footprint', 1) || step('profile', 1);   // 'size' / 'all'
}
// INTENT → 滑桿與按鈕位置（元素存在才寫）
function intentSyncControls(){
  const set = (rid, nid, v) => { const r = document.getElementById(rid), n = document.getElementById(nid); if(r) r.value = v; if(n) n.value = v; };
  set('rFoot','nFoot', INTENT.footprint); set('rProf','nProf', INTENT.profile);
  set('rDepth','nDepth', INTENT.depth);   set('rBack','nBack', INTENT.backrest);
  document.querySelectorAll('.rim-edge-btns button[data-lip]').forEach(b => b.classList.toggle('active', +b.dataset.lip === INTENT.lip));
}
function applyIntent(changedKey){
  const sizeOnly = changedKey === 'size';
  let n = 0;
  while(true){
    intentWriteP(sizeOnly);
    sanitizeBase();
    if(minWallGap() >= 5 || n++ >= 20) break;      // 壁厚守門（Basic 靜默鉗制，不彈警告）
    if(!intentRetreat(changedKey)) break;
  }
  intentSyncControls();
  buildTub();
}
// P → INTENT（提案帶入／網址覆寫／載入時）。只同步顯示，不改 P
function syncIntentFromP(){
  const L = Math.max(1, P.L);
  INTENT.footprint = intentClamp(Math.round(50 + ((P.obL / L) - INTENT_FOOT_BASE_L) / INTENT_FOOT_STEP), 0, 100);
  const baseR = INTENT_R_BASE.riL * L;
  INTENT.profile = intentClamp(Math.round(50 + INTENT_PROFILE_SPAN * Math.log2(Math.max(1, P.riL) / baseR)), 0, 100);
  INTENT.depth = intentClamp(Math.round((P.H - P.b) / 10) * 10, 400, 560);
  INTENT.backrest = intentClamp(Math.round(P.dH / 10) * 10, 0, 150);
  INTENT.lip = INTENT_LIPS.includes(P.lip) ? P.lip : 20;
  intentSyncControls();
}
// 事件綁定（元素存在才綁）
(function(){
  [['rFoot','nFoot','footprint',1], ['rProf','nProf','profile',1], ['rDepth','nDepth','depth',10], ['rBack','nBack','backrest',10]].forEach(([rid, nid, key, step]) => {
    const r = document.getElementById(rid), n = document.getElementById(nid);
    if(!r || !n) return;
    r.addEventListener('input', () => { INTENT[key] = +r.value; n.value = r.value; applyIntent(key); });
    n.addEventListener('change', () => {
      let v = parseInt(String(n.value).replace(/[^\d-]/g,''), 10);
      if(isNaN(v)) v = INTENT[key];   // S1-1b(2026-09-02)：非數字→維持原值，不跳到 min
      v = Math.round(intentClamp(v, +r.min, +r.max) / step) * step;
      INTENT[key] = v; applyIntent(key);
    });
  });
  document.querySelectorAll('.rim-edge-btns button[data-lip]').forEach(b => b.addEventListener('click', () => { INTENT.lip = +b.dataset.lip; applyIntent('lip'); }));
})();
// S2(2026-09-02)：外部長寬下方即時顯示內部尺寸；用 MutationObserver 監看 #spec（與 D1 同手法，不改引擎）
function refreshDimsInner(){
  const el = document.getElementById('dimsInner');
  if(!el || typeof innerDims !== 'function') return;
  const inn = innerDims();
  el.textContent = t('Interior') + ' ' + inn.L + ' × ' + inn.W + ' mm · ' + t('depth') + ' ' + (P.H - P.b) + ' mm';
}
(function(){
  const spec = document.getElementById('spec');
  if(!spec) return;
  new MutationObserver(refreshDimsInner).observe(spec, { childList:true, subtree:true });
  refreshDimsInner();
})();
// 載入時同步一次（本檔在 lib-tub-boot.js 之後載入，P 已建好）
syncIntentFromP();
