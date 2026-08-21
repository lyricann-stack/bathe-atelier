// ===================== lib-edit3d-handles.js =====================
// Phase 5抽取(2026-08-20)：逐字抽自photo2tub-app.html 3352-4398行的EDIT_MODE節點編輯系統(~1050行單一IIFE)。
// 這是pro.html的**全新能力**，不是逐行對應pro.html既有的`lib-tub-handles.js`(較簡單的drag-handles，
// 不含節點編輯/透視校正/圖片描邊)——整合進pro.html時**不要同時載入`lib-tub-handles.js`**，改由
// 本檔的EDIT_MODE系統完全取代(檔首`window._noHandles = true`本來就是設計來停用舊系統的開關，
// 但更乾淨的做法是pro.html的script清單根本不再引用lib-tub-handles.js，而非兩者並存靠旗標互斥)。
// 已補回第3處wallmount注入點(recomputeOutline的貼牆邊鎖x邏輯，對照wallface-test.html 3600-3604行)，
// 至此wallFace模式的3處注入點(geometry.js的loft/strip×2 + 這裡的recomputeOutline×1)全部到位。
// 依賴：P/scene/camera/canvas/tubGroup/orbit(scene.js)、outlinePts/innerOutlinePts/shellKxy/rimH/
// rimModI/innerDims/sanitizeBase/buildTub(geometry.js)、syncUI(ui.js)、traceImage/processTopSketch
// (sketch.js)、captureRenders/importSpecJSON/importDXF/importSTL(export.js/import.js)、
// wallFaceMode/wallIdxWeight(wallmount.js)、大量DOM ID(panel/nodePanel/rNodeA-D/perspOverlay等，
// 需與pro.html本體HTML的節點編輯UI區塊完全對應，這部分屬於「全頁組裝」步驟，不在本檔案抽取範圍)。
// ⚠️高風險提醒：這是~1050行單一IIFE，大量closure狀態(nodes/baseO/baseI/baseB/selNode等)，
// 抽取時逐字保留未改動任何邏輯(除了上述wallmount補丁)，但實際掛進pro.html後**必須做完整的
// Chrome瀏覽器節點編輯測試**(拖曳外缸口/內盆口/底部外緣/側面剖面各一次+刪除節點+reset)，
// 不能只看語法檢查通過就當作完成。
// ⚠️瀏覽器實測時抓到的真實bug(非假設性)：`pickAt()`跟pointerdown/pointermove監聽器用到的
// `_ray`/`_mv`/`_dragPlane`/`_hitPt`/`dragH`，原本是宿主單檔架構裡「拖曳把手(簡易模式核心)」
// 那段(pro.html既有的lib-tub-handles.js對應區塊)先宣告好、EDIT_MODE的IIFE再共用的模組級變數。
// 因為Phase5決定EDIT_MODE完全取代lib-tub-handles.js(不並存)，這幾個宣告沒有地方來，
// 直接在這裡補上宣告(dragH在EDIT_MODE底下永遠是null，只是拿來滿足舊的hover防呆判斷式)。
const _ray = new THREE.Raycaster(), _mv = new THREE.Vector2(), _dragPlane = new THREE.Plane(), _hitPt = new THREE.Vector3();
let dragH = null;
// Phase 5(2026-08-21)：跟上面_ray等同一原因——handleGroup宣告在被跳過的lib-tub-handles.js
// 「簡易拖曳把手」區塊(EDIT_MODE不用它，改用自己的edgeGrp/nodeGrp)，但export.js的captureRenders()/
// exportPNG()仍會防禦性讀取`handleGroup`(`if(handleGroup)...`)。EDIT_MODE底下這裡永遠維持null，
// export.js的guard本來就會跳過，行為正確；只是需要先宣告避免ReferenceError。
let handleGroup = null;
// 同上：requestBuild()也是「拖曳把手(簡易模式核心)」區塊(lib-tub-handles.js)定義、EDIT_MODE共用的
// 工具函式(rAF批次重建，避免同一畫面多次觸發buildTub())，同樣原因(不並存)在這裡補宣告。
let _pendingBuild = false;
function requestBuild(){
  if(_pendingBuild) return;
  _pendingBuild = true;
  const run = ()=>{ if(!_pendingBuild) return; _pendingBuild = false; syncUI(); buildTub(); };
  requestAnimationFrame(run);
  setTimeout(run, 60);   // 分頁被遮蔽時 rAF 會被節流 → 保險用 timeout 補跑
}
const EDIT_MODE = true;
if(EDIT_MODE){ (function(){
  window._noHandles = true;

  // ---- 面板精簡＋注入 ----
  const panel = document.getElementById('panel');
  panel.querySelectorAll(':scope > .group, :scope > button.preset').forEach(g=>{
    const h = g.querySelector ? g.querySelector('h3') : null;
    const keep = h && (h.textContent.includes('⑦') || h.textContent.includes('⑤'));
    if(!keep) g.style.display = 'none';
  });
  document.querySelectorAll('.btns .btn').forEach(b=>{
    if(b.textContent.includes('Concept PDF')) b.style.display = 'none';
  });
  panel.insertAdjacentHTML('afterbegin', `
  <div class="group" id="editIntro">
    <h3>⬆ Upload → 3D</h3>
    <div class="tip">Upload with the button above: <b>spec JSON / DXF / STL</b> render instantly. <b>Images (PNG/JPG) & PDF drawings</b> are auto-traced — a clean top-view outline becomes the tub shape (depth & walls use defaults; confirm real dimensions). Angled photos: use <b>📐 Fix perspective</b> after upload. Complex photos are better handled by the concierge.</div>
    <button id="perspIntroBtn" style="display:none;margin-top:6px">📐 Angled photo? Fix perspective (4 points)</button>
  </div>
  <div class="group" id="edgeEditGroup">
    <h3>✎ Edge Editing</h3>
    <div class="tip" id="edgeTip"></div>
    <div id="rimGapWarn" class="tip" style="display:none;color:#b3541e">⚠ Inner bowl rim is outside / too close to the outer rim (min edge = wall thickness). Pull it back in.</div>
    <div id="obliqueWarn" class="tip" style="display:none;color:#b3541e">⚠ <b>This looks like an angled / perspective photo</b> — the traced shape is the 3D silhouette, not the true rim outline. For an accurate shape, upload a straight <b>top-down</b> image, use <b>📐 Fix perspective</b> below, or send the photo to the concierge flow.<br><button id="perspFixBtn" style="margin-top:6px">📐 Fix perspective (click 4 rim points)</button></div>
    <div id="nodePanel" style="display:none">
      <div class="tip" id="nodeEdgeLabel" style="font-weight:600"></div>
      <div class="row" id="rowA"><label id="labA">Node X (length)</label><input type="range" id="rNodeA" min="-1200" max="1200" step="1" value="0"><div class="val"><input id="nNodeA" value="0"><span id="unitA">mm</span></div></div>
      <div class="row" id="rowB"><label id="labB">Node Y (width)</label><input type="range" id="rNodeB" min="-700" max="700" step="1" value="0"><div class="val"><input id="nNodeB" value="0"><span id="unitB">mm</span></div></div>
      <div class="row" id="rowD"><label id="labD">Height Δ (up/down)</label><input type="range" id="rNodeD" min="-250" max="400" step="1" value="0"><div class="val"><input id="nNodeD" value="0"><span>mm</span></div></div>
      <div class="row" id="rowC"><label id="labC">Influence range</label><input type="range" id="rNodeC" min="2" max="24" step="1" value="6"><div class="val"><input id="nNodeC" value="6"><span id="unitC">pt</span></div></div>
      <div class="drain-btns" style="margin-top:8px">
        <button id="delNodeBtn">🗑 Delete node (or double-click it)</button>
        <button id="resetOutlineBtn">↺ Reset all edits</button>
      </div>
      <div class="tip">Deleting a node restores that region to its original curve. The outer shell can never cross inside the inner bowl — drags stop at the limit.</div>
    </div>
  </div>`);
  // 缸緣造型（平面/圓弧/斜角）從隱藏的 ① 群組搬出來
  (function(){
    const rimBtns = panel.querySelector('.rim-btns');
    if(!rimBtns) return;
    const g = document.createElement('div');
    g.className = 'group'; g.id = 'rimProfileGroup';
    const h = document.createElement('h3'); h.textContent = '◐ Rim Profile';
    const tip = document.createElement('div'); tip.className = 'tip';
    tip.textContent = 'Flat = square edge · Rounded = soft bullnose curve · Beveled = chamfered edge. Applies around the whole rim.';
    g.appendChild(h); g.appendChild(rimBtns); g.appendChild(tip);
    const specGroup = [...panel.querySelectorAll(':scope > .group')].find(x=>{
      const hh = x.querySelector('h3'); return hh && hh.textContent.includes('⑤');
    });
    panel.insertBefore(g, specGroup || null);
  })();
  // 長×寬拉條（原 ② 群組的兩列搬出來，沿用引擎的滑桿邏輯）
  (function(){
    const rowL = document.getElementById('rL') && document.getElementById('rL').closest('.row');
    const rowW = document.getElementById('rW') && document.getElementById('rW').closest('.row');
    if(!rowL || !rowW) return;
    const g = document.createElement('div');
    g.className = 'group'; g.id = 'dimGroup';
    const h = document.createElement('h3'); h.textContent = '↔ Length & Width';
    const tip = document.createElement('div'); tip.className = 'tip';
    tip.textContent = 'Overall length / width (mm). Traced or node-edited outlines scale to fit.';
    g.appendChild(h); g.appendChild(rowL); g.appendChild(rowW); g.appendChild(tip);
    panel.insertBefore(g, document.getElementById('rimProfileGroup') || null);
  })();

  // ---- 邊定義 ----
  let SIDE_IDX = [0, 24, 48, 72];   // 預設四條在各面中心；雙擊牆面可在任意位置新增（2026-08-20）
  const EDGE_DEF = {
    outer:  { color:0xc9a227, label:'Outer rim edge' },
    inner:  { color:0xb0703c, label:'Inner bowl edge' },
    base:   { color:0x6f8ba3, label:'Base edge' },
    side:   { color:0x6e9b6a, label:'Side profile' }
  };

  // ---- 狀態 ----
  let nodes = [];                       // {edge,i0,v,sigma,dx,dy,dz,dk,dL,dW,createdAt}
  let baseO = null, baseI = null, baseB = null;
  let origSnap = null;
  let edgeGrp = null, tubes = {}, hiTubes = {};
  let nodeGrp = null, selectedEdge = null, hoverKey = null, selNode = null, dragN = null;
  let _lastL = P.L, _lastW = P.W;       // L/W 滑桿與節點基準（mm）的同步縮放
  let dragDrain = false;                // Phase 7：去水口拖曳中旗標，跟side/outer節點拖曳(dragN)分開管理
  let dragOvf = false;                  // Phase 7：溢水孔拖曳中旗標(內壁面周向+深度，跟去水口的缸底面座標系不同)

  // ---- 幾何輔助 ----
  const outMM = () => outlinePts(P.shape, P.L, P.W, P.r, P.egg, N_SEG);
  const innMM = () => innerOutlinePts(innerDims(), N_SEG);
  const gaussI = (d, s) => { d = Math.abs(d); d = Math.min(d, N_SEG - d); return Math.exp(-(d*d)/(2*s*s)); };
  const rimTopAt = (x, i) => rimH(x, P.L, P.H, P.dH) + rimModI(i);
  function captureOrig(){
    if(!origSnap) origSnap = {
      shape:P.shape, egg:P.egg, L:P.L, W:P.W, obL:P.obL, obW:P.obW, ibL:P.ibL, ibW:P.ibW,
      pts:P.customPts ? P.customPts.map(p=>p.slice()) : null,
      ptsI:P.customPtsInner ? P.customPtsInner.map(p=>p.slice()) : null,
      wallMod:P.wallMod ? P.wallMod.slice() : null,
      rimMod:P.rimMod ? P.rimMod.slice() : null
    };
  }
  function ensureBaseO(){
    captureOrig();
    if(baseO) return;
    if(P.shape !== 'custom' || !P.customPts){
      P.customPts = outMM().map(p=>[p[0]/P.L, p[1]/P.W]);
      P.shape = 'custom'; P.egg = 0;
    }
    baseO = { pts: P.customPts.map(p=>[p[0]*P.L, p[1]*P.W]) };
    if(P.customPtsInner && !baseI)
      baseI = { pts: P.customPtsInner.map(p=>[p[0]*P.L, p[1]*P.W]), passive:true };
  }
  function ensureBaseI(){
    captureOrig();
    if(baseI && !baseI.passive) return;
    if(!P.customPtsInner)
      P.customPtsInner = innMM().map(p=>[p[0]/P.L, p[1]/P.W]);
    if(!baseI) baseI = { pts: P.customPtsInner.map(p=>[p[0]*P.L, p[1]*P.W]) };
    baseI.passive = false;
  }
  function ensureBaseB(){
    captureOrig();
    if(!baseB) baseB = { obL:P.obL, obW:P.obW, ibL:P.ibL, ibW:P.ibW };
  }
  // L/W 滑桿改變 → 節點基準（mm）等比縮放，避免下一次節點操作把尺寸彈回
  function syncBaseScale(){
    const fx = P.L/_lastL, fy = P.W/_lastW;
    if(Math.abs(fx-1)<1e-9 && Math.abs(fy-1)<1e-9) return;
    [baseO, baseI].forEach(b=>{ if(b) b.pts.forEach(p=>{ p[0]*=fx; p[1]*=fy; }); });
    nodes.forEach(n=>{ if(typeof n.dx==='number'){ n.dx*=fx; n.dy*=fy; } });
    _lastL = P.L; _lastW = P.W;
  }
  ['rL','nL','rW','nW'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ ['input','change'].forEach(ev=>el.addEventListener(ev, ()=>setTimeout(syncBaseScale, 0))); }
  });

  // ---- 重算（基準＋節點貢獻），不觸發重建 ----
  function recomputeOutline(){
    if(!baseO && !baseI) return;
    const on = nodes.filter(n=>n.edge==='outer'), inn = nodes.filter(n=>n.edge==='inner');
    let fo = null, fi = null;
    if(baseO) fo = baseO.pts.map((p,j)=>{
      let x=p[0], y=p[1];
      on.forEach(n=>{ const w=gaussI(j-n.i0, n.sigma); if(w>0.01){ x+=n.dx*w; y+=n.dy*w; } });
      return [x,y];
    });
    // Phase 4 P4-M1(併入lib-edit3d-wallmount.js)：貼牆邊索引範圍鎖x(只准沿y調整長度)，節點編輯不會把貼牆面拉彎
    if(fo && wallFaceMode && P.wallEdgeStart != null){
      const s=P.wallEdgeStart, e=P.wallEdgeEnd;
      const inRange = idx => (s<=e) ? (idx>=s && idx<e) : (idx>=s || idx<e);
      fo.forEach((p,j)=>{ if(inRange(j)) p[0] = baseO.pts[j][0]; });
    }
    if(baseI) fi = baseI.pts.map((p,j)=>{
      let x=p[0], y=p[1];
      inn.forEach(n=>{ const w=gaussI(j-n.i0, n.sigma); if(w>0.01){ x+=n.dx*w; y+=n.dy*w; } });
      return [x,y];
    });
    if(fo){
      let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
      fo.forEach(p=>{ if(p[0]<mnx)mnx=p[0]; if(p[0]>mxx)mxx=p[0]; if(p[1]<mny)mny=p[1]; if(p[1]>mxy)mxy=p[1]; });
      const newL=Math.max(400,Math.round(mxx-mnx)), newW=Math.max(300,Math.round(mxy-mny));
      const cx=(mnx+mxx)/2, cy=(mny+mxy)/2;
      if(Math.abs(cx)>0.01 || Math.abs(cy)>0.01){
        const sh = a=>a.forEach(p=>{ p[0]-=cx; p[1]-=cy; });
        sh(fo); sh(baseO.pts);
        if(fi) sh(fi); if(baseI) sh(baseI.pts);
      }
      P.L=newL; P.W=newW;
      P.customPts = fo.map(p=>[p[0]/P.L, p[1]/P.W]);
    }
    if(fi) P.customPtsInner = fi.map(p=>[p[0]/P.L, p[1]/P.W]);
    P.obL=Math.min(P.obL,P.L-40); P.obW=Math.min(P.obW,P.W-40);
    P.ibL=Math.min(P.ibL,P.obL-10); P.ibW=Math.min(P.ibW,P.obW-10);
    if(typeof sanitizeBase==='function') sanitizeBase();
    _lastL = P.L; _lastW = P.W;
  }
  function recomputeSide(){
    const sn = nodes.filter(n=>n.edge==='side');
    if(!sn.length){
      P.wallMod = origSnap && origSnap.wallMod ? origSnap.wallMod.slice() : null;
      return;
    }
    const base = origSnap && origSnap.wallMod ? origSnap.wallMod : null;
    P.wallMod = Array.from({length:33}, (_,m)=>{
      const v=m/32; let s = base ? base[m] : 0;
      sn.forEach(n=>{ const w=Math.exp(-((v-n.v)*(v-n.v))/(2*n.sigma*n.sigma)); if(w>0.01) s+=n.dk*w; });
      return +s.toFixed(4);
    });
  }
  function recomputeRim(){
    const rn = nodes.filter(n=>n.edge==='outer' && Math.abs(n.dz||0) > 0.5);
    if(!rn.length){
      P.rimMod = origSnap && origSnap.rimMod ? origSnap.rimMod.slice() : null;
      return;
    }
    const base = origSnap && origSnap.rimMod ? origSnap.rimMod : null;
    P.rimMod = Array.from({length:N_SEG}, (_,j)=>{
      let s = base ? (base[j]||0) : 0;
      rn.forEach(n=>{ const w=gaussI(j-n.i0, n.sigma); if(w>0.01) s+=n.dz*w; });
      return Math.round(s*10)/10;
    });
  }
  function recomputeBase(){
    if(!baseB) return;
    let dL=0,dW=0;
    nodes.filter(n=>n.edge==='base').forEach(n=>{ dL+=n.dL; dW+=n.dW; });
    P.obL = Math.max(300, Math.min(P.L-40, Math.round(baseB.obL+dL)));
    P.obW = Math.max(200, Math.min(P.W-40, Math.round(baseB.obW+dW)));
    P.ibL = Math.min(P.obL-10, Math.round(P.obL*baseB.ibL/baseB.obL));
    P.ibW = Math.min(P.obW-10, Math.round(P.obW*baseB.ibW/baseB.obW));
    if(typeof sanitizeBase==='function') sanitizeBase();
  }
  function recomputeData(){ recomputeOutline(); recomputeSide(); recomputeRim(); recomputeBase(); }
  function recomputeAll(){ recomputeData(); requestBuild(); syncNodePanel(); }

  // ---- 硬防呆：外殼任何取樣點不得進入內殼＋壁厚 ----
  function shellsOK(){
    const o = outMM(), q = innMM(), minGap = Math.max(5, P.t);
    // a) 缸口平面：內輪廓在外輪廓之內且距離足夠（僅在獨立內輪廓時需檢查）
    if(P.customPtsInner){
      for(let i=0;i<q.length;i+=2){
        let dmin=Infinity;
        for(let j=0;j<o.length;j++){ const d=Math.hypot(o[j][0]-q[i][0], o[j][1]-q[i][1]); if(d<dmin)dmin=d; }
        let inside=false;
        for(let j=0,k=o.length-1;j<o.length;k=j++){
          const a=o[j], b=o[k];
          if((a[1]>q[i][1])!==(b[1]>q[i][1]) && q[i][0] < (b[0]-a[0])*(q[i][1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
        }
        if(!inside || dmin < minGap) return false;
      }
    }
    // b) 側壁全高度：外殼半徑 ≥ 內殼半徑＋間隙（v × 8 方位取樣）
    for(let vi=1; vi<=9; vi++){
      const v=vi/10, ko=shellKxy(v,false), ki=shellKxy(v,true);
      for(const idx of [0,12,24,36,48,60,72,84]){
        const po=o[idx], pi=q[idx];
        const ro=Math.hypot(po[0]*ko[0], po[1]*ko[1]);
        const ri=Math.hypot(pi[0]*ki[0], pi[1]*ki[1]);
        if(ro < ri + 4) return false;
      }
    }
    return true;
  }
  // 套用變更並驗證；違反內外缸限制就還原（拖曳停在邊界）
  function applyChecked(mutate, revert){
    mutate();
    recomputeData();
    if(!shellsOK()){
      revert();
      recomputeData();
      return false;
    }
    return true;
  }

  // ---- 邊的 3D 曲線 ----
  function edgePts3(key){
    if(key==='outer') return outMM().map((p,i)=>new THREE.Vector3(p[0], rimTopAt(p[0], i)+2, p[1]));
    if(key==='inner') return innMM().map((p,i)=>new THREE.Vector3(p[0], rimTopAt(p[0], i)+2, p[1]));
    if(key==='base'){
      const k = shellKxy(0,false);
      return outMM().map(p=>new THREE.Vector3(p[0]*k[0], 2, p[1]*k[1]));
    }
    const i0 = +key.split('_')[1];
    const p = outMM()[i0], zt = rimTopAt(p[0], i0), pts=[];
    for(let m=0;m<=32;m++){
      const v=m/32, k=shellKxy(v,false);
      pts.push(new THREE.Vector3(p[0]*k[0], v*zt, p[1]*k[1]));
    }
    return pts;
  }
  function edgeType(key){ return key.startsWith('side') ? 'side' : key; }
  function nodePos3(nd){
    if(nd.edge==='outer'){ const p=outMM()[nd.i0]; return new THREE.Vector3(p[0], rimTopAt(p[0], nd.i0)+2, p[1]); }
    if(nd.edge==='inner'){ const p=innMM()[nd.i0]; return new THREE.Vector3(p[0], rimTopAt(p[0], nd.i0)+2, p[1]); }
    if(nd.edge==='base'){ const p=outMM()[nd.i0], k=shellKxy(0,false); return new THREE.Vector3(p[0]*k[0], 2, p[1]*k[1]); }
    const p=outMM()[nd.i0], k=shellKxy(nd.v,false);
    return new THREE.Vector3(p[0]*k[0], nd.v*rimTopAt(p[0], nd.i0), p[1]*k[1]);
  }
  function disposeGrp(g){
    if(!g) return;
    scene.remove(g);
    g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
  }
  function buildEdges(light){
    disposeGrp(edgeGrp); edgeGrp=null; tubes={}; hiTubes={};
    if((typeof extGroup!=='undefined' && extGroup) || !tubGroup || !tubGroup.children.length){
      disposeGrp(nodeGrp); nodeGrp=null; return;
    }
    edgeGrp = new THREE.Group();
    const keys = ['outer','inner','base'].concat(SIDE_IDX.map(i=>'side_'+i));
    keys.forEach(key=>{
      const closed = edgeType(key)!=='side';
      const curve = new THREE.CatmullRomCurve3(edgePts3(key), closed);
      const col = EDGE_DEF[edgeType(key)].color;
      const hi = new THREE.Mesh(
        new THREE.TubeGeometry(curve, closed?192:64, 5, 6, closed),
        new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:selectedEdge===key?0.95:0, depthTest:false})
      );
      hi.renderOrder=5; hiTubes[key]=hi; edgeGrp.add(hi);
      if(!light){
        let pickCurve = curve;
        if(edgeType(key)==='side'){
          const full = edgePts3(key);
          pickCurve = new THREE.CatmullRomCurve3(full.slice(3, 30), false);
        }
        const pick = new THREE.Mesh(
          new THREE.TubeGeometry(pickCurve, closed?96:48, edgeType(key)==='side'?30:36, 6, closed && edgeType(key)!=='side'),
          new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false})
        );
        pick.userData.edgeKey = key;
        tubes[key]=pick; edgeGrp.add(pick);
      }
    });
    scene.add(edgeGrp);
    buildNodes();
    checkRimGap();
  }
  function buildNodes(){
    disposeGrp(nodeGrp); nodeGrp = new THREE.Group();
    nodes.forEach(nd=>{
      const sel = nd===selNode;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(16,12,10),
        new THREE.MeshStandardMaterial({color:EDGE_DEF[nd.edge].color, roughness:0.35, metalness:0.3,
          emissive:sel?0x666048:0x1a1408, depthTest:false})
      );
      m.renderOrder=6; m.scale.setScalar(sel?1.35:1);
      m.position.copy(nodePos3(nd)); m.userData.node = nd;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(42,8,6),
        new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
      hit.position.copy(m.position); hit.userData.node = nd;
      nodeGrp.add(m, hit);
    });
    scene.add(nodeGrp);
  }
  function checkRimGap(){
    const warn = document.getElementById('rimGapWarn');
    if(!P.customPtsInner){ warn.style.display='none'; return; }
    warn.style.display = shellsOK() ? 'none' : 'block';
  }

  // ---- 揀選 ----
  function pickAt(e, objs){
    if(!objs || !objs.length) return null;
    if(nodeGrp) nodeGrp.updateMatrixWorld(true);
    if(edgeGrp) edgeGrp.updateMatrixWorld(true);
    const r = canvas.getBoundingClientRect();
    _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    _ray.setFromCamera(_mv, camera);
    return _ray.intersectObjects(objs, false)[0] || null;
  }

  // ---- 面板 ----
  const $ = id=>document.getElementById(id);
  const TIP0 = 'Editable edges — <b style="color:#9a7b43">outer rim</b> (gold, drag in any direction: sideways reshapes, <b>up/down changes local rim height</b>), <b style="color:#a3652f">inner bowl</b> (copper), <b style="color:#5c7f9c">base</b> (blue), <b style="color:#597f54">side profiles</b> (green: drag <b>out/in = bulge</b>, <b>up/down = move it along the wall</b>).<br>① Click an edge to <b>select</b> ② click again to <b>add a node</b> ③ <b>drag</b> to reshape. <b>Double-click the tub wall adds a side profile right there</b> — not just at the four centers. <b>Double-click a node deletes it</b> and the curve springs back.';
  function showNodePanel(){
    $('nodePanel').style.display = selNode ? 'block' : 'none';
    if(selNode){
      $('nodeEdgeLabel').textContent = '● ' + EDGE_DEF[selNode.edge].label +
        (selNode.edge==='side' ? ' (whole shell)' : ' — node #'+selNode.i0);
      $('rowD').style.display = selNode.edge==='outer' ? '' : 'none';
      if(selNode.edge==='side'){
        $('labA').textContent='Height position'; $('unitA').textContent='%';
        $('rNodeA').min=5; $('rNodeA').max=95;
        $('labB').textContent='Bulge (out +/in −)'; $('unitB').textContent='mm';
        $('rNodeB').min=-300; $('rNodeB').max=500;
        $('labC').textContent='Influence (height)'; $('unitC').textContent='%';
        $('rNodeC').min=4; $('rNodeC').max=40;
        $('rowC').style.display='';
      } else if(selNode.edge==='base'){
        $('labA').textContent='Outer base length'; $('unitA').textContent='mm';
        $('rNodeA').min=300; $('rNodeA').max=Math.round(P.L-40);
        $('labB').textContent='Outer base width'; $('unitB').textContent='mm';
        $('rNodeB').min=200; $('rNodeB').max=Math.round(P.W-40);
        $('rowC').style.display='none';
      } else {
        $('labA').textContent='Node X (length)'; $('unitA').textContent='mm';
        $('rNodeA').min=-Math.round(P.L*0.75); $('rNodeA').max=Math.round(P.L*0.75);
        $('labB').textContent='Node Y (width)'; $('unitB').textContent='mm';
        $('rNodeB').min=-Math.round(P.W*0.75); $('rNodeB').max=Math.round(P.W*0.75);
        $('labC').textContent='Influence range'; $('unitC').textContent='pt';
        $('rNodeC').min=2; $('rNodeC').max=24;
        $('rowC').style.display='';
      }
    }
    $('edgeTip').innerHTML = selectedEdge
      ? (selNode ? 'Drag the node on the model, or fine-tune below. <b>Double-click a node deletes it</b> and restores the curve. Outer shell stops at the inner-bowl limit automatically.'
                 : ('<b>'+EDGE_DEF[edgeType(selectedEdge)].label+'</b> selected — click anywhere on it to <b>add a node</b>. Click another edge to switch.'))
      : TIP0;
    syncNodePanel();
  }
  function rRawAt(nd){
    const p = outMM()[nd.i0];
    const saved = P.wallMod; P.wallMod = null;
    const k = shellKxy(nd.v, false);
    P.wallMod = saved;
    return Math.hypot(p[0]*k[0], p[1]*k[1]);
  }
  let _sync = false;
  function syncNodePanel(){
    if(!selNode || _sync) return;
    _sync = true;
    if(selNode.edge==='side'){
      $('rNodeA').value = $('nNodeA').value = Math.round(selNode.v*100);
      $('rNodeB').value = $('nNodeB').value = Math.round(selNode.dk * rRawAt(selNode));
      $('rNodeC').value = $('nNodeC').value = Math.round(selNode.sigma*100);
    } else if(selNode.edge==='base'){
      $('rNodeA').value = $('nNodeA').value = P.obL;
      $('rNodeB').value = $('nNodeB').value = P.obW;
    } else {
      const base = (selNode.edge==='outer'?baseO:baseI).pts[selNode.i0];
      $('rNodeA').value = $('nNodeA').value = Math.round(base[0]+selNode.dx);
      $('rNodeB').value = $('nNodeB').value = Math.round(base[1]+selNode.dy);
      $('rNodeC').value = $('nNodeC').value = selNode.sigma;
      if(selNode.edge==='outer'){ $('rNodeD').value = $('nNodeD').value = Math.round(selNode.dz||0); }
    }
    _sync = false;
  }
  function panelSet(slot, val){
    if(!selNode || _sync) return;
    const nd = selNode;
    let prev;
    if(nd.edge==='side'){
      if(slot==='A'){ prev=nd.v; applyChecked(()=>{ nd.v=Math.max(0.05,Math.min(0.95,val/100)); }, ()=>{ nd.v=prev; }); }
      else if(slot==='B'){ prev=nd.dk; applyChecked(()=>{ nd.dk=val/Math.max(50,rRawAt(nd)); }, ()=>{ nd.dk=prev; }); }
      else if(slot==='C'){ prev=nd.sigma; applyChecked(()=>{ nd.sigma=Math.max(0.04,Math.min(0.4,val/100)); }, ()=>{ nd.sigma=prev; }); }
    } else if(nd.edge==='base'){
      const others = nodes.filter(n=>n.edge==='base' && n!==nd);
      if(slot==='A'){ prev=nd.dL; applyChecked(()=>{ nd.dL=val-baseB.obL-others.reduce((s,n)=>s+n.dL,0); }, ()=>{ nd.dL=prev; }); }
      else if(slot==='B'){ prev=nd.dW; applyChecked(()=>{ nd.dW=val-baseB.obW-others.reduce((s,n)=>s+n.dW,0); }, ()=>{ nd.dW=prev; }); }
    } else {
      const base = (nd.edge==='outer'?baseO:baseI).pts[nd.i0];
      if(slot==='A'){ prev=nd.dx; applyChecked(()=>{ nd.dx=val-base[0]; }, ()=>{ nd.dx=prev; }); }
      else if(slot==='B'){ prev=nd.dy; applyChecked(()=>{ nd.dy=val-base[1]; }, ()=>{ nd.dy=prev; }); }
      else if(slot==='C'){ prev=nd.sigma; applyChecked(()=>{ nd.sigma=Math.max(2,Math.min(24,val)); }, ()=>{ nd.sigma=prev; }); }
      else if(slot==='D' && nd.edge==='outer'){ prev=nd.dz||0; applyChecked(()=>{ nd.dz=Math.max(-300,Math.min(450,val)); }, ()=>{ nd.dz=prev; }); }
    }
    requestBuild(); syncNodePanel();
  }
  ['A','B','C','D'].forEach(slot=>{
    ['input','change'].forEach(ev=>$('rNode'+slot).addEventListener(ev, e=>panelSet(slot, +e.target.value)));
    $('nNode'+slot).addEventListener('change', e=>panelSet(slot, +e.target.value||0));
  });
  function deleteNode(nd){
    nodes = nodes.filter(n=>n!==nd);
    if(selNode===nd) selNode=null;
    recomputeAll(); showNodePanel();
  }
  $('delNodeBtn').addEventListener('click', ()=>{ if(selNode) deleteNode(selNode); });
  $('resetOutlineBtn').addEventListener('click', ()=>{
    if(!origSnap) return;
    P.shape=origSnap.shape; P.egg=origSnap.egg; P.L=origSnap.L; P.W=origSnap.W;
    P.obL=origSnap.obL; P.obW=origSnap.obW; P.ibL=origSnap.ibL; P.ibW=origSnap.ibW;
    P.customPts = origSnap.pts ? origSnap.pts.map(p=>p.slice()) : null;
    P.customPtsInner = origSnap.ptsI ? origSnap.ptsI.map(p=>p.slice()) : null;
    P.wallMod = origSnap.wallMod ? origSnap.wallMod.slice() : null;
    P.rimMod = origSnap.rimMod ? origSnap.rimMod.slice() : null;
    nodes=[]; baseO=null; baseI=null; baseB=null; selNode=null;
    _lastL=P.L; _lastW=P.W;
    requestBuild(); showNodePanel();
  });

  // ---- 加節點 ----
  function addNode(key, pt){
    const type = edgeType(key);
    let nd;
    if(type==='outer' || type==='inner'){
      type==='outer' ? ensureBaseO() : ensureBaseI();
      const o = type==='outer' ? outMM() : innMM();
      let best=0, bd=Infinity;
      o.forEach((p,i)=>{ const d=(p[0]-pt.x)**2+(p[1]-pt.z)**2; if(d<bd){bd=d;best=i;} });
      nd = nodes.find(n=>n.edge===type && n.i0===best);
      if(!nd){ nd={edge:type, i0:best, sigma:6, dx:0, dy:0, dz:0, createdAt:performance.now()}; nodes.push(nd); }
    } else if(type==='base'){
      ensureBaseB();
      const o = outMM(), k = shellKxy(0,false);
      let best=0, bd=Infinity;
      o.forEach((p,i)=>{ const d=(p[0]*k[0]-pt.x)**2+(p[1]*k[1]-pt.z)**2; if(d<bd){bd=d;best=i;} });
      nd = nodes.find(n=>n.edge==='base' && n.i0===best);
      if(!nd){ nd={edge:'base', i0:best, dL:0, dW:0, createdAt:performance.now()}; nodes.push(nd); }
    } else {
      captureOrig();
      const i0 = +key.split('_')[1];
      const zt = rimTopAt(outMM()[i0][0], i0);
      const v = Math.max(0.1, Math.min(0.9, pt.y/Math.max(1,zt)));
      nd = nodes.find(n=>n.edge==='side' && n.i0===i0 && Math.abs(n.v-v)<0.06);
      if(!nd){ nd={edge:'side', i0, v, sigma:0.12, dk:0, createdAt:performance.now()}; nodes.push(nd); }
    }
    selNode = nd; buildNodes(); showNodePanel();
  }

  // ---- 事件 ----
  window.addEventListener('pointermove', e=>{
    if(dragDrain){
      const r = canvas.getBoundingClientRect();
      _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
      _ray.setFromCamera(_mv, camera);
      if(_ray.ray.intersectPlane(_dragPlane, _hitPt)){
        const c = clampDrainPos(_hitPt.x, _hitPt.z);
        P.drainPos = [c.x, c.y];
        requestBuild();
      }
      return;
    }
    if(dragOvf){
      // 溢水孔貼在彎曲的內壁面上，不能像去水口那樣用單一水平面近似——
      // 直接對實際的innerWallMesh做光線投射，取得曲面上的真實命中點再換算(周長索引,深度)。
      const r = canvas.getBoundingClientRect();
      _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
      _ray.setFromCamera(_mv, camera);
      const wallMesh = tubGroup && tubGroup.getObjectByName('innerWallMesh');
      const hits = wallMesh ? _ray.intersectObject(wallMesh) : [];
      if(hits.length){
        const hp = hits[0].point;
        const inn = innerDims();
        const idx = ovfClosestIndex(hp.x, hp.z, inn);
        const pts = innerOutlinePts(inn, N_SEG);
        const rh = rimH(pts[idx][0], inn.L, P.H, P.dH);
        const c = clampOvfPos(idx, rh - hp.y);
        P.ovfPos = [c.t, c.depth];
        requestBuild();
      }
      return;
    }
    if(dragN){
      const r = canvas.getBoundingClientRect();
      _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
      _ray.setFromCamera(_mv, camera);
      if(!_ray.ray.intersectPlane(_dragPlane, _hitPt)) return;
      const nd = dragN.nd;
      if(nd.edge==='outer'){
        // 3 軸拖曳（相機面板）：水平＝塑形、垂直＝缸緣高度
        const dxm = _hitPt.x - dragN.start.x, dym = _hitPt.y - dragN.start.y, dzm = _hitPt.z - dragN.start.z;
        const p={dx:nd.dx, dy:nd.dy, dz:nd.dz||0};
        applyChecked(
          ()=>{ nd.dx=dragN.snap.dx+dxm; nd.dy=dragN.snap.dy+dzm; nd.dz=Math.max(-300,Math.min(450,dragN.snap.dz+dym)); },
          ()=>{ nd.dx=p.dx; nd.dy=p.dy; nd.dz=p.dz; }
        );
      } else if(nd.edge==='inner'){
        const base = baseI.pts[nd.i0];
        const p={dx:nd.dx, dy:nd.dy};
        applyChecked(
          ()=>{ nd.dx=_hitPt.x-base[0]; nd.dy=_hitPt.z-base[1]; },
          ()=>{ nd.dx=p.dx; nd.dy=p.dy; }
        );
      } else if(nd.edge==='base'){
        const po = outMM()[nd.i0], k0=[baseB.obL/P.L, baseB.obW/P.W];
        const bx=po[0]*k0[0], bz=po[1]*k0[1];
        const others = nodes.filter(n=>n.edge==='base' && n!==nd);
        const p={dL:nd.dL, dW:nd.dW};
        applyChecked(()=>{
          if(Math.abs(bx) > P.L*0.15) nd.dL = (Math.abs(_hitPt.x)-Math.abs(bx))*2 - others.reduce((s,n)=>s+n.dL,0);
          if(Math.abs(bz) > P.W*0.15) nd.dW = (Math.abs(_hitPt.z)-Math.abs(bz))*2 - others.reduce((s,n)=>s+n.dW,0);
        }, ()=>{ nd.dL=p.dL; nd.dW=p.dW; });
      } else {
        const po = outMM()[nd.i0];
        const saved=P.wallMod; P.wallMod=null; const k=shellKxy(nd.v,false); P.wallMod=saved;
        const rx=po[0]*k[0], rz=po[1]*k[1], rr=Math.hypot(rx,rz);
        const ux=rx/rr, uz=rz/rr;
        const rTarget = _hitPt.x*ux + _hitPt.z*uz;
        const others = nodes.filter(n=>n.edge==='side' && n!==nd)
          .reduce((s,n)=>s + n.dk*Math.exp(-((nd.v-n.v)**2)/(2*n.sigma**2)), 0);
        const zt = rimTopAt(po[0], nd.i0);
        const p={dk:nd.dk, v:nd.v};
        applyChecked(
          ()=>{ nd.dk = Math.max(-0.5, Math.min(2, rTarget/rr - 1 - others));
                nd.v = Math.max(0.05, Math.min(0.95, _hitPt.y/Math.max(1, zt))); },   // 上下拖＝移動凸肚高度位置
          ()=>{ nd.dk=p.dk; nd.v=p.v; }
        );
      }
      requestBuild(); syncNodePanel();
      return;
    }
    if(!edgeGrp || dragging || dragH || e.target!==canvas) return;
    let cur='';
    hoverKey=null;
    if(nodeGrp && pickAt(e, nodeGrp.children)) cur='grab';
    else {
      const hit = pickAt(e, Object.values(tubes));
      if(hit){ cur='pointer'; hoverKey = hit.object.userData.edgeKey; }
    }
    Object.keys(hiTubes).forEach(k=>{
      hiTubes[k].material.opacity = selectedEdge===k ? 0.95 : (hoverKey===k ? 0.5 : 0);
    });
    canvas.style.cursor = cur;
  });
  window.addEventListener('pointerdown', e=>{
    if(e.target!==canvas || !edgeGrp) return;
    // Phase 7(2026-08-21)：去水口拖曳——檢查優先於節點/邊線命中，避免跟既有EDIT_MODE互動衝突。
    // drainHandle是buildTub()裡加進tubGroup的實心圓柱，每次重建都會拿到新的mesh實例，
    // 用name查找而不是保留舊引用(舊引用在下一次buildTub()後就是已dispose的孤兒物件)。
    const drainMesh = tubGroup && tubGroup.getObjectByName('drainHandle');
    if(drainMesh){
      const dh = pickAt(e, [drainMesh]);
      if(dh){
        _dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,1,0), dh.point);
        dragDrain = true;
        e.stopPropagation(); e.preventDefault();
        return;
      }
    }
    // 溢水孔拖曳——同去水口模式，命中ovfHandle即接管；mesh只在P.ovf開啟時才存在，不用額外判斷。
    const ovfMesh = tubGroup && tubGroup.getObjectByName('ovfHandle');
    if(ovfMesh){
      const oh = pickAt(e, [ovfMesh]);
      if(oh){
        dragOvf = true;
        e.stopPropagation(); e.preventDefault();
        return;
      }
    }
    const nh = nodeGrp && pickAt(e, nodeGrp.children);
    if(nh){
      const nd = nh.object.userData.node;
      if(nd.edge==='outer') ensureBaseO();
      else if(nd.edge==='inner') ensureBaseI();
      else if(nd.edge==='base') ensureBaseB();
      else captureOrig();
      selNode = nd; selectedEdge = nd.edge==='side' ? 'side_'+nd.i0 : nd.edge;
      buildNodes(); showNodePanel();
      const p3 = nodePos3(nd);
      if(nd.edge==='outer' || nd.edge==='side'){
        // 相機面板：outer 垂直分量＝缸緣高度；side 垂直分量＝凸肚高度位置
        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
        _dragPlane.setFromNormalAndCoplanarPoint(camDir, p3);
      } else {
        _dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,1,0), p3);
      }
      dragN = { nd, snap:{dx:nd.dx||0, dy:nd.dy||0, dz:nd.dz||0}, start:p3.clone() };
      e.stopPropagation(); e.preventDefault();
      return;
    }
    const eh = pickAt(e, Object.values(tubes));
    if(eh){
      const key = eh.object.userData.edgeKey;
      if(selectedEdge!==key){
        selectedEdge = key;
        Object.keys(hiTubes).forEach(k=>{ hiTubes[k].material.opacity = k===key?0.95:0; });
        showNodePanel();
      } else addNode(key, eh.point);
      e.stopPropagation(); e.preventDefault();
      return;
    }
    if(selNode){ selNode=null; buildNodes(); showNodePanel(); }
  }, true);
  window.addEventListener('dblclick', e=>{
    if(e.target!==canvas || !nodeGrp) return;
    const nh = pickAt(e, nodeGrp.children);
    if(nh){
      const nd = nh.object.userData.node;
      if(performance.now() - (nd.createdAt||0) < 600) return;
      deleteNode(nd);
      e.stopPropagation(); e.preventDefault();
      return;
    }
    // 雙擊浴缸牆面任意位置 → 在該角度新增一條側面線（不再限於四個面中心）
    if(!tubGroup || !tubGroup.children.length || (typeof extGroup!=='undefined' && extGroup)) return;
    const r = canvas.getBoundingClientRect();
    _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    _ray.setFromCamera(_mv, camera);
    const wh = _ray.intersectObjects(tubGroup.children, true)[0];
    if(!wh) return;
    const o = outMM(), ha = Math.atan2(wh.point.z, wh.point.x);
    let best=0, bd=1e9;
    o.forEach((p,i)=>{ const da=Math.atan2(p[1],p[0])-ha; const w=Math.abs(Math.atan2(Math.sin(da),Math.cos(da))); if(w<bd){bd=w;best=i;} });
    let d0=1e9; SIDE_IDX.forEach(i=>{ let d=Math.abs(i-best); d=Math.min(d, N_SEG-d); if(d<d0) d0=d; });
    let key;
    if(d0 <= 3){ const nearest = SIDE_IDX.reduce((a,i)=>{ let d=Math.abs(i-best); d=Math.min(d,N_SEG-d); let da=Math.abs(a-best); da=Math.min(da,N_SEG-da); return d<da?i:a; }); key='side_'+nearest; }
    else { SIDE_IDX.push(best); key='side_'+best; buildEdges(); }
    selectedEdge = key;
    Object.keys(hiTubes).forEach(k=>{ hiTubes[k].material.opacity = k===key?0.95:0; });
    addNode(key, wh.point);
    e.stopPropagation(); e.preventDefault();
  }, true);
  window.addEventListener('pointerup', ()=>{
    if(dragDrain){ dragDrain = false; requestBuild(); return; }
    if(dragOvf){ dragOvf = false; requestBuild(); return; }
    if(!dragN) return;
    dragN = null;
    requestBuild();
    setTimeout(syncNodePanel, 120);
  });

  // ---- 掛勾 ----
  const _origBuildTub = buildTub;
  buildTub = function(){
    _origBuildTub();
    buildEdges(!!dragN);
  };
  if(typeof captureRenders === 'function'){
    const _cr = captureRenders;
    captureRenders = async function(...a){
      const ev = edgeGrp?edgeGrp.visible:null, nv = nodeGrp?nodeGrp.visible:null;
      if(edgeGrp) edgeGrp.visible=false;
      if(nodeGrp) nodeGrp.visible=false;
      try { return await _cr.apply(this,a); }
      finally {
        if(edgeGrp && ev!==null) edgeGrp.visible=ev;
        if(nodeGrp && nv!==null) nodeGrp.visible=nv;
      }
    };
  }

  // ---- 上傳擴充：圖檔（PNG/JPG/WebP）與 PDF → 自動描俯視輪廓 → 3D ----
  let _pdfjs = null;
  function ensurePdfJs(){
    if(_pdfjs) return Promise.resolve(_pdfjs);
    return new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = ()=>{
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        _pdfjs = window.pdfjsLib; res(_pdfjs);
      };
      s.onerror = ()=>rej(new Error('pdf.js load failed'));
      document.head.appendChild(s);
    });
  }
  const traceFail = ()=> alert('⚠ Could not detect a clear outline in this file.\nBest input: a TOP-VIEW image with clear contrast (light tub on dark floor, or dark lines on light background), one tub per image.\nFor an angled/perspective photo, try "📐 Fix perspective (4 points)" in the panel; soft-shadow shots are better handled by the concierge.');
  // 前處理：暗色背景（白缸配深地板）自動反相 → 符合描圖引擎「深形淺底」假設
  function normalizeForTrace(src){
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(src, 0, 0, w, h);
    const im = ctx.getImageData(0, 0, w, h), d = im.data;
    // 取邊框一圈的平均亮度（步進取樣）
    let sum=0, n=0;
    const lum = i => 0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2];
    const step = Math.max(1, Math.floor(w/200));
    for(let x=0;x<w;x+=step){ sum+=lum(x)+lum((h-1)*w+x); n+=2; }
    for(let y=0;y<h;y+=step){ sum+=lum(y*w)+lum(y*w+w-1); n+=2; }
    if(sum/n < 112){                       // 暗底 → 反相
      for(let i=0;i<d.length;i+=4){ d[i]=255-d[i]; d[i+1]=255-d[i+1]; d[i+2]=255-d[i+2]; }
      ctx.putImageData(im, 0, 0);
    }
    return cv;
  }
  // 斜拍偵測：PCA 對齊主軸後量「長軸鏡射不對稱度」。俯視缸口幾乎必對稱於長軸
  // （連靠牆 D 形也是）；斜拍剪影近側含側壁、遠側只有缸緣 → 前後兩側不對稱。
  // 回傳值＝平均鏡射誤差 / 寬度（0＝完美對稱）。限制：正對缸端拍的照片量不到（罕見）。
  function obliqueScore(pts){
    let cx=0, cy=0;
    pts.forEach(p=>{ cx+=p[0]; cy+=p[1]; });
    cx/=pts.length; cy/=pts.length;
    let sxx=0, syy=0, sxy=0;
    pts.forEach(p=>{ const x=p[0]-cx, y=p[1]-cy; sxx+=x*x; syy+=y*y; sxy+=x*y; });
    const th = 0.5*Math.atan2(2*sxy, sxx-syy);
    const c=Math.cos(th), s=Math.sin(th);
    const a = pts.map(p=>{ const x=p[0]-cx, y=p[1]-cy; return [x*c+y*s, -x*s+y*c]; });
    let cy2=0; a.forEach(p=>cy2+=p[1]); cy2/=a.length;
    let mny=1e9, mxy=-1e9;
    a.forEach(p=>{ if(p[1]<mny)mny=p[1]; if(p[1]>mxy)mxy=p[1]; });
    let sum=0;
    a.forEach(p=>{
      const my = 2*cy2 - p[1];
      let d=Infinity;
      a.forEach(q=>{ const dd=Math.hypot(q[0]-p[0], q[1]-my); if(dd<d)d=dd; });
      sum+=d;
    });
    return (sum/a.length)/Math.max(1e-6, mxy-mny);
  }
  // 門檻校準（2026-08-10 合成測試）：俯視橢圓 0.017／斜放25° 0.018／D形 0.007／花生 0.012；
  // 斜拍剪影仰角 20°/45°/55°=0.058–0.066、65°=0.039、75°=0.004 → 0.035 抓到 ≤65° 斜拍，對俯視留約 2 倍邊際
  const OBLIQUE_TH = 0.035;
  function importTracedImage(src){
    document.getElementById('obliqueWarn').style.display = 'none';
    _lastPhotoSrc = src;                                   // 透視校正要用原始照片
    const pib = document.getElementById('perspIntroBtn');
    if(pib) pib.style.display = '';
    let raw = null;
    try { raw = traceImage(normalizeForTrace(src)); } catch(err){ console.error(err); }
    if(!raw){ traceFail(); return; }
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    raw.forEach(p=>{ if(p[0]<mnx)mnx=p[0]; if(p[0]>mxx)mxx=p[0]; if(p[1]<mny)mny=p[1]; if(p[1]>mxy)mxy=p[1]; });
    if((mxy-mny) > (mxx-mnx)) raw = raw.map(p=>[p[1], -p[0]]);
    let norm = processTopSketch(raw);
    if(!norm){ traceFail(); return; }
    // 水龍頭/陰影遮擋修補：橡皮筋外拉——只撫平「尖銳窄內凹」（遮擋切痕），寬大的設計凹弧（花生腰等）曲率平緩不受影響
    norm = (function bridgeNotches(pts){
      const n = pts.length, out = pts.map(p=>p.slice());
      const TOL = 0.0035;
      for(let it=0; it<3; it++){     // 僅去像素雜訊——迭代多了會擴散、把寬大設計凹弧（花生腰）也吃掉；主修補靠第二道

        let moved = false;
        for(let i=0;i<n;i++){
          const a = out[(i-1+n)%n], b = out[(i+1)%n], p = out[i];
          const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
          const rr = Math.hypot(p[0], p[1]) || 1;
          const dot = ((mx-p[0])*p[0] + (my-p[1])*p[1]) / rr;   // 鄰點中點在 p 徑向外側 → 尖銳凹陷
          if(dot > TOL){ out[i] = [(p[0]+mx)/2, (p[1]+my)/2]; moved = true; }
        }
        if(!moved) break;
      }
      // 第二道：陡壁窄谷修補——水龍頭切痕＝相鄰點半徑「驟降→驟升」（垂直壁），
      // 設計凹弧（花生腰）＝緩坡（每點變化小一個數量級），不會誤判。
      const n2 = out.length, TH = 0.02, SPAN = 10;
      for(let pass=0; pass<2; pass++){
        const rad = out.map(p=>Math.hypot(p[0], p[1]));
        for(let i=0;i<n2;i++){
          const drop = rad[(i+1)%n2] - rad[i];
          if(drop > -TH) continue;                        // 找驟降入口
          for(let j=i+1; j<=i+SPAN; j++){
            const rise = rad[(j+1)%n2] - rad[j%n2];
            if(rise > TH){                                // 對應的驟升出口 → i+1..j 是切痕
              const rA = rad[i], rB = rad[(j+1)%n2], len = j-i;
              for(let k=1;k<=len;k++){
                const jj=(i+k)%n2, f=k/(len+1);
                const rNew = rA + (rB-rA)*f;
                const th = Math.atan2(out[jj][1], out[jj][0]);
                out[jj]=[rNew*Math.cos(th), rNew*Math.sin(th)];
              }
              i = j;
              break;
            }
          }
        }
      }
      return out;
    })(norm);
    // 防呆：浴缸輪廓近乎凸形，圖紙雜訊呈刺蝟狀 → 面積/凸包比過低即判失敗
    const hull = (pts=>{
      const s = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      const cross = (o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
      const lo=[], up=[];
      s.forEach(p=>{ while(lo.length>=2 && cross(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); });
      s.slice().reverse().forEach(p=>{ while(up.length>=2 && cross(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); });
      return lo.slice(0,-1).concat(up.slice(0,-1));
    })(norm);
    const area = a=>{ let s=0; for(let i=0;i<a.length;i++){ const p=a[i],q=a[(i+1)%a.length]; s+=p[0]*q[1]-q[0]*p[1]; } return Math.abs(s)/2; };
    if(area(norm) < area(hull)*0.75){ traceFail(); return; }
    nodes=[]; baseO=null; baseI=null; baseB=null; origSnap=null; selNode=null; selectedEdge=null;
    P.customPts = norm; P.customPtsInner = null; P.wallMod = null; P.rimMod = null;
    P.shape = 'custom'; P.egg = 0;
    const rh = Math.max(1, Math.min(mxy-mny, mxx-mnx));
    const rl = Math.max(mxy-mny, mxx-mnx);
    P.W = Math.max(300, Math.min(1400, Math.round(P.L*(rh/rl)/10)*10));
    P.obL = Math.min(P.obL, P.L-40); P.obW = Math.min(P.obW, P.W-40);
    P.ibL = Math.min(P.ibL, P.obL-10); P.ibW = Math.min(P.ibW, P.obW-10);
    if(typeof sanitizeBase === 'function') sanitizeBase();
    _lastL = P.L; _lastW = P.W;
    syncUI(); buildTub(); showNodePanel();
    // norm 被 processTopSketch 按軸各自正規化到 ±0.5（長寬比被抹掉）→ 先用原始 bbox 還原真實比例再評分
    const obScore = obliqueScore(norm.map(p=>[p[0]*rl, p[1]*rh]));
    window._lastObliqueScore = obScore;          // 無頭測試/門檻校準用
    if(obScore > OBLIQUE_TH){
      $('obliqueWarn').style.display = 'block';
      $('edgeTip').innerHTML = '⚠ <b>Outline traced, but it may come from an angled photo</b> (front/back sides don\'t mirror). Treat the shape as approximate — see the warning below.';
    } else {
      $('edgeTip').innerHTML = '✓ <b>Outline traced from your file.</b> Length/width use the current scale (confirm real dims!), depth & walls use defaults — refine everything with the edges and nodes below.';
    }
  }
  window.importTracedImage = importTracedImage;
  (function(){
    const old = document.getElementById('cadFile');
    if(!old) return;
    const input = old.cloneNode(true);
    input.accept = '.dxf,.stl,.json,.png,.jpg,.jpeg,.webp,.pdf';
    old.parentNode.replaceChild(input, old);
    const cadFail = ()=> alert(t('⚠ Could not parse this CAD file (supported: DXF from this tool, 2D outline DXF, STL, spec JSON from this tool)'));
    input.addEventListener('change', e=>{
      const f = e.target.files[0];
      if(!f) return;
      const name = f.name.toLowerCase();
      if(/\.(png|jpe?g|webp)$/.test(name)){
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = ()=>{ importTracedImage(img); URL.revokeObjectURL(url); };
        img.onerror = ()=>{ URL.revokeObjectURL(url); traceFail(); };
        img.src = url;
      } else if(name.endsWith('.pdf')){
        ensurePdfJs()
          .then(lib => f.arrayBuffer().then(buf => lib.getDocument({data:buf}).promise))
          .then(doc => doc.getPage(1))
          .then(page => {
            const vp0 = page.getViewport({scale:1});
            const scale = Math.min(3, 1400/vp0.width);
            const vp = page.getViewport({scale});
            const cv = document.createElement('canvas');
            cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
            // intent:'print'：避開 rAF 渲染路徑（分頁被節流時 display intent 會停滯）
            return page.render({canvasContext: cv.getContext('2d'), viewport: vp, intent:'print'}).promise.then(()=>cv);
          })
          .then(cv => importTracedImage(cv))
          .catch(err => { console.error(err); traceFail(); });
      } else {
        const reader = new FileReader();
        reader.onload = ()=>{
          try {
            if(name.endsWith('.json'))      importSpecJSON(reader.result);
            else if(name.endsWith('.dxf'))  importDXF(reader.result);
            else if(name.endsWith('.stl'))  importSTL(reader.result);
            else cadFail();
          } catch(err){ console.error(err); cadFail(); }
        };
        if(name.endsWith('.stl')) reader.readAsArrayBuffer(f);
        else reader.readAsText(f);
      }
      e.target.value = '';
    });
  })();

  // ---- 透視校正（半自動）：斜拍照上點缸口 4 極點＋實際長寬 → 單應變換攤平成俯視再描 ----
  // 基準面＝缸口平面（4 點都在缸緣上）。攤平後把缸口 bbox 以外像素塗成背景色，
  // 近側側壁殘影（低仰角時剪影超出缸緣的部分）直接裁掉——Lyric 2026-08-10 的基準線思路。
  let _lastPhotoSrc = null, _perspPts = [];
  const PERSP_STEPS = [
    '① Click the FAR END of the outer rim (one end of the tub\'s length)',
    '② Click the NEAR END of the outer rim (the other end of the length)',
    '③ Click the LEFT-MOST point of the outer rim',
    '④ Click the RIGHT-MOST point of the outer rim',
    '✓ 4 points set — check the real dimensions below, then press "Flatten & trace". (Undo to re-place a point.)'
  ];
  document.body.insertAdjacentHTML('beforeend', `
  <div id="perspOverlay" style="position:fixed;inset:0;background:rgba(24,20,14,.88);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px">
    <div id="perspHead" style="color:#fff;font-weight:600;max-width:86vw;text-align:center;font-size:15px"></div>
    <canvas id="perspCanvas" style="max-width:92vw;max-height:68vh;cursor:crosshair;border-radius:8px;background:#333"></canvas>
    <div style="display:flex;gap:10px;align-items:center;color:#fff;flex-wrap:wrap;justify-content:center">
      <label>Real length <input id="perspL" type="number" min="400" max="3000" step="10" style="width:72px"> mm</label>
      <label>Real width <input id="perspW" type="number" min="250" max="2000" step="10" style="width:72px"> mm</label>
      <button id="perspUndo">↩ Undo point</button>
      <button id="perspApply" disabled>✓ Flatten &amp; trace</button>
      <button id="perspCancel">✕ Cancel</button>
    </div>
    <div style="color:#cbc2b4;font-size:12px;max-width:86vw;text-align:center">Click the 4 outermost points of the tub's TOP RIM (not the base). They become the length/width axes of the flattened top view.</div>
  </div>`);
  // 單應矩陣：Heckbert 單位方→四邊形組合（H = Hdst · Hsrc⁻¹），純代數、無消去法
  function sq2quad(q){                    // q: 4 角點，環狀序對應 (0,0),(1,0),(1,1),(0,1)
    const [x0,y0]=q[0], [x1,y1]=q[1], [x2,y2]=q[2], [x3,y3]=q[3];
    const sx=x0-x1+x2-x3, sy=y0-y1+y2-y3;
    if(Math.abs(sx)<1e-12 && Math.abs(sy)<1e-12)
      return [x1-x0, x3-x0, x0, y1-y0, y3-y0, y0, 0, 0, 1];
    const dx1=x1-x2, dx2=x3-x2, dy1=y1-y2, dy2=y3-y2;
    const den=dx1*dy2-dx2*dy1;
    if(Math.abs(den)<1e-12) return null;
    const g=(sx*dy2-dx2*sy)/den, h=(dx1*sy-sx*dy1)/den;
    return [x1-x0+g*x1, x3-x0+h*x3, x0, y1-y0+g*y1, y3-y0+h*y3, y0, g, h, 1];
  }
  function mul3(a,b){
    const r=[];
    for(let i=0;i<3;i++) for(let j=0;j<3;j++){
      let s=0;
      for(let k=0;k<3;k++) s+=a[i*3+k]*b[k*3+j];
      r[i*3+j]=s;
    }
    return r;
  }
  function homography(src, dst){          // 4 組對應點（同序）→ 3×3 H（src→dst），退化回傳 null
    const Hs=sq2quad(src), Hd=sq2quad(dst);
    if(!Hs || !Hd) return null;
    const Hsi=invert3(Hs);
    if(!Hsi) return null;
    return mul3(Hd, Hsi);
  }
  function invert3(m){
    const [a,b,c,d,e,f,g,h,i]=m;
    const A=e*i-f*h, B=c*h-b*i, C=b*f-c*e;
    const det=a*A+d*B+g*C;
    if(Math.abs(det)<1e-12) return null;
    return [A/det,B/det,C/det,(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det,(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det];
  }
  const segX=(a,b,c,d)=>{                 // 線段 ab 與 cd 是否相交（①② 端軸應與 ③④ 側軸交叉）
    const s=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
    return s(a,b,c)*s(a,b,d)<0 && s(c,d,a)*s(c,d,b)<0;
  };
  function perspWarp(src, pts, L, W){
    // pts＝①遠端 ②近端 ③左 ④右；sq2quad 需環狀序 → ①③②④（對應菱形 (-L/2,0)(0,-W/2)(L/2,0)(0,W/2)）
    const H = homography([pts[0],pts[2],pts[1],pts[3]], [[-L/2,0],[0,-W/2],[L/2,0],[0,W/2]]);
    if(!H) return null;
    const Hi = invert3(H);
    if(!Hi) return null;
    const sw = src.naturalWidth||src.width, sh = src.naturalHeight||src.height;
    const scv=document.createElement('canvas'); scv.width=sw; scv.height=sh;
    const sctx=scv.getContext('2d'); sctx.drawImage(src,0,0,sw,sh);
    const sd=sctx.getImageData(0,0,sw,sh).data;
    // 背景色＝原圖邊框平均色（讓 normalizeForTrace 的暗底反相邏輯照常運作）
    let br=0,bg=0,bb=0,bn=0;
    const st=Math.max(1,Math.floor(sw/200));
    const acc=i=>{ br+=sd[i*4]; bg+=sd[i*4+1]; bb+=sd[i*4+2]; bn++; };
    for(let x=0;x<sw;x+=st){ acc(x); acc((sh-1)*sw+x); }
    for(let y=0;y<sh;y+=st){ acc(y*sw); acc(y*sw+sw-1); }
    br=Math.round(br/bn); bg=Math.round(bg/bn); bb=Math.round(bb/bn);
    const spanX=L*1.06, spanY=W*1.06;
    const dw=1000, dh=Math.max(2,Math.round(dw*spanY/spanX));
    const dcv=document.createElement('canvas'); dcv.width=dw; dcv.height=dh;
    const dctx=dcv.getContext('2d');
    const dim=dctx.createImageData(dw,dh), dd=dim.data;
    for(let py=0;py<dh;py++){
      const ymm=((py+0.5)/dh-0.5)*spanY;
      for(let px=0;px<dw;px++){
        const xmm=((px+0.5)/dw-0.5)*spanX;
        let r=br,g=bg,b=bb;
        if(Math.abs(xmm)<=L/2 && Math.abs(ymm)<=W/2){       // 缸口 bbox 外＝背景（裁掉近側側壁殘影）
          const w=Hi[6]*xmm+Hi[7]*ymm+Hi[8];
          const sx=Math.round((Hi[0]*xmm+Hi[1]*ymm+Hi[2])/w);
          const sy=Math.round((Hi[3]*xmm+Hi[4]*ymm+Hi[5])/w);
          if(sx>=0&&sx<sw&&sy>=0&&sy<sh){ const i=(sy*sw+sx)*4; r=sd[i]; g=sd[i+1]; b=sd[i+2]; }
        }
        const o=(py*dw+px)*4; dd[o]=r; dd[o+1]=g; dd[o+2]=b; dd[o+3]=255;
      }
    }
    dctx.putImageData(dim,0,0);
    return dcv;
  }
  function perspFlattenAndTrace(pts, realL, realW){
    if(!_lastPhotoSrc || pts.length!==4) return false;
    if(!segX(pts[0],pts[1],pts[2],pts[3])){
      alert('⚠ Point order looks wrong: ① ② must be the two ENDS of the length, ③ ④ the two SIDES (the two lines should cross). Undo and re-place.');
      return false;
    }
    const warped = perspWarp(_lastPhotoSrc, pts, realL, realW);
    if(!warped){ alert('⚠ Could not compute a perspective from these 4 points — they may be nearly collinear. Undo and re-place.'); return false; }
    const savedSrc=_lastPhotoSrc, keepL=P.L;
    P.L = realL;
    window._lastObliqueScore = null;
    importTracedImage(warped);
    _lastPhotoSrc = savedSrc;                              // 保留原始照片供再次校正
    if(window._lastObliqueScore === null){ P.L = keepL; return false; }   // 描圖失敗（已 alert）
    P.L = realL; P.W = realW;                              // 使用者給的實際尺寸＝絕對尺寸
    P.obL=Math.min(P.obL,P.L-40); P.obW=Math.min(P.obW,P.W-40);
    P.ibL=Math.min(P.ibL,P.obL-10); P.ibW=Math.min(P.ibW,P.obW-10);
    if(typeof sanitizeBase==='function') sanitizeBase();
    _lastL=P.L; _lastW=P.W;
    syncUI(); buildTub();
    $('edgeTip').innerHTML = '✓ <b>Perspective-corrected trace applied.</b> Outline flattened from your 4 rim points; length/width set to your real dimensions. Depth &amp; walls still use defaults — refine with the edges and nodes below.';
    return true;
  }
  window._perspFlattenAndTrace = perspFlattenAndTrace;     // 無頭測試用
  window._getPerspPts = ()=>_perspPts.map(p=>p.slice());   // 無頭測試用
  function perspDraw(){
    const cv=$('perspCanvas'), src=_lastPhotoSrc;
    const sw=src.naturalWidth||src.width, sh=src.naturalHeight||src.height;
    cv.width=sw; cv.height=sh;
    const ctx=cv.getContext('2d');
    ctx.drawImage(src,0,0,sw,sh);
    const R=Math.max(6,Math.round(sw/130));
    _perspPts.forEach((p,i)=>{
      ctx.beginPath(); ctx.arc(p[0],p[1],R,0,7);
      ctx.fillStyle = i<2 ? '#e0b13e' : '#5c9bd6';
      ctx.fill();
      ctx.lineWidth=Math.max(2,R/4); ctx.strokeStyle='#1c1913'; ctx.stroke();
      ctx.font='bold '+(R*2)+'px sans-serif';
      ctx.fillStyle='#fff'; ctx.strokeStyle='#1c1913'; ctx.lineWidth=R/2;
      ctx.strokeText('①②③④'[i], p[0]+R*1.3, p[1]-R*0.6);
      ctx.fillText('①②③④'[i], p[0]+R*1.3, p[1]-R*0.6);
    });
    if(_perspPts.length>=2){
      ctx.setLineDash([R,R]); ctx.lineWidth=Math.max(2,R/4); ctx.strokeStyle='#e0b13e';
      ctx.beginPath(); ctx.moveTo(_perspPts[0][0],_perspPts[0][1]); ctx.lineTo(_perspPts[1][0],_perspPts[1][1]); ctx.stroke();
      if(_perspPts.length===4){
        ctx.strokeStyle='#5c9bd6';
        ctx.beginPath(); ctx.moveTo(_perspPts[2][0],_perspPts[2][1]); ctx.lineTo(_perspPts[3][0],_perspPts[3][1]); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    $('perspHead').textContent = PERSP_STEPS[_perspPts.length];
    $('perspApply').disabled = _perspPts.length!==4;
  }
  function openPersp(){
    if(!_lastPhotoSrc){ alert('⚠ Upload a photo first, then fix its perspective.'); return; }
    _perspPts=[];
    $('perspL').value=P.L; $('perspW').value=P.W;
    $('perspOverlay').style.display='flex';
    perspDraw();
  }
  $('perspCanvas').addEventListener('click', e=>{
    if(_perspPts.length>=4) return;
    const cv=$('perspCanvas'), r=cv.getBoundingClientRect();
    if(r.width<2 || r.height<2) return;                    // layout 未完成（防 NaN 座標）
    const x=(e.clientX-r.left)*cv.width/r.width, y=(e.clientY-r.top)*cv.height/r.height;
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;
    _perspPts.push([x, y]);
    perspDraw();
  });
  $('perspUndo').addEventListener('click', ()=>{ _perspPts.pop(); perspDraw(); });
  $('perspCancel').addEventListener('click', ()=>{ $('perspOverlay').style.display='none'; });
  $('perspApply').addEventListener('click', ()=>{
    const L=Math.round(+$('perspL').value), W=Math.round(+$('perspW').value);
    if(!(L>=400 && L<=3000 && W>=250 && W<=2000)){ alert('⚠ Real dimensions out of range (length 400–3000 mm, width 250–2000 mm).'); return; }
    if(perspFlattenAndTrace(_perspPts, L, W)) $('perspOverlay').style.display='none';
  });
  $('perspFixBtn').addEventListener('click', openPersp);
  $('perspIntroBtn').addEventListener('click', openPersp);

  // ?spec=<url>：載入指定規格檔（測試連結用）
  const _specUrl = new URLSearchParams(location.search).get('spec');
  if(_specUrl && /^[\w./-]+\.json$/.test(_specUrl))
    setTimeout(()=>{ fetch(_specUrl).then(r=>r.text()).then(t=>importSpecJSON(t)).catch(()=>{}); }, 300);

  // 匯入新檔＝重置編輯狀態
  ['importSpecJSON','importDXF','importSTL'].forEach(fn=>{
    if(typeof window[fn] === 'function'){
      const _f = window[fn];
      window[fn] = function(...a){
        nodes=[]; baseO=null; baseI=null; baseB=null; origSnap=null; selNode=null; selectedEdge=null;
        const ow = document.getElementById('obliqueWarn'); if(ow) ow.style.display='none';
        const r = _f.apply(this,a);
        _lastL = P.L; _lastW = P.W;
        // Phase 5(2026-08-20)：修正wallface-test.html既有的一個真實bug(非本次引入)——
        // importSpecJSON()只還原P.tub_type/P.wallEdgeStart，從不同步wallFaceMode這個獨立旗標，
        // 導致匯入一份靠牆缸spec後，tub_type顯示對但wallIdxWeight()因wallFaceMode仍是false而
        // 完全不生效(貼牆抑制幾何不會套用)。瀏覽器實測匯入回圈時抓到，這裡補同步。
        if(typeof wallFaceMode !== 'undefined') wallFaceMode = (P.tub_type === 'wall');
        const sel = document.getElementById('photo2tubType');
        if(sel && P.tub_type) sel.value = P.tub_type;
        showNodePanel();
        return r;
      };
    }
  });
  showNodePanel();
})(); }
