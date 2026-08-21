// ===================== lib-edit3d-import.js =====================
// Phase 5合併(2026-08-20)：以lib-tub-import.js為底，疊上Edit3D節點編輯版新增的差異：
// importSpecJSON()讀回3個節點編輯狀態欄位(手繪內缸口輪廓_normalized/側壁外形修飾_33/缸緣高度修飾_96)、
// importDXF匯入時清空P.customPtsInner(避免帶著舊的手繪內輪廓誤用)。extGroup沿用lib-edit3d-export.js宣告。

// lib-tub-import.js 外部 CAD 匯入（Pro 專用） — 由 customize.html 抽出（行 2266-2519），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
function clearExt(){
  if(extGroup){
    scene.remove(extGroup);
    extGroup.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
    extGroup = null;
  }
  document.getElementById('extBanner').style.display = 'none';
}

document.getElementById('cadFile').addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  const name = f.name.toLowerCase();
  const fail = ()=> alert(t('⚠ Could not parse this CAD file (supported: DXF from this tool, 2D outline DXF, STL, spec JSON from this tool)'));
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      if(name.endsWith('.json'))      importSpecJSON(reader.result);
      else if(name.endsWith('.dxf'))  importDXF(reader.result);
      else if(name.endsWith('.stl'))  importSTL(reader.result);
      else fail();
    } catch(err){ console.error(err); fail(); }
  };
  if(name.endsWith('.stl')) reader.readAsArrayBuffer(f);
  else reader.readAsText(f);
  e.target.value = '';
});

// 套用參數物件（來自 DXF 內嵌 PARAMS 或 JSON 規格表）
function applyParams(p){
  ['L','W','H','t','b','r','dH','egg','taper','arc','slope','wallR','wallR2','wallMid','skirtH','waistK','skirtR',
   'lip','obL','obW','ibL','ibW','riL','riW','roL','roW','ovfDrop'].forEach(k=>{ if(typeof p[k] === 'number') P[k] = p[k]; });
  if(typeof p.undercut !== 'undefined') P.undercut = !!(+p.undercut);
  if(typeof p.skirt !== 'undefined') P.skirt = !!(+p.skirt);
  if(typeof p.ovf !== 'undefined') P.ovf = !!(+p.ovf);
  if(p.wallMode && ['factory','curve','arc','s'].includes(p.wallMode)) P.wallMode = p.wallMode;
  else if(typeof p.wallArc !== 'undefined' && +p.wallArc) P.wallMode = 'arc';   // 舊版閉環相容
  if(p.rim) P.rim = p.rim;
  if(p.drain) P.drain = p.drain;
  if(p.drainPos && Array.isArray(p.drainPos)) P.drainPos = p.drainPos;   // Phase 7：DXF PARAMS 閉環還原去水口自訂座標
  if(p.shape) P.shape = p.shape;
  sanitizeBase();   // 匯入來源（DXF PARAMS / JSON）也不得違反外>內缸底
  document.querySelectorAll('.rim-btns button').forEach(b=>b.classList.toggle('active', b.dataset.rim === P.rim));
  document.querySelectorAll('.drain-btns button[data-drain]').forEach(b=>b.classList.toggle('active', b.dataset.drain === P.drain));
  syncUI();
}

// 本系統 JSON 規格表 → 完整還原設計
function importSpecJSON(text){
  const o = JSON.parse(text);
  const d = o.設計參數 || o;
  applyParams({
    shape: d.shape_code, L: d.外部長度_mm, W: d.外部寬度_mm, H: d.缸緣高度_前端_mm,
    t: d.缸壁厚度_mm, b: d.缸底厚度_mm, r: d.圓角半徑_mm, dH: d.靠背增高_mm,
    egg: d.蛋形係數_pct, taper: d.底部收縮_pct, arc: d.增高弧度_pct, rim: d.rim_code, drain: d.排水孔位置,
    slope: d.排水洩水角度_deg, undercut: typeof d.允許倒扣 !== 'undefined' ? (d.允許倒扣 ? 1 : 0) : undefined,
    wallR: d.側壁弧度R_mm, wallR2: d.上段弧R2_mm, wallMid: d.S轉折高度_pct,
    wallMode: d.側壁模式, wallArc: typeof d.側壁圓弧模式 !== 'undefined' ? (d.側壁圓弧模式 ? 1 : 0) : undefined,
    lip: d.缸邊寬_mm, obL: d.外缸底長_mm, obW: d.外缸底寬_mm, ibL: d.內缸底長_mm, ibW: d.內缸底寬_mm,
    riL: d.內缸弧R_長邊剖面_mm, riW: d.內缸弧R_短邊剖面_mm, roL: d.外缸弧R_長邊剖面_mm, roW: d.外缸弧R_短邊剖面_mm,
    ovf: typeof d.溢水口 !== 'undefined' ? (d.溢水口 ? 1 : 0) : undefined, ovfDrop: d.溢水口距缸緣_mm,
    skirt: typeof d.裙擺式底座 !== 'undefined' ? (d.裙擺式底座 ? 1 : 0) : undefined,
    skirtH: d.裙擺高度_mm, waistK: d.收腰寬度_pct, skirtR: d.裙擺弧R_mm
  });
  if(d.手繪俯視輪廓_normalized) P.customPts = d.手繪俯視輪廓_normalized;
  P.customPtsInner = d.手繪內缸口輪廓_normalized || null;
  P.wallMod = d.側壁外形修飾_33 || null;
  P.rimMod = d.缸緣高度修飾_96 || null;
  if(d.手繪側牆剖面_k) P.customProfile = d.手繪側牆剖面_k;
  P.drainPos = (d.去水口自訂座標 && Array.isArray(d.去水口自訂座標)) ? d.去水口自訂座標 : null;
  if(d.tub_type || d.缸型) P.tub_type = d.tub_type || d.缸型;
  if(d.貼牆邊索引範圍){ P.wallEdgeStart = d.貼牆邊索引範圍[0]; P.wallEdgeEnd = d.貼牆邊索引範圍[1]; }
  if(d.material_code === 'solid' || d.material_code === 'acrylic'){
    P.material = d.material_code;
    document.querySelectorAll('.mat-btns button[data-mat]').forEach(b=>b.classList.toggle('active', b.dataset.mat === P.material));
  }
  updateRowVis();
  buildTub();
}

// ---------- DXF 解析 ----------
function importDXF(text){
  const lines = text.split(/\r?\n/);
  const texts = [], segs = [], loops = [], circles = [];
  let i = 0, section = '', ent = null;

  function flushEnt(){
    if(!ent) return;
    if(ent.type === 'TEXT' && ent.str) texts.push(ent.str);
    if(ent.type === 'LINE' && ent.x1 !== undefined) segs.push([[ent.x1, ent.y1], [ent.x2, ent.y2]]);
    if(ent.type === 'CIRCLE' && ent.r) circles.push(ent);
    if(ent.type === 'ARC' && ent.r){
      let a0 = ent.a0*Math.PI/180, a1 = ent.a1*Math.PI/180;
      if(a1 < a0) a1 += Math.PI*2;
      const n = Math.max(4, Math.ceil((a1-a0)/0.3));
      for(let k=0;k<n;k++){
        const p = a0+(a1-a0)*k/n, q = a0+(a1-a0)*(k+1)/n;
        segs.push([[ent.cx+ent.r*Math.cos(p), ent.cy+ent.r*Math.sin(p)], [ent.cx+ent.r*Math.cos(q), ent.cy+ent.r*Math.sin(q)]]);
      }
    }
    if((ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') && ent.pts && ent.pts.length > 2){
      const pts = [];
      for(let k=0;k<ent.pts.length;k++){
        const a = ent.pts[k], b = ent.pts[(k+1) % ent.pts.length];
        pts.push([a[0], a[1]]);
        const bulge = ent.bulges ? (ent.bulges[k] || 0) : 0;
        if(bulge && (k < ent.pts.length-1 || ent.closed)){          // Rounded段取樣
          const th = 4*Math.atan(bulge);
          const d = Math.hypot(b[0]-a[0], b[1]-a[1])/2;
          if(d > 1e-6){
            const rr = d/Math.sin(th/2);
            const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
            const h = Math.sqrt(Math.max(0, rr*rr - d*d)) * Math.sign(bulge) * (Math.abs(th) > Math.PI ? -1 : 1);
            const cx = mx - h*(b[1]-a[1])/(2*d), cy = my + h*(b[0]-a[0])/(2*d);
            const sa = Math.atan2(a[1]-cy, a[0]-cx);
            for(let m=1;m<8;m++) pts.push([cx+Math.abs(rr)*Math.cos(sa+th*m/8), cy+Math.abs(rr)*Math.sin(sa+th*m/8)]);
          }
        }
      }
      if(ent.closed) loops.push(pts);
      else for(let k=0;k<pts.length-1;k++) segs.push([pts[k], pts[k+1]]);
    }
  }
  while(i < lines.length-1){
    const code = lines[i].trim(), val = lines[i+1].trim();
    i += 2;
    if(code === '0'){
      flushEnt();
      ent = { type: val, pts: [], bulges: [] };
      if(val === 'SECTION') section = '';
      continue;
    }
    if(!ent) continue;
    if(code === '2' && ent.type === 'SECTION') section = val;
    if(ent.type === 'TEXT' && code === '1') ent.str = val;
    if(ent.type === 'LINE'){
      if(code === '10') ent.x1 = +val; if(code === '20') ent.y1 = +val;
      if(code === '11') ent.x2 = +val; if(code === '21') ent.y2 = +val;
    }
    if(ent.type === 'CIRCLE' || ent.type === 'ARC'){
      if(code === '10') ent.cx = +val; if(code === '20') ent.cy = +val;
      if(code === '40') ent.r = +val;
      if(code === '50') ent.a0 = +val; if(code === '51') ent.a1 = +val;
    }
    if(ent.type === 'LWPOLYLINE'){
      if(code === '10'){ ent.pts.push([+val, 0]); ent.bulges.push(0); }
      if(code === '20' && ent.pts.length) ent.pts[ent.pts.length-1][1] = +val;
      if(code === '42' && ent.pts.length) ent.bulges[ent.pts.length-1] = +val;
      if(code === '70') ent.closed = (+val & 1) === 1;
    }
    if(ent.type === 'VERTEX'){
      if(code === '10') ent.vx = +val;
      if(code === '20'){ ent.vy = +val; }
    }
    if(ent.type === 'POLYLINE' && code === '70') ent.closed = (+val & 1) === 1;
  }
  flushEnt();
  // 舊式 POLYLINE/VERTEX：將 VERTEX 併回（簡化：掃描第二次）
  // （本系統輸出的 DXF 使用 LINE，通用檔多為 LWPOLYLINE，此處已涵蓋主要情況）

  // 1) 內嵌參數 → 直接還原
  const pTxt = texts.find(s=>{ try{ const o = JSON.parse(s); return o && o._bathtub; }catch(_){ return false; } });
  if(pTxt){
    applyParams(JSON.parse(pTxt));
    updateRowVis();
    buildTub();
    return;
  }
  // 2) 由封閉輪廓建模：LINE/ARC 鏈接成迴路 + 既有封閉聚合線 + 圓
  chainLoops(segs).forEach(l=>loops.push(l));
  circles.forEach(c=>{ const l=[]; for(let k=0;k<48;k++){ const a=k/48*Math.PI*2; l.push([c.cx+c.r*Math.cos(a), c.cy+c.r*Math.sin(a)]); } loops.push(l); });
  let best = null, bestA = 0;
  loops.forEach(l=>{ const a = shoelace(l); if(a > bestA){ bestA = a; best = l; } });
  if(!best || best.length < 3) throw new Error('no closed loop');

  // 正規化為自訂缸口形狀，長寬取自輪廓實際尺寸
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  best.forEach(p=>{ minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); });
  const bw = maxX-minX, bh = maxY-minY, cx=(minX+maxX)/2, cy=(minY+maxY)/2;
  let pts = resample(best, N_SEG).map(p=>[(p[0]-cx)/bw, (p[1]-cy)/bh]);
  if(shoelaceSigned(pts) < 0) pts.reverse();
  P.customPts = pts; P.customPtsInner = null;
  P.shape = 'custom';
  P.L = Math.round(Math.max(bw, bh));
  P.W = Math.round(Math.min(bw, bh));
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.toggle('active', b.dataset.shape==='custom'));
  syncUI();
  updateRowVis();
  buildTub();
}

// LINE/ARC 線段鏈接成封閉迴路（端點量化配對）
function chainLoops(segs){
  const key = p => Math.round(p[0]*2) + ',' + Math.round(p[1]*2);
  const used = new Array(segs.length).fill(false);
  const map = {};
  segs.forEach((s, i)=>{ [key(s[0]), key(s[1])].forEach(k=>{ (map[k] = map[k] || []).push(i); }); });
  const loops = [];
  for(let i=0;i<segs.length;i++){
    if(used[i]) continue;
    used[i] = true;
    const loop = [segs[i][0].slice(), segs[i][1].slice()];
    let guard = 0;
    while(guard++ < segs.length + 2){
      const endK = key(loop[loop.length-1]);
      if(endK === key(loop[0]) && loop.length > 3) break;         // 閉合
      const cands = (map[endK] || []).filter(j=>!used[j]);
      if(!cands.length) break;
      const j = cands[0];
      used[j] = true;
      loop.push(key(segs[j][0]) === endK ? segs[j][1].slice() : segs[j][0].slice());
    }
    if(loop.length > 3 && key(loop[0]) === key(loop[loop.length-1])){ loop.pop(); loops.push(loop); }
  }
  return loops;
}

// ---------- STL 解析（自製，免外部函式庫） ----------
function importSTL(buf){
  const dv = new DataView(buf);
  let positions;
  const head = new TextDecoder().decode(buf.slice(0, Math.min(500, buf.byteLength)));
  if(head.trim().startsWith('solid') && head.includes('facet')){
    const txt = new TextDecoder().decode(buf);
    const nums = [];
    const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
    let m;
    while(m = re.exec(txt)) nums.push(+m[1], +m[2], +m[3]);
    positions = new Float32Array(nums);
  } else {
    const n = dv.getUint32(80, true);
    if(84 + n*50 > buf.byteLength) throw new Error('bad stl');
    positions = new Float32Array(n*9);
    for(let k=0;k<n;k++){
      const off = 84 + k*50 + 12;
      for(let v=0;v<9;v++) positions[k*9+v] = dv.getFloat32(off + v*4, true);
    }
  }
  if(!positions.length) throw new Error('empty stl');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0xdfe3e8, roughness:0.35, metalness:0.05, side:THREE.DoubleSide}));
  mesh.rotation.x = -Math.PI/2;                                   // CAD 常見 Z 朝上 → 場景 Y 朝上
  clearExt();
  if(tubGroup) tubGroup.visible = false;
  extGroup = new THREE.Group();
  extGroup.add(mesh);
  scene.add(extGroup);
  // 置中、落地、視角自動框取（過小視為公尺 → mm）
  const box = new THREE.Box3().setFromObject(extGroup);
  let size = box.getSize(new THREE.Vector3());
  if(Math.max(size.x, size.y, size.z) < 10){ extGroup.scale.setScalar(1000); box.setFromObject(extGroup); size = box.getSize(new THREE.Vector3()); }
  const c = box.getCenter(new THREE.Vector3());
  extGroup.position.set(-c.x, -box.min.y, -c.z);
  orbit.target.set(0, size.y/2, 0);
  orbit.radius = Math.max(1200, Math.max(size.x, size.y, size.z) * 2.2);
  document.getElementById('extBanner').style.display = 'block';
  if(typeof buildHandles === 'function') buildHandles();  // 外部模型檢視中不顯示把手
  if(typeof updatePrice === 'function') updatePrice();   // 上傳 CAD ＝ Bespoke 層級
}
