// lib-tub-export.js DXF/渲染/浮水印/ZIP/PDF/詢價 — 由 customize.html 抽出（行 1450-2264），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== DXF 輸出（Bathe 銷售線圖版型） =====================
// 版面：左側標題欄｜F-F 縱剖（左上）｜平面圖（右上）｜G-G 橫剖（左下）｜公差註記（右下）
// 標註採分解式線段（尺寸界線＋尺寸線＋實心箭頭＋文字），R12/AC1009 全相容
let dxf = '';
const E = {
  line:(x1,y1,x2,y2,layer)=>{ dxf += `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n`; },
  circle:(x,y,r,layer)=>{ dxf += `0\nCIRCLE\n8\n${layer}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n40\n${r.toFixed(2)}\n`; },
  solid:(a,b,c,layer)=>{ dxf += `0\nSOLID\n8\n${layer}\n10\n${a[0].toFixed(2)}\n20\n${a[1].toFixed(2)}\n11\n${b[0].toFixed(2)}\n21\n${b[1].toFixed(2)}\n12\n${c[0].toFixed(2)}\n22\n${c[1].toFixed(2)}\n13\n${c[0].toFixed(2)}\n23\n${c[1].toFixed(2)}\n`; },
  rect:(x,y,w,h,layer)=>{ E.line(x,y,x+w,y,layer); E.line(x+w,y,x+w,y+h,layer); E.line(x+w,y+h,x,y+h,layer); E.line(x,y+h,x,y,layer); },
  text:(x,y,h,str,layer,align,rot)=>{
    dxf += `0\nTEXT\n8\n${layer}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n40\n${h}\n1\n${str}\n`;
    if(rot) dxf += `50\n${(+rot).toFixed(1)}\n`;
    if(align) dxf += `72\n${align===1?1:2}\n11\n${x.toFixed(2)}\n21\n${y.toFixed(2)}\n`;   // 對齊點：1=置中 2=靠右
  },
  poly:(pts,ox,oy,layer)=>{ for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; E.line(a[0]+ox, a[1]+oy, b[0]+ox, b[1]+oy, layer); } },
  path:(pts,ox,oy,layer)=>{ for(let i=0;i<pts.length-1;i++){ E.line(pts[i][0]+ox, pts[i][1]+oy, pts[i+1][0]+ox, pts[i+1][1]+oy, layer); } }
};

// HEADER＋TABLES（線型與圖層定義：虛線/中心線在任何 CAD 都正確顯示）
function dxfHeaderTables(){
  let s = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
  s += '0\nSECTION\n2\nTABLES\n';
  s += '0\nTABLE\n2\nLTYPE\n70\n3\n';
  s += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0\n';
  s += '0\nLTYPE\n2\nDASHED\n70\n0\n3\n- - - - -\n72\n65\n73\n2\n40\n120\n49\n80\n49\n-40\n';
  s += '0\nLTYPE\n2\nCENTER\n70\n0\n3\n____ _ ____\n72\n65\n73\n4\n40\n290\n49\n180\n49\n-40\n49\n30\n49\n-40\n';
  s += '0\nENDTAB\n';
  const layers = [ ['OUTLINE',7,'CONTINUOUS'], ['HIDDEN',8,'DASHED'], ['CENTER',1,'CENTER'],
                   ['DIM',3,'CONTINUOUS'], ['TEXT',7,'CONTINUOUS'], ['TITLE',5,'CONTINUOUS'],
                   ['SECTION',6,'CONTINUOUS'], ['PARAMS',9,'CONTINUOUS'] ];
  s += `0\nTABLE\n2\nLAYER\n70\n${layers.length}\n`;
  layers.forEach(([n,c,lt])=>{ s += `0\nLAYER\n2\n${n}\n70\n0\n62\n${c}\n6\n${lt}\n`; });
  s += '0\nENDTAB\n0\nENDSEC\n';
  return s;
}

// ---------- 分解式標註工具 ----------
const DIMTXT = 46, ARW = 62, EXT_GAP = 18, EXT_OVER = 36;
function arrowAt(x, y, ang, layer){
  const bx = x - ARW*Math.cos(ang), by = y - ARW*Math.sin(ang);
  const w = ARW*0.17, nx = -Math.sin(ang)*w, ny = Math.cos(ang)*w;
  E.solid([x,y], [bx+nx,by+ny], [bx-nx,by-ny], layer || 'DIM');
}
// 水平標註：p1/p2=幾何端點 [x,y]，dy=尺寸線 y；label 省略時自動取整數距離
function dimH(p1, p2, dy, label){
  let [x1,y1]=p1, [x2,y2]=p2;
  if(x2<x1){ [x1,x2]=[x2,x1]; [y1,y2]=[y2,y1]; }
  const d1=Math.sign(dy-y1)||1, d2=Math.sign(dy-y2)||1;
  E.line(x1, y1+d1*EXT_GAP, x1, dy+d1*EXT_OVER, 'DIM');
  E.line(x2, y2+d2*EXT_GAP, x2, dy+d2*EXT_OVER, 'DIM');
  const txt = label !== undefined ? String(label) : String(Math.round(x2-x1));
  if(x2-x1 >= ARW*3){
    E.line(x1, dy, x2, dy, 'DIM');
    arrowAt(x1, dy, Math.PI); arrowAt(x2, dy, 0);
    E.text((x1+x2)/2, dy+18, DIMTXT, txt, 'DIM', 1);
  } else {                                              // 小尺寸：箭頭在外側、文字置中在線上方
    E.line(x1-ARW*2.2, dy, x2+ARW*2.2, dy, 'DIM');
    arrowAt(x1, dy, 0); arrowAt(x2, dy, Math.PI);
    E.text((x1+x2)/2, dy+22, DIMTXT, txt, 'DIM', 1);
  }
}
// 垂直標註：dx=尺寸線 x；文字旋轉 90°
function dimV(p1, p2, dx, label){
  let [x1,y1]=p1, [x2,y2]=p2;
  if(y2<y1){ [y1,y2]=[y2,y1]; [x1,x2]=[x2,x1]; }
  const d1=Math.sign(dx-x1)||1, d2=Math.sign(dx-x2)||1;
  E.line(x1+d1*EXT_GAP, y1, dx+d1*EXT_OVER, y1, 'DIM');
  E.line(x2+d2*EXT_GAP, y2, dx+d2*EXT_OVER, y2, 'DIM');
  const txt = label !== undefined ? String(label) : String(Math.round(y2-y1));
  if(y2-y1 >= ARW*3){
    E.line(dx, y1, dx, y2, 'DIM');
    arrowAt(dx, y1, -Math.PI/2); arrowAt(dx, y2, Math.PI/2);
    E.text(dx-18, (y1+y2)/2, DIMTXT, txt, 'DIM', 1, 90);
  } else {
    E.line(dx, y1-ARW*2.2, dx, y2+ARW*2.2, 'DIM');
    arrowAt(dx, y1, Math.PI/2); arrowAt(dx, y2, -Math.PI/2);
    E.text(dx-18, y2+ARW*2.2+16, DIMTXT, txt, 'DIM', 0, 90);
  }
}

// ---------- 剖面幾何 ----------
// 輪廓與剖切軸的交點範圍：axis='L'（y=0 剖切，取 x 範圍）/ 'W'（x=0 剖切，取 y 範圍）
function sectionSpan(pts, axis){
  let lo=0, hi=0;
  for(let i=0;i<pts.length;i++){
    const a=pts[i], b=pts[(i+1)%pts.length];
    const pa = axis==='L' ? a[1] : a[0], pb = axis==='L' ? b[1] : b[0];
    const qa = axis==='L' ? a[0] : a[1], qb = axis==='L' ? b[0] : b[1];
    if((pa<=0 && pb>0) || (pa>0 && pb<=0)){
      const f = pa/(pa-pb), q = qa+(qb-qa)*f;
      if(q<lo) lo=q; if(q>hi) hi=q;
    }
  }
  return {lo, hi};
}
// 剖切面上的牆曲線：qEdge=缸口處座標（含正負），Lref=rimH 的參考長度，z0=牆脚高度
// inner=true → 內殼（不套裙擺）；axis 決定取 kx（長邊剖面）或 ky（短邊剖面）
function wallCurveQ(qEdge, Lref, axis, z0, inner){
  const pts=[];
  const zTop = rimH(axis==='L' ? qEdge : 0, Lref, P.H, P.dH);
  for(let m=0;m<=28;m++){
    const v=m/28, ks=shellKxy(v, inner);
    const k = axis==='L' ? ks[0] : ks[1];
    pts.push([qEdge*k, z0 + v*(zTop-z0)]);
  }
  return pts;
}
// 缸緣曲線（外頂 → 內頂，含圓弧/斜角鼓起）
function rimCurveQ(qo, qi, LrefO, LrefI, axis){
  const RM = P.rim==='flat' ? 1 : 10, rise = P.t*0.5, pts=[];
  for(let m=0;m<=RM;m++){
    const u=m/RM, q=qo+(qi-qo)*u, Lu=LrefO+(LrefI-LrefO)*u;
    const bump = P.rim==='round' ? Math.sin(u*Math.PI)*rise : P.rim==='bevel' ? (u<0.5?u*2:(1-u)*2)*rise : 0;
    pts.push([q, rimH(axis==='L'? q : 0, Lu, P.H, P.dH) + bump]);
  }
  return pts;
}
// 洩水斜底曲線（兩內牆脚之間）
function floorCurveQ(q1, q2, axis){
  const pts=[], N=32;
  for(let i=0;i<=N;i++){
    const q=q1+(q2-q1)*i/N;
    pts.push([q, floorZ(axis==='L'? q : 0, axis==='L'? 0 : q)]);
  }
  return pts;
}

// ---------- 剖面視圖（真剖面：外牆＋內牆＋缸緣＋洩水斜底） ----------
function drawSectionView(cx, by, axis, tag){
  const inn=innerDims(), d=drainXY();
  const outerPts = outlinePts(P.shape, P.L, P.W, P.r, P.egg, 96);
  const innerPts = outlinePts(P.shape, inn.L, inn.W, inn.r, P.egg, 96);
  const so = sectionSpan(outerPts, axis), si = sectionSpan(innerPts, axis);
  const kbO2 = shellKxy(0, false), kbI2 = shellKxy(0, true);
  const sO = axis==='L' ? kbO2[0] : kbO2[1];   // 外殼底部縮放（該軸）
  const sI = axis==='L' ? kbI2[0] : kbI2[1];   // 內缸底部縮放（該軸）
  const zRimO = q => rimH(axis==='L'? q : 0, P.L, P.H, P.dH);
  const zRimI = q => rimH(axis==='L'? q : 0, inn.L, P.H, P.dH);
  const zf    = q => floorZ(axis==='L'? q : 0, axis==='L'? 0 : q);
  const T = pts => pts.map(p=>[cx+p[0], by+p[1]]);

  // 外底＋外牆
  E.line(cx+so.lo*sO, by, cx+so.hi*sO, by, 'OUTLINE');
  E.path(T(wallCurveQ(so.lo, P.L, axis, 0)), 0, 0, 'OUTLINE');
  E.path(T(wallCurveQ(so.hi, P.L, axis, 0)), 0, 0, 'OUTLINE');
  // 缸緣（外頂 → 內頂）
  E.path(T(rimCurveQ(so.lo, si.lo, P.L, inn.L, axis)), 0, 0, 'OUTLINE');
  E.path(T(rimCurveQ(so.hi, si.hi, P.L, inn.L, axis)), 0, 0, 'OUTLINE');
  // 內牆（牆脚落在洩水斜底上，不套裙擺）
  E.path(T(wallCurveQ(si.lo, inn.L, axis, zf(si.lo*sI), true)), 0, 0, 'OUTLINE');
  E.path(T(wallCurveQ(si.hi, inn.L, axis, zf(si.hi*sI), true)), 0, 0, 'OUTLINE');
  // 洩水斜底
  E.path(T(floorCurveQ(si.lo*sI, si.hi*sI, axis)), 0, 0, 'OUTLINE');
  // 中心線
  const zmax = Math.max(zRimO(so.lo), zRimO(so.hi)) + P.t;
  E.line(cx, by-130, cx, by+zmax+130, 'CENTER');

  // 排水孔（若落在此剖切面上）：小凹槽＋引線註記，細部依工廠標準件
  const onCut = axis==='L' ? Math.abs(d.y) < 1 : Math.abs(d.x) < 1;
  const qd = axis==='L' ? d.x : d.y;
  if(onCut){
    E.line(cx+qd-45, by+P.b, cx+qd-45, by+P.b-14, 'OUTLINE');
    E.line(cx+qd+45, by+P.b, cx+qd+45, by+P.b-14, 'OUTLINE');
    E.line(cx+qd-45, by+P.b-14, cx+qd+45, by+P.b-14, 'OUTLINE');
    E.line(cx+qd, by+P.b-14, cx+qd+330, by-150, 'DIM');
    E.text(cx+qd+350, by-185, 40, 'DRAIN: FACTORY STD DETAIL', 'TEXT');
    // 洩水角度註記（斜底中點引線）
    const qm = (qd + si.hi*sI) / 2;
    E.line(cx+qm, by+zf(qm), cx+qm, by+P.b+150, 'DIM');
    E.text(cx+qm, by+P.b+175, 40, `SLOPE ${P.slope}%%d`, 'TEXT', 1);
  }

  // 側壁 R 值標註
  if(isFactory()){
    // factory 模式：內外缸 R 分開標（比照工廠圖「内缸侧弧度／外缸侧弧度」）
    const Ri = axis==='L' ? P.riL : P.riW, Ro = axis==='L' ? P.roL : P.roW;
    const ksI = shellKxy(0.55, true), ksO = shellKxy(0.4, false);
    const kI = axis==='L' ? ksI[0] : ksI[1], kO = axis==='L' ? ksO[0] : ksO[1];
    const qI = si.hi*kI, zI = P.b + 0.55*(zRimI(si.hi) - P.b);
    const qO = so.hi*kO, zO = 0.4*zRimO(so.hi);
    E.line(cx+qI, by+zI, cx+qI+430, by+zI+300, 'DIM');
    E.text(cx+qI+450, by+zI+320, 46, `R${Math.round(Ri)} (INNER WALL)`, 'TEXT');
    E.line(cx+qO, by+zO, cx+qO+520, by+zO+120, 'DIM');
    E.text(cx+qO+540, by+zO+140, 46, `R${Math.round(Ro)} (OUTER WALL)`, 'TEXT');
  } else if(axis==='W'){
    // legacy：短邊剖面＝R 值定義基準
    const leader = (vq, label)=>{
      const kq = wallK(vq, baseK(), 1.07);
      const qx = so.hi*kq, qz = vq*zRimO(so.hi);
      E.line(cx+qx, by+qz, cx+qx+420, by+qz+230, 'DIM');
      E.text(cx+qx+440, by+qz+250, 46, label, 'TEXT');
    };
    if(P.customProfile && P.shape==='custom'){
      const fit = fitProfileArcs();
      if(fit && fit.ok) fit.arcs.forEach(a=>leader(Math.max(0.1, Math.min(0.9, (a.v0+a.v1)/2)), `${a.straight?'STRAIGHT':'R'+Math.round(a.R)} (FIT)`));
    } else if(P.wallMode==='arc'){
      leader(0.55, `R${Math.round(P.wallR)}`);
    } else if(P.wallMode==='s'){
      const vm = Math.max(0.15, Math.min(0.85, P.wallMid/100));
      leader(vm*0.5, `R${Math.round(P.wallR)}`);
      leader(vm + (1-vm)*0.55, `R${Math.round(P.wallR2)} (REV)`);
    }
    if(P.skirt && !(P.customProfile && P.shape==='custom')){
      const hRef = Math.max(1, P.H + P.dH/2);
      leader(Math.max(0.05, (P.skirtH/hRef)*0.45), `R${Math.round(skirtReff())} (SKIRT)`);
    }
  }

  // 溢水口（工廠標準件）：後端內壁、距缸緣 P.ovfDrop（長邊剖面才畫）
  if(P.ovf && axis==='L'){
    const zo = zRimI(si.lo) - P.ovfDrop;
    const vo = Math.max(0, Math.min(1, (zo - P.b) / Math.max(1, zRimI(si.lo) - P.b)));
    const kso = shellKxy(vo, true);
    const qo = si.lo * kso[0];
    E.line(cx+qo, by+zo-30, cx+qo, by+zo+30, 'OUTLINE');
    E.line(cx+qo, by+zo+30, cx+qo+34, by+zo+30, 'OUTLINE');
    E.line(cx+qo, by+zo-30, cx+qo+34, by+zo-30, 'OUTLINE');
    dimV([cx+qo, by+zo+30], [cx+si.lo, by+zRimI(si.lo)], cx+qo+260, P.ovfDrop);
    E.line(cx+qo+34, by+zo, cx+qo+560, by+zo+300, 'DIM');
    E.text(cx+qo+580, by+zo+330, 40, 'OVERFLOW: FACTORY STD DETAIL', 'TEXT');
  }

  // ---- 標註 ----
  // 上緣鏈式：缸緣邊寬 ─ 內部淨長/寬 ─ 缸緣邊寬（factory＝浴缸邊寬 20）
  const dyT = by + zmax + 340;
  dimH([cx+so.lo, by+zRimO(so.lo)], [cx+si.lo, by+zRimI(si.lo)], dyT, Math.round(si.lo-so.lo));
  dimH([cx+si.lo, by+zRimI(si.lo)], [cx+si.hi, by+zRimI(si.hi)], dyT);
  dimH([cx+si.hi, by+zRimI(si.hi)], [cx+so.hi, by+zRimO(so.hi)], dyT, Math.round(so.hi-si.hi));
  // 內缸底長/寬（比照工廠圖 1108 内缸底长：延伸線從缸底拉到上方第二條尺寸線）
  const dyT2 = dyT + 300;
  dimH([cx+si.lo*sI, by+P.b], [cx+si.hi*sI, by+P.b], dyT2);
  // 底部：端部退縮＋外缸底長/寬；總長在更下方
  const dyB1 = by - 270, dyB2 = by - 560;
  dimH([cx+so.lo, by+zRimO(so.lo)], [cx+so.lo*sO, by], dyB1, Math.round(so.lo*sO-so.lo));
  dimH([cx+so.lo*sO, by], [cx+so.hi*sO, by], dyB1);
  dimH([cx+so.lo, by+zRimO(so.lo)], [cx+so.hi, by+zRimO(so.hi)], dyB2);
  // 高度：左＝總高（後端）；右＝前端高（不對稱時）
  dimV([cx+so.lo*sO, by], [cx+so.lo, by+zRimO(so.lo)], cx+so.lo-350);
  if(axis==='L' && P.dH>0) dimV([cx+so.hi*sO, by], [cx+so.hi, by+zRimO(so.hi)], cx+so.hi+350);
  // 內深（排水孔＝最低點處）＋缸底厚
  const q0 = onCut ? qd : 0;
  dimV([cx+q0, by+zf(q0)], [cx+q0, by+zRimI(si.hi)], cx+q0+330);
  dimV([cx+q0-160, by], [cx+q0-160, by+P.b], cx+q0-380, P.b);
  // 視圖名稱
  E.text(cx, by-800, 64, `SECTION ${tag}-${tag}`, 'TEXT', 1);
}

// ---------- 平面圖 ----------
function drawPlanView(cx, cy){
  const inn=innerDims(), d=drainXY();
  const outerPts = outlinePts(P.shape, P.L, P.W, P.r, P.egg, 96);
  const innerPts = outlinePts(P.shape, inn.L, inn.W, inn.r, P.egg, 96);
  const kbO = shellKxy(0, false), kbI = shellKxy(0, true);
  E.poly(outerPts, cx, cy, 'OUTLINE');
  E.poly(innerPts, cx, cy, 'OUTLINE');
  E.poly(outerPts.map(p=>[p[0]*kbO[0], p[1]*kbO[1]]), cx, cy, 'HIDDEN');       // 外缸底輪廓
  E.poly(innerPts.map(p=>[p[0]*kbI[0], p[1]*kbI[1]]), cx, cy, 'OUTLINE');      // 內缸底輪廓（工廠圖為實線）
  let nX=1e9, xX=-1e9, nY=1e9, xY=-1e9;
  outerPts.forEach(p=>{ nX=Math.min(nX,p[0]); xX=Math.max(xX,p[0]); nY=Math.min(nY,p[1]); xY=Math.max(xY,p[1]); });
  let inX=1e9, ixX=-1e9, inY=1e9, ixY=-1e9;
  innerPts.forEach(p=>{ inX=Math.min(inX,p[0]*kbI[0]); ixX=Math.max(ixX,p[0]*kbI[0]); inY=Math.min(inY,p[1]*kbI[1]); ixY=Math.max(ixY,p[1]*kbI[1]); });
  // 中心線
  E.line(cx+nX-150, cy, cx+xX+150, cy, 'CENTER');
  E.line(cx, cy+nY-150, cx, cy+xY+150, 'CENTER');
  // 排水孔
  E.circle(cx+d.x, cy+d.y, 26, 'OUTLINE');
  E.circle(cx+d.x, cy+d.y, 8, 'OUTLINE');
  // 剖切符號：F-F 沿長軸（水平線）、G-G 沿寬軸（垂直線）
  const cutMark = (x, y, horiz, letter)=>{
    if(horiz){
      E.line(x-75, y, x+75, y, 'SECTION'); E.line(x-75, y-12, x+75, y-12, 'SECTION');
      E.line(x, y-12, x, y-140, 'SECTION'); arrowAt(x, y-150, -Math.PI/2, 'SECTION');
      E.text(x, y-290, 58, letter, 'SECTION', 1);
    } else {
      E.line(x, y-75, x, y+75, 'SECTION'); E.line(x-12, y-75, x-12, y+75, 'SECTION');
      E.line(x-12, y, x-140, y, 'SECTION'); arrowAt(x-150, y, Math.PI, 'SECTION');
      E.text(x-230, y-20, 58, letter, 'SECTION', 2);
    }
  };
  cutMark(cx+nX-220, cy, true, 'F'); cutMark(cx+xX+220, cy, true, 'F');
  cutMark(cx, cy+nY-220, false, 'G'); cutMark(cx, cy+xY+220, false, 'G');
  // 溢水口記號（後端 −x、內缸口邊）
  if(P.ovf){
    let iTop=1e9; innerPts.forEach(p=>{ iTop=Math.min(iTop, p[0]); });   // 內缸口後端（−x）
    E.line(cx+iTop+26, cy-70, cx+iTop+26, cy+70, 'OUTLINE');
    E.line(cx+iTop+42, cy-70, cx+iTop+42, cy+70, 'OUTLINE');
    E.line(cx+iTop+26, cy-70, cx+iTop+42, cy-70, 'OUTLINE');
    E.line(cx+iTop+26, cy+70, cx+iTop+42, cy+70, 'OUTLINE');
  }
  // 標註：總長／總寬／內缸底長寬／排水孔偏移
  dimH([cx+nX, cy], [cx+xX, cy], cy+nY-340);
  dimV([cx, cy+nY], [cx, cy+xY], cx+xX+360);
  dimH([cx+inX, cy], [cx+ixX, cy], cy+xY+340);                       // 內缸底長（上方）
  dimV([cx, cy+inY], [cx, cy+ixY], cx+nX-560);                       // 內缸底寬（左側）
  if(Math.abs(d.x)>1) dimH([cx, cy+d.y], [cx+d.x, cy+d.y], cy+nY-160, Math.round(Math.abs(d.x)));
  if(Math.abs(d.y)>1) dimV([cx+d.x, cy], [cx+d.x, cy+d.y], cx+nX-360, Math.round(Math.abs(d.y)));
  E.text(cx, cy+nY-620, 64, 'PLAN VIEW', 'TEXT', 1);
}

// ---------- 標題欄（Bathe 版型，英文為主） ----------
function drawTitleBlock(x, y, w, h, D){
  E.rect(x, y, w, h, 'TITLE');
  let cy = y + h;
  // 品牌區
  E.line(x, cy-460, x+w, cy-460, 'TITLE');
  E.text(x+w/2, cy-180, 150, 'BATHE', 'TITLE', 1);
  E.text(x+w/2, cy-290, 46, 'Bespoke Bathworks', 'TITLE', 1);
  E.text(x+w/2, cy-405, 44, 'Made to order, one at a time', 'TITLE', 1);
  cy -= 460;
  // 資料列
  const rows = [
    ['Name', D.name], ['Design ID', D.designId], ['Code', D.code], ['Dimensions', D.dims],
    ['Material', D.material], ['Units', 'mm'], ['Proportion', D.scale], ['Capacity', D.cap],
    ['Est. weight', D.weight], ['Draftsman', D.drafts], ['Date', D.date],
    ['Auditing', ''], ['Approved', ''], ['Projection', '']
  ];
  const rowH = 165, labW = 330;
  rows.forEach(([lab, val], i)=>{
    const ry = cy - rowH*(i+1);
    E.line(x, ry, x+w, ry, 'TITLE');
    E.line(x+labW, ry, x+labW, ry+rowH, 'TITLE');
    E.text(x+24, ry+rowH/2-20, 40, lab, 'TITLE');
    if(lab === 'Projection'){
      // 第一角法投影符號
      const px = x+labW+150, py = ry+rowH/2, ps = 55;
      E.circle(px, py, ps*0.52, 'TITLE'); E.circle(px, py, ps*0.28, 'TITLE');
      E.line(px-ps*0.85, py, px+ps*0.85, py, 'CENTER');
      const tx = px+ps*1.5;
      E.line(tx, py-ps*0.52, tx, py+ps*0.52, 'TITLE');
      E.line(tx+ps*0.95, py-ps*0.28, tx+ps*0.95, py+ps*0.28, 'TITLE');
      E.line(tx, py-ps*0.52, tx+ps*0.95, py-ps*0.28, 'TITLE');
      E.line(tx, py+ps*0.52, tx+ps*0.95, py+ps*0.28, 'TITLE');
    } else if(val){
      const maxW = w - labW - 60;                                   // 自動縮字避免超出欄位
      const h2 = Math.max(24, Math.min(42, maxW / (0.62 * String(val).length)));
      E.text(x+labW+26, ry+rowH/2-20, Math.round(h2), val, 'TITLE');
    }
  });
}

// ---------- 公差註記 ----------
function drawToleranceNote(x, y){
  const lines = [
    'NOTE: GENERAL TOLERANCES',
    'DIM OVER 400mm : +5 / -10 mm',
    'DIM 100 - 400mm : %%p3 mm',
    'DIM UNDER 100mm : %%p2 mm'
  ];
  lines.forEach((s2, i)=> E.text(x, y - i*100, i ? 46 : 52, s2, 'TEXT'));
}

function exportDXF(noDownload){
  const inn = innerDims(), spec = computeSpec(), s = baseK();
  const HB = P.H + P.dH;
  dxf = dxfHeaderTables();
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // ---- 版面配置（1:1 模型空間 mm；A4 橫式列印比例自動計算）----
  const DZ = 900;                                              // 視圖周圍標註區
  const ffH = HB + P.t, ggH = rimH(0, P.L, P.H, P.dH) + P.t;
  const col1 = Math.max(P.L, P.W) + DZ*2;                      // 左欄：F-F（上）＋ G-G（下）
  let col2 = Math.max(P.L, 1600) + DZ*2;                       // 右欄：平面圖（上）＋ 公差（下）
  let row1 = Math.max(ffH, P.W) + DZ*2;
  const row2 = Math.max(ggH + DZ*2, 1500);
  const TBW = 1100, M = 70;
  let shW = M + TBW + col1 + col2 + M;
  let shH = M + row1 + row2 + M;

  // 版面吸附 A4 橫式比例（297×210）：列印/匯出 PDF 選 A4 橫式「符合頁面」時剛好滿版，
  // 比例為乾淨的 1:den（標題欄 Proportion 同步顯示）
  const den = Math.max(2, Math.ceil(Math.max(shW/297, shH/210)));
  col2 += 297*den - shW;                                       // 多餘寬度給右欄（平面圖/註記區）
  row1 += 210*den - shH;                                       // 多餘高度給上排
  shW = 297*den; shH = 210*den;

  // 圖框
  E.rect(0, 0, shW, shH, 'TITLE');
  E.rect(M, M, shW-2*M, shH-2*M, 'TITLE');
  const code = `C-CUS-${Math.round(P.L/100)}${Math.round(P.W/10)}F.00`;
  const custName = document.getElementById('custName').value;

  drawTitleBlock(M, M, TBW, shH-2*M, {
    name: custName ? `CUSTOM TUB - ${custName}` : 'CUSTOM FREESTANDING BATHTUB',
    designId: DESIGN_ID,
    code,
    dims: `${P.L}x${P.W}x${inn.D}/${HB}mm`,
    material: P.material==='solid' ? 'SOLID SURFACE' : 'ACRYLIC',
    scale: '1:' + den,
    cap: `${spec.fullVol.toFixed(0)} L`,
    weight: `${spec.weight.toFixed(1)} kg`,
    drafts: 'BATHE ATELIER DESIGN STUDIO',
    date: new Date().toISOString().slice(0,10)
  });

  const gx = M + TBW;
  drawSectionView(gx + col1/2, M + row2 + DZ, 'L', 'F');       // F-F 縱剖（左上）
  drawSectionView(gx + col1/2, M + DZ*0.9,     'W', 'G');       // G-G 橫剖（左下）
  drawPlanView(gx + col1 + col2/2, M + row2 + row1/2);          // 平面圖（右上）
  drawToleranceNote(gx + col1 + 300, M + 1300);                 // 公差註記（右下）

  // 一般註記
  if(P.skirt) E.text(gx + col1 + 300, M + 920, 44, `PEDESTAL SKIRT (OUTER SHELL): ARC R${Math.round(skirtReff())} REV, WAIST ${P.waistK}% AT ${P.skirtH}mm, FOOT WIDTH = BASE TAPER`, 'TEXT');
  const rimNote = P.rim==='round' ? `RIM EDGE: ROLLED, R${Math.max(3, Math.round(P.t/2))}`
                : P.rim==='bevel' ? `RIM EDGE: BEVELLED, CHAMFER ${Math.max(3, Math.round(P.t/2))}mm`
                : `RIM EDGE: FLAT / SHARP (WALL ${P.t}mm)`;
  E.text(gx + col1 + 300, M + 800, 44, rimNote, 'TEXT');
  if(P.customProfile && P.shape==='custom'){
    const fit = fitProfileArcs();
    E.text(gx + col1 + 300, M + 680, 44, fit && fit.ok
      ? `SIDE WALL (SKETCHED) = FITTED ARCS ${fit.label} (MAX DEV ${fit.maxErr.toFixed(1)}mm, WIDTH SECTION REF)`
      : 'SIDE WALL (SKETCHED): FREEFORM POLYLINE - NO CLEAN ARC FIT. SIMPLIFY SKETCH FOR ARC-BASED TOOLING.', 'TEXT');
  } else if(isFactory()){
    E.text(gx + col1 + 300, M + 680, 44, `SIDE WALLS: INNER R${P.riL}(L-SEC)/R${P.riW}(W-SEC), OUTER R${P.roL}(L-SEC)/R${P.roW}(W-SEC); RIM EDGE ${P.lip}mm`, 'TEXT');
    if(P.ovf) E.text(gx + col1 + 300, M + 920, 44, `OVERFLOW ${P.ovfDrop}mm BELOW RIM, REAR END, PER FACTORY STANDARD FITTING`, 'TEXT');
  } else if(P.wallMode==='arc'){
    E.text(gx + col1 + 300, M + 680, 44, `SIDE WALL: CIRCULAR ARC R${Math.round(P.wallR)} (WIDTH SECTION REFERENCE)`, 'TEXT');
  } else if(P.wallMode==='s'){
    E.text(gx + col1 + 300, M + 680, 44, `SIDE WALL: S-CURVE R${Math.round(P.wallR)} (LOWER) + R${Math.round(P.wallR2)} (UPPER, REVERSED), JOIN AT ${P.wallMid}% H (WIDTH SECTION REF)`, 'TEXT');
  }
  E.text(gx + col1 + 300, M + 560, 44, `FLOOR SLOPE ${P.slope}%%d TOWARDS DRAIN (DRAIN AT LOWEST POINT)`, 'TEXT');
  E.text(gx + col1 + 300, M + 440, 44, 'DRAIN DETAIL PER FACTORY STANDARD FITTING (AT MOULD STAGE)', 'TEXT');
  E.text(gx + col1 + 300, M + 320, 44, `UNDERCUT: ${P.undercut ? 'ALLOWED (SPLIT MOULD)' : 'NONE (VERTICAL DEMOULD)'}`, 'TEXT');
  if(document.getElementById('custNote').value)
    E.text(gx + col1 + 300, M + 200, 44, `REMARK: ${document.getElementById('custNote').value}`, 'TEXT');

  // 嵌入參數（PARAMS 圖層，供本系統重新上傳還原設計 — 閉環）
  const paramsJson = JSON.stringify({ _bathtub:1, shape:P.shape, L:P.L, W:P.W, H:P.H, t:P.t, b:P.b, r:P.r,
    dH:P.dH, egg:P.egg, taper:P.taper, arc:P.arc, rim:P.rim, drain:P.drain, slope:P.slope, undercut:P.undercut?1:0,
    wallMode:P.wallMode, wallR:P.wallR, wallR2:P.wallR2, wallMid:P.wallMid,
    lip:P.lip, obL:P.obL, obW:P.obW, ibL:P.ibL, ibW:P.ibW, riL:P.riL, riW:P.riW, roL:P.roL, roW:P.roW,
    ovf:P.ovf?1:0, ovfDrop:P.ovfDrop,
    skirt:P.skirt?1:0, skirtH:P.skirtH, waistK:P.waistK, skirtR:P.skirtR });
  E.text(M + 30, 16, 22, paramsJson, 'PARAMS');

  dxf += '0\nENDSEC\n0\nEOF\n';
  const filename = `${DESIGN_ID}_${code}_${P.L}x${P.W}x${inn.D}-${HB}.dxf`;
  if(noDownload) return { content: dxf, filename };
  download(dxf, filename, 'application/dxf');
}

// ===================== JSON 規格表輸出 =====================
function exportJSON(noDownload){
  const s = computeSpec();
  const spec = {
    文件類型: 'Custom bathtub design specification',
    產生時間: new Date().toISOString(),
    客戶姓名: document.getElementById('custName').value || '',
    備註: document.getElementById('custNote').value || '',
    設計參數: {
      材質: P.material==='solid' ? 'Solid surface' : 'Premium acrylic', material_code: P.material,
      造型: {rect:'Rounded Rect', stadium:'Rounded Ends', ellipse:'Oval', custom:'Custom sketch'}[P.shape],
      shape_code: P.shape,
      手繪俯視輪廓_normalized: P.customPts ? P.customPts.map(p=>[+p[0].toFixed(4), +p[1].toFixed(4)]) : null,
      手繪側牆剖面_k: P.customProfile ? P.customProfile.map(k=>+k.toFixed(4)) : null,
      外部長度_mm: P.L, 外部寬度_mm: P.W,
      缸緣高度_前端_mm: P.H, 缸緣高度_後端_mm: P.H+P.dH, 靠背增高_mm: P.dH,
      蛋形係數_pct: P.egg, 底部收縮_pct: P.taper,
      缸壁厚度_mm: P.t, 缸底厚度_mm: P.b, 圓角半徑_mm: P.r,
      缸緣造型: {flat:'Flat', round:'Rounded', bevel:'Beveled'}[P.rim], rim_code: P.rim,
      增高弧度_pct: P.arc,
      排水孔位置: P.drain, 外觀顏色: P.color,
      排水洩水角度_deg: P.slope, 允許倒扣: P.undercut,
      側壁模式: P.wallMode, 側壁弧度R_mm: P.wallR, 上段弧R2_mm: P.wallR2, S轉折高度_pct: P.wallMid,
      缸邊寬_mm: P.lip, 外缸底長_mm: P.obL, 外缸底寬_mm: P.obW, 內缸底長_mm: P.ibL, 內缸底寬_mm: P.ibW,
      內缸弧R_長邊剖面_mm: P.riL, 內缸弧R_短邊剖面_mm: P.riW, 外缸弧R_長邊剖面_mm: P.roL, 外缸弧R_短邊剖面_mm: P.roW,
      溢水口: P.ovf, 溢水口距缸緣_mm: P.ovfDrop,
      裙擺式底座: P.skirt, 裙擺高度_mm: P.skirtH, 收腰寬度_pct: P.waistK, 裙擺弧R_mm: P.skirtR
    },
    計算規格: {
      內部長度_mm: s.inn.L, 內部寬度_mm: s.inn.W, 內部深度_前端_mm: s.inn.D,
      底部長度_mm: isFactory() ? P.obL : Math.round(P.L*P.taper/100), 底部寬度_mm: isFactory() ? P.obW : Math.round(P.W*P.taper/100),
      滿水容量_L: +s.fullVol.toFixed(1), 建議使用水量_L: +s.useVol.toFixed(1),
      估計重量_kg: +s.weight.toFixed(1), 材質假設: P.material==='solid' ? 'Solid surface (density 1.75 g/cm³)' : 'Premium acrylic (density 1.19 g/cm³)'
    }
  };
  if(noDownload) return { content: JSON.stringify(spec, null, 2), filename: `${DESIGN_ID}_design-spec.json` };
  download(JSON.stringify(spec, null, 2), `bathtub_spec_${Date.now()}.json`, 'application/json');
}

// ===================== 詢價送單（沿用原 Design Studio 的 FormSubmit 通道） =====================
async function sendQuote(btn){
  const email = (document.getElementById('custEmail').value || '').trim();
  const name = (document.getElementById('custName').value || '').replace(/[<>]/g, '').trim();
  const banner = document.getElementById('quoteBanner');
  const show = (bg, border, color, msg) => {
    banner.style.display = 'block';
    banner.style.background = bg; banner.style.border = '1px solid ' + border; banner.style.color = color;
    banner.textContent = msg;
  };
  // 頁面設 window.PAGE_EMAIL_OPTIONAL=true（medium.html）→ Email 非必填，不擋送出
  if(!window.PAGE_EMAIL_OPTIONAL && (!email || email.indexOf('@') < 1)){
    // B2b(2026-09-02)：Basic 的區塊標題已改 Your details，被擋訊息不再引用「Order Info」；其他頁沿用舊句
    const blockMsg = window.PAGE_TAG === 'design-studio-basic'
      ? t('Please enter your email so we can reply with your quote.')
      : t('Please enter your email under "Order Info" so our designer can reply with your quote and 3D render.');
    show('#fdf3ee', '#e0b39a', '#8a4a2b', blockMsg);
    // A5(2026-09-02)：被擋時把視線帶回 Email 欄，標紅並捲動聚焦
    const emailEl = document.getElementById('custEmail');
    if(emailEl){
      emailEl.classList.add('field-err');
      emailEl.scrollIntoView({behavior:'smooth', block:'center'});
      emailEl.focus();
    }
    return;
  }
  const s = computeSpec();
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = t('Sending…');
  try {
    const fd = new FormData();
    fd.append('name', name || '(not given)');
    fd.append('email', email || '(not given)');
    fd.append('material', P.material === 'solid' ? 'Solid surface' : 'Premium acrylic');
    fd.append('silhouette', P.shape === 'custom' ? 'Custom sketch' : P.shape);
    fd.append('size', P.L + 'x' + P.W + 'x' + P.H + ' mm (rim rear ' + (P.H + P.dH) + ')');
    fd.append('rim_profile', P.rim);
    fd.append('sculpting', 'backrest rise ' + P.dH + 'mm, rise curve ' + P.arc + '%, egg ' + P.egg + '%, base taper ' + Math.round(baseK()*100) + '%, wall ' + P.t + 'mm');
    fd.append('capacity', '~' + s.fullVol.toFixed(0) + ' L');
    fd.append('colour', P.color);
    fd.append('drain', P.drain);
    fd.append('notes', (document.getElementById('custNote').value || '').replace(/[<>]/g, ''));
    fd.append('language', LANG);
    fd.append('page', window.PAGE_TAG || 'design-studio');
    fd.append('design_id', DESIGN_ID);
    fd.append('request', 'estimate');
    const selD = document.getElementById('shipDest');
    const destName = selD && selD.value ? selD.options[selD.selectedIndex].textContent : '(not selected)';
    const shipR = shipRate();
    fd.append('destination', destName);
    fd.append('est_shipping', shipR != null ? 'USD $' + shipR : '-');
    const pp = priceParts();
    const optList = [];
    if((P.color || '').toLowerCase() !== STD_COLOR) optList.push('custom colour +$' + PRICING.color);
    if(OPTS.backrest) optList.push('heated backrest +$' + PRICING.backrest);
    if(OPTS.basin) optList.push('matching basin +$' + PRICING.basin[P.material==='solid'?1:0]);
    fd.append('tier', PRICING.tiers[pp.tk][0] + ' (from USD $' + PRICING.tiers[pp.tk][P.material==='solid'?2:1].toLocaleString('en-US') + ')');
    fd.append('options', optList.join('; ') || 'none');
    fd.append('est_total', shipR != null ? 'from USD $' + (pp.total + shipR).toLocaleString('en-US') : '-');
    fd.append('estimate_range', 'from USD $' + pp.total.toLocaleString('en-US') + ' + shipping (tier pricing per 2026-07 structure; $399 design fee credited)');
    // A4(2026-09-02)：Basic 進來的詢價主旨與 designer quote 分流，業務一眼分辨
    const subj = window.PAGE_TAG === 'design-studio-basic'
      ? 'Bathe Atelier — Guided design enquiry [' + DESIGN_ID + ']'
      : 'Bathe Atelier — Design Studio (designer quote)';
    fd.append('_subject', subj);
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    // 附上完整規格 JSON（含手繪輪廓／剖面），設計師可直接匯回本工具
    const spec = {
      設計參數: { material_code: P.material, shape_code: P.shape, 外部長度_mm: P.L, 外部寬度_mm: P.W, 缸緣高度_前端_mm: P.H,
        靠背增高_mm: P.dH, 增高弧度_pct: P.arc, 蛋形係數_pct: P.egg, 底部收縮_pct: P.taper,
        缸壁厚度_mm: P.t, 缸底厚度_mm: P.b, 圓角半徑_mm: P.r, rim_code: P.rim, 排水孔位置: P.drain, 外觀顏色: P.color,
        排水洩水角度_deg: P.slope, 允許倒扣: P.undercut,
        側壁模式: P.wallMode, 側壁弧度R_mm: P.wallR, 上段弧R2_mm: P.wallR2, S轉折高度_pct: P.wallMid,
        缸邊寬_mm: P.lip, 外缸底長_mm: P.obL, 外缸底寬_mm: P.obW, 內缸底長_mm: P.ibL, 內缸底寬_mm: P.ibW,
        內缸弧R_長邊剖面_mm: P.riL, 內缸弧R_短邊剖面_mm: P.riW, 外缸弧R_長邊剖面_mm: P.roL, 外缸弧R_短邊剖面_mm: P.roW,
        溢水口: P.ovf, 溢水口距缸緣_mm: P.ovfDrop,
        裙擺式底座: P.skirt, 裙擺高度_mm: P.skirtH, 收腰寬度_pct: P.waistK, 裙擺弧R_mm: P.skirtR,
        手繪俯視輪廓_normalized: P.customPts, 手繪側牆剖面_k: P.customProfile },
      計算規格: { 滿水容量_L: +s.fullVol.toFixed(1), 估計重量_kg: +s.weight.toFixed(1) }
    };
    fd.append('attachment', new Blob([JSON.stringify(spec, null, 2)], {type:'application/json'}), 'design-spec.json');
    // 六角度 3D 渲染圖（郵件用 1200×900 JPEG，總量約 1MB）；截圖失敗不影響送單
    const renderFields = [];
    try {
      if(!extGroup) captureRenders({w:1200, h:900, mime:'image/jpeg', q:0.85}).forEach(([name, url], i)=>{
        const fld = 'render_' + (i+1);
        fd.append(fld, dataURLtoBlob(url), `${DESIGN_ID}_${name}.jpg`);
        renderFields.push(fld);
      });
    } catch(e){ console.warn('render attach skipped:', e); }
    // 照片分析（Pro）：頁面把標註後的現場照放進 window.EXTRA_QUOTE_ATTACH＝[[檔名, dataURL], …]，隨詢價一併寄出
    try {
      if(window.EXTRA_QUOTE_ATTACH && window.EXTRA_QUOTE_ATTACH.length){
        window.EXTRA_QUOTE_ATTACH.forEach(([fname, url], i)=>{ fd.append('site_photo_' + (i+1), dataURLtoBlob(url), fname); });
        if(window.EXTRA_QUOTE_NOTE) fd.append('site_photo_note', window.EXTRA_QUOTE_NOTE);
      }
    } catch(e){ console.warn('photo attach skipped:', e); }
    let r = await fetch('https://formsubmit.co/ajax/hello@batheatelier.com', { method:'POST', headers:{'Accept':'application/json'}, body: fd });
    if(!r.ok && renderFields.length && fd.delete){
      // 附件過大/被拒 → 退回只帶規格重送一次，確保詢價一定送出
      renderFields.forEach(f=>fd.delete(f));
      r = await fetch('https://formsubmit.co/ajax/hello@batheatelier.com', { method:'POST', headers:{'Accept':'application/json'}, body: fd });
    }
    if(!r.ok) throw new Error('HTTP ' + r.status);
    show('#eef4ee', '#9cc7a6', '#2f5d3a', t('✅ Your design is in! We\'ll reply with a firm quote and next steps within one business day.'));
  } catch(e){
    console.error(e);
    show('#fdf3ee', '#e0b39a', '#8a4a2b', t('❌ Something went wrong — please try again, or email hello@batheatelier.com directly.'));
  }
  btn.disabled = false;
  btn.textContent = t('Submit design & get a firm quote →');
  if(btn.firstChild) i18nNodes.push([btn.firstChild, 'Submit design & get a firm quote →']);
}

// ---------- CAD 閘門開關 ----------
// CAD_GATE = true → CAD 製造包不開放直接下載，只在客戶送出設計（＋收訂金）後隨正式報價寄出。
// 各頁在載入本檔前設 window.PAGE_CAD_GATE（pro.html＝true）；未設則 false（與舊測試模式相容）。
const CAD_GATE = (typeof window.PAGE_CAD_GATE !== 'undefined') ? !!window.PAGE_CAD_GATE : false;
function requestCadPack(btn){
  if(CAD_GATE){ showCadGate(); return; }
  exportCadPackZip(btn);
}
(function initCadBtn(){
  const b = document.getElementById('cadPackBtn');
  if(b && CAD_GATE) b.textContent = '🔒 CAD pack (DXF + spec + renders)';
})();

// ---------- 多角度 3D 渲染圖（CAD 包附件） ----------
// 截圖時：隱藏把手/地板/格線、換乾淨米白背景、固定 1600×1200，完成後全部還原
const RENDER_SHOTS = [
  ['view-1_three-quarter',   Math.PI/4,   Math.PI/3.2 ],
  ['view-2_front-long-side', Math.PI/2,   Math.PI/2.05],
  ['view-3_end-short-side',  0,           Math.PI/2.05],
  ['view-4_rear-three-quarter', -Math.PI*0.75, Math.PI/3.2],
  ['view-5_top-plan',        Math.PI/4,   0.06        ],
  ['view-6_interior',        Math.PI/2,   Math.PI/4.8 ]
];
function captureRenders(opts){
  opts = opts || {};
  const RW = opts.w || 1600, RH = opts.h || 1200;
  const mime = opts.mime || 'image/png', quality = opts.q;
  const saved = { theta:orbit.theta, phi:orbit.phi, radius:orbit.radius };
  const savedBg = scene.background, savedFloor = floor.visible, savedGrid = grid.visible;
  const savedHandles = handleGroup ? handleGroup.visible : null;
  scene.background = new THREE.Color(0xf4f1ea);
  floor.visible = false; grid.visible = false;
  if(handleGroup) handleGroup.visible = false;
  const savedPR = renderer.getPixelRatio();
  renderer.setPixelRatio(1);                          // 固定輸出解析度，避免高 DPI 檔案過大
  renderer.setSize(RW, RH, false);
  camera.aspect = RW/RH; camera.updateProjectionMatrix();
  const fit = Math.max(P.L, P.W, (P.H + P.dH)*2.6) * 1.9;
  const out = [];
  (opts.shots || RENDER_SHOTS).forEach(([name, th, ph])=>{
    orbit.theta = th; orbit.phi = Math.max(0.05, ph); orbit.radius = fit;
    updateCamera();
    renderer.render(scene, camera);
    out.push([name, opts.noWatermark ? renderer.domElement.toDataURL(mime, quality)
                                     : watermarkFrame(renderer.domElement, RW, RH, mime, quality)]);
  });
  // 還原場景與視角
  orbit.theta = saved.theta; orbit.phi = saved.phi; orbit.radius = saved.radius;
  scene.background = savedBg; floor.visible = savedFloor; grid.visible = savedGrid;
  if(handleGroup && savedHandles !== null) handleGroup.visible = savedHandles;
  renderer.setPixelRatio(savedPR);
  resize(); updateCamera(); renderer.render(scene, camera);
  return out;
}

// 渲染圖浮水印：斜向平鋪品牌＋設計編號（半透明）＋右下角版權列
function watermarkFrame(srcCanvas, W, H, mime, quality){
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0, W, H);
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(-28*Math.PI/180);
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = '#9a7b43';
  ctx.font = '700 ' + Math.round(W/22) + 'px "DM Sans","Noto Sans TC",sans-serif';
  ctx.textAlign = 'center';
  for(let y = -H; y <= H; y += Math.round(H/3.2)){
    ctx.fillText('BATHE ATELIER — ' + DESIGN_ID, 0, y);
  }
  ctx.restore();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#66614f';
  ctx.font = Math.round(W/70) + 'px "DM Sans",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('(c) Bathe Atelier · ' + DESIGN_ID + ' · hello@batheatelier.com', W - 18, H - 16);
  return c.toDataURL(mime, quality);
}

// dataURL → Blob（附件用）
function dataURLtoBlob(u){
  const parts = u.split(','), mime = parts[0].match(/data:(.*?);/)[1];
  const bin = atob(parts[1]), arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type: mime});
}

// ---------- CAD 製造包 ZIP（DXF＋規格 JSON＋六角度渲染圖） ----------
let _jszipP = null;
function loadJSZip(){
  if(!_jszipP) _jszipP = new Promise((res, rej)=>{
    if(window.JSZip) return res(window.JSZip);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = ()=>res(window.JSZip);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return _jszipP;
}
async function exportCadPackZip(btn){
  const old = btn ? btn.textContent : null;
  if(btn){ btn.disabled = true; btn.textContent = t('Preparing CAD pack…'); }
  try {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const d = exportDXF(true);
    zip.file(d.filename, d.content);
    const j = exportJSON(true);
    zip.file(j.filename, j.content);
    const rd = zip.folder('renders');
    captureRenders().forEach(([name, url])=> rd.file(name + '.png', url.split(',')[1], {base64:true}));
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${DESIGN_ID}_CAD-pack_${P.L}x${P.W}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    showDlToast(a.download);
  } catch(e){
    console.error(e);
    alert(t('❌ Something went wrong — please try again, or email hello@batheatelier.com directly.'));
  }
  if(btn){
    btn.disabled = false;
    btn.textContent = t('⬇ CAD pack (DXF + spec + renders)');
    if(btn.firstChild) i18nNodes.push([btn.firstChild, '⬇ CAD pack (DXF + spec + renders)']);
  }
}

// ---------- CAD 閘門：免費層不提供可製造檔案 ----------
function showCadGate(){
  const b = document.getElementById('quoteBanner');
  b.style.display = 'block';
  b.style.background = '#fdf8ee'; b.style.border = '1px solid #d9c48f'; b.style.color = '#6b5518';
  b.textContent = t('The manufacturing CAD pack — dimensioned DXF three-views plus the full spec file — is emailed together with your firm quote after you submit your design below.');
  b.scrollIntoView({behavior:'smooth', block:'center'});
}

// ---------- Concept PDF（浮水印、無尺寸三視圖）----------
let _jspdfP = null;
function loadJsPDF(){
  if(!_jspdfP) _jspdfP = new Promise((res, rej)=>{
    if(window.jspdf) return res(window.jspdf.jsPDF);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = ()=>res(window.jspdf.jsPDF);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return _jspdfP;
}
async function exportConceptPDF(btn){
  const old = btn ? btn.textContent : null;
  if(btn){ btn.disabled = true; btn.textContent = t('Generating PDF…'); }
  try {
    const JsPDF = await loadJsPDF();
    if(handleGroup) handleGroup.visible = false;          // 快照不含拖曳把手
    resize(); updateCamera(); renderer.render(scene, camera);
    const img = renderer.domElement.toDataURL('image/jpeg', 0.9);
    if(handleGroup) handleGroup.visible = true;
    const cw = renderer.domElement.width, ch = renderer.domElement.height;
    const doc = new JsPDF({unit:'mm', format:'a4'});
    doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.setTextColor(27,26,22);
    doc.text('BATHE ATELIER', 105, 20, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(110,105,90);
    doc.text('Design Concept Summary', 105, 27, {align:'center'});
    const w = 150, h = Math.min(105, w*ch/cw);
    doc.addImage(img, 'JPEG', (210-w)/2, 33, w, h);
    const s = computeSpec();
    let y = 33 + h + 13;
    const rows = [
      ['Design ID', DESIGN_ID],
      ['Date', new Date().toISOString().slice(0,10)],
      ['Silhouette', P.shape === 'custom' ? 'Custom sketch' : P.shape],
      ['Overall size', P.L + ' x ' + P.W + ' x ' + P.H + ' mm (rim rear ' + (P.H + P.dH) + ' mm)'],
      ['Material', P.material === 'solid' ? 'Solid surface (matte)' : 'Premium acrylic (gloss)'],
      ['Colour', P.color],
      ['Capacity (est.)', s.fullVol.toFixed(0) + ' L']
    ];
    doc.setFontSize(10.5); doc.setTextColor(50,48,42);
    rows.forEach(r=>{
      doc.setFont('helvetica','bold');   doc.text(r[0], 32, y);
      doc.setFont('helvetica','normal'); doc.text(String(r[1]), 78, y);
      y += 7;
    });
    y += 5;
    doc.setFontSize(9); doc.setTextColor(130,125,110);
    doc.text('This concept summary is for design review only and is not dimensioned for manufacture.', 32, y); y += 5;
    doc.text('The manufacturing CAD pack (dimensioned DXF three-views + full spec) is released with your firm quote.', 32, y);
    // 對角浮水印（蓋在最上層）
    try { doc.saveGraphicsState(); doc.setGState(new doc.GState({opacity: 0.16})); } catch(e){}
    doc.setFont('helvetica','bold'); doc.setFontSize(30); doc.setTextColor(150,120,60);
    for(let wy = 70; wy < 290; wy += 75){
      doc.text('CONCEPT - NOT FOR MANUFACTURE', 105, wy, {align:'center', angle:28});
    }
    try { doc.restoreGraphicsState(); } catch(e){}
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(150,145,130);
    doc.text('(c) Bathe Atelier - ' + DESIGN_ID + ' - hello@batheatelier.com', 105, 292, {align:'center'});
    doc.save(DESIGN_ID + '-concept.pdf');
    showDlToast(DESIGN_ID + '-concept.pdf');
  } catch(e){
    console.error(e);
    alert(t('❌ Something went wrong — please try again, or email hello@batheatelier.com directly.'));
  }
  if(btn){
    btn.disabled = false;
    btn.textContent = t('⬇ Concept PDF (free)');
    if(btn.firstChild) i18nNodes.push([btn.firstChild, '⬇ Concept PDF (free)']);
  }
}

function download(content, filename, mime){
  const bom = filename.endsWith('.json') ? '﻿' : '';
  const blob = new Blob([bom + content], {type: mime + ';charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  showDlToast(filename);
}

// 下載成功提示（reviewer 2026-07-20 反饋：檔案默默進下載夾＝以為「什麼都沒發生」）
let _dlToastT = null;
function showDlToast(filename){
  let el = document.getElementById('dlToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'dlToast';
    el.style.cssText = 'position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(27,26,22,.93);color:#f4f1ea;font-size:13.5px;padding:11px 20px;border-radius:999px;z-index:60;max-width:86%;box-shadow:0 6px 18px rgba(0,0,0,.28);line-height:1.4;text-align:center';
    const viewer = document.getElementById('viewer');
    if(viewer) viewer.appendChild(el); else document.body.appendChild(el);
  }
  el.innerHTML = '<b style="color:#d4b36a">✓ </b>' + t('Downloaded to your Downloads folder:') + ' <b>' + filename + '</b>';
  el.style.display = 'block';
  clearTimeout(_dlToastT);
  _dlToastT = setTimeout(()=>{ el.style.display = 'none'; }, 9000);
}

// ===================== CAD 檔案匯入（DXF / STL / JSON） =====================
let extGroup = null;
