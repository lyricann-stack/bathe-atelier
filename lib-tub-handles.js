// lib-tub-handles.js 3D 拖曳把手 — 由 customize.html 抽出（行 3026-3151），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== 拖曳把手（簡易模式核心：直接在缸體上拉外型） =====================
// 4 顆金色把手：長度（+x 端）／寬度（+z 側）／高度（後端缸緣）／弧度飽滿度（−z 側，僅 factory 模式）
// 拖曳時等比連動 factory 底部尺寸與 R → 客人拉出的每個造型都是一張合法工廠圖
let handleGroup = null, dragH = null;
const _ray = new THREE.Raycaster(), _mv = new THREE.Vector2(), _dragPlane = new THREE.Plane(), _hitPt = new THREE.Vector3();
function buildHandles(){
  if(handleGroup){
    scene.remove(handleGroup);
    handleGroup.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
    handleGroup = null;
  }
  if(extGroup || !tubGroup || !tubGroup.children.length || window._noHandles) return;
  handleGroup = new THREE.Group();
  // 小型金色「雙向箭頭」：一眼看出可以抓著往哪個方向拉
  const hMat = ()=> new THREE.MeshStandardMaterial({color:0x9a7b43, roughness:0.3, metalness:0.25, emissive:0x2e2410});
  const mkArrow = (name, axis) => {
    const g = new THREE.Group();
    const mat = hMat();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 64, 12), mat);
    const tipA = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 15, 26, 14), mat);   // 尖端朝 +Y
    tipA.position.y = 32 + 13;
    const tipB = tipA.clone();
    tipB.rotation.z = Math.PI;                                                        // 尖端朝 −Y
    tipB.position.y = -(32 + 13);
    g.add(shaft, tipA, tipB);
    // 隱形命中球：箭頭視覺纖細，但拖曳判定維持好抓（含觸控）
    const hitS = new THREE.Mesh(
      new THREE.SphereGeometry(48, 8, 6),
      new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false})
    );
    g.add(hitS);
    if(axis === 'x') g.rotation.z = Math.PI/2;        // 雙向箭頭沿 X（長度方向）
    else if(axis === 'z') g.rotation.x = Math.PI/2;   // 沿 Z（寬度方向）
    g.userData.h = name;                              // 'y' 維持直立（高度方向）
    handleGroup.add(g);
    return g;
  };
  mkArrow('len', 'x'); mkArrow('wid', 'z'); mkArrow('hgt', 'y');
  if(isFactory()) mkArrow('blg', 'z');
  scene.add(handleGroup);
  updateHandles();
}
function updateHandles(){
  if(!handleGroup) return;
  const h = Math.max(1, P.H + P.dH/2);
  handleGroup.children.forEach(m=>{
    const n = m.userData.h, ks = shellKxy(0.55, false);
    if(n === 'len')      m.position.set((P.L/2)*Math.max(ks[0], 0.82) + 46, h*0.55, 0);
    else if(n === 'wid') m.position.set(0, h*0.55, (P.W/2)*Math.max(ks[1], 0.82) + 46);
    else if(n === 'hgt'){ const xr = -P.L/2*0.88; m.position.set(xr, rimH(xr, P.L, P.H, P.dH) + 44, 0); }
    else { const kb = shellKxy(0.5, false); m.position.set(0, h*0.5, -((P.W/2)*kb[1] + 46)); }
  });
}
let _pendingBuild = false;
function requestBuild(){
  if(_pendingBuild) return;
  _pendingBuild = true;
  const run = ()=>{ if(!_pendingBuild) return; _pendingBuild = false; syncUI(); buildTub(); };
  requestAnimationFrame(run);
  setTimeout(run, 60);   // 分頁被遮蔽時 rAF 會被節流 → 保險用 timeout 補跑
}
// 弧半徑 ↔ 中點鼓度換算（外缸短邊剖面為基準）
function _sagX(R, p, qEnd, zm){ return arcBetween(p, qEnd, R, +1, zm); }
function _solveR(p, qEnd, zm, targetX){
  const chord = Math.hypot(qEnd[0]-p[0], qEnd[1]-p[1]);
  let lo = chord*0.55, hi = 30000;
  // arcBetween 對 R 單調遞減（R 越大越平）
  for(let i=0;i<40;i++){
    const mid = (lo+hi)/2;
    if(_sagX(mid, p, qEnd, zm) > targetX) lo = mid; else hi = mid;
  }
  return (lo+hi)/2;
}
canvas.addEventListener('pointerdown', e=>{
  if(!handleGroup) return;
  const r = canvas.getBoundingClientRect();
  _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
  _ray.setFromCamera(_mv, camera);
  const hit = _ray.intersectObjects(handleGroup.children, true)[0];   // 箭頭是 Group，遞迴命中後往上找名稱
  if(!hit) return;
  let hObj = hit.object;
  while(hObj && !hObj.userData.h) hObj = hObj.parent;
  if(!hObj) return;
  const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
  _dragPlane.setFromNormalAndCoplanarPoint(camDir, hObj.position.clone());
  dragH = { name: hObj.userData.h, start: { L:P.L, W:P.W, H:P.H, obL:P.obL, obW:P.obW, ibL:P.ibL, ibW:P.ibW, roL:P.roL, roW:P.roW, riL:P.riL, riW:P.riW, wallR:P.wallR, taper:P.taper } };
  dragging = false;                       // 壓住把手時不旋轉視角
  e.stopImmediatePropagation();
}, true);
window.addEventListener('pointermove', e=>{
  if(!dragH) return;
  const r = canvas.getBoundingClientRect();
  _mv.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
  _ray.setFromCamera(_mv, camera);
  if(!_ray.ray.intersectPlane(_dragPlane, _hitPt)) return;
  const st = dragH.start, h = Math.max(1, P.H + P.dH/2);
  if(dragH.name === 'len'){
    const newL = Math.max(1200, Math.min(2200, Math.round((Math.abs(_hitPt.x) - 46)*2/10)*10));
    const f = newL/st.L;
    P.L = newL;
    P.obL = Math.min(newL-40, Math.round(st.obL*f/2)*2);
    P.ibL = Math.min(P.obL-30, Math.round(st.ibL*f/2)*2);
    P.riL = Math.round(st.riL*f); P.roL = Math.round(st.roL*f);
    requestBuild();
  } else if(dragH.name === 'wid'){
    const newW = Math.max(600, Math.min(1200, Math.round((Math.abs(_hitPt.z) - 46)*2/10)*10));
    const f = newW/st.W;
    P.W = newW;
    P.obW = Math.min(newW-40, Math.round(st.obW*f/2)*2);
    P.ibW = Math.min(P.obW-30, Math.round(st.ibW*f/2)*2);
    P.riW = Math.round(st.riW*f); P.roW = Math.round(st.roW*f);
    requestBuild();
  } else if(dragH.name === 'hgt'){
    P.H = Math.max(400, Math.min(750, Math.round((_hitPt.y - 44)/10)*10));
    requestBuild();
  } else if(dragH.name === 'blg'){
    // 拖外缸短邊中段 → 反解 R，四個 R 等比連動（維持內外弧關係）
    const target = Math.max(P.obW/2 + 10, Math.min(P.W/2*1.0, Math.abs(_hitPt.z) - 46));
    const Rnew = _solveR([st.obW/2, 0], [st.W/2, h], h*0.5, target);
    const f = Math.max(0.4, Math.min(4, Rnew/st.roW));
    P.roW = Math.round(st.roW*f); P.roL = Math.round(st.roL*f);
    P.riW = Math.round(st.riW*f); P.riL = Math.round(st.riL*f);
    requestBuild();
  }
});
window.addEventListener('pointerup', ()=>{ dragH = null; });
