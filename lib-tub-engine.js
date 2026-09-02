// lib-tub-engine.js 幾何引擎＋buildTub＋規格 — 由 customize.html 抽出（行 829-1378），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== 輪廓產生（Flat外形） =====================
function rawOutline(shape, L, W, r){
  const hl=L/2, hw=W/2, pts=[];
  if(shape === 'ellipse'){
    for(let i=0;i<192;i++){ const a=i/192*Math.PI*2; pts.push([hl*Math.cos(a), hw*Math.sin(a)]); }
  } else {
    const rad = (shape==='stadium') ? hw : Math.min(r, hl-1, hw-1);
    const seg=24;
    const arc=(cx,cy,a0,a1)=>{ for(let i=0;i<=seg;i++){ const a=a0+(a1-a0)*i/seg; pts.push([cx+rad*Math.cos(a), cy+rad*Math.sin(a)]); } };
    pts.push([hl,-hw+rad]);            // 從右側開始，與橢圓的角度 0 對齊
    arc(hl-rad, hw-rad, 0, Math.PI/2);
    pts.push([-hl+rad, hw]);
    arc(-hl+rad, hw-rad, Math.PI/2, Math.PI);
    pts.push([-hl, -hw+rad]);
    arc(-hl+rad, -hw+rad, Math.PI, Math.PI*1.5);
    pts.push([hl-rad, -hw]);
    arc(hl-rad, -hw+rad, -Math.PI/2, 0);
  }
  return pts;
}

// 均勻弧長重取樣為 N 點（閉合）
function resample(pts, N){
  const d=[0];
  for(let i=1;i<=pts.length;i++){
    const a=pts[i-1], b=pts[i%pts.length];
    d.push(d[i-1]+Math.hypot(b[0]-a[0], b[1]-a[1]));
  }
  const total=d[pts.length], out=[];
  let j=0;
  for(let k=0;k<N;k++){
    const target=k/N*total;
    while(d[j+1]<target) j++;
    const f=(target-d[j])/(d[j+1]-d[j] || 1);
    const a=pts[j], b=pts[(j+1)%pts.length];
    out.push([a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f]);
  }
  return out;
}

// 最終Flat輪廓：套用Egg factor（Front end +x 變窄、後端 -x 變寬）；手繪形狀直接縮放
function outlinePts(shape, L, W, r, eggPct, N){
  if(shape === 'custom' && P.customPts){
    return P.customPts.map(p=>[p[0]*L, p[1]*W]);
  }
  const e = eggPct/100;
  return resample(rawOutline(shape,L,W,r), N||96).map(p=>{
    const xn = p[0]/(L/2);
    return [p[0], p[1]*(1 - e*xn)];
  });
}

// 缸緣高度：沿長度方向變化（後端 -x 較高）
// Rise curvature P.arc：0%=直線；越高 S 曲線越彎（冪次混合函數，p=1 時退化為線性）
function rimH(x, L, H, dH){
  const xn = Math.max(-1, Math.min(1, x/(L/2)));
  const u = (1 - xn)/2;                                  // 0=Front end, 1=後端
  const p = 1 + (P.arc/100)*3;                           // p ∈ [1,4]
  const up = Math.pow(u, p), vp = Math.pow(1-u, p);
  const f = (up + vp) > 0 ? up/(up + vp) : u;
  return H + dH*f;
}

function shoelace(pts){
  let a=0;
  for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; a += p[0]*q[1]-q[0]*p[1]; }
  return Math.abs(a)/2;
}

// 二次貝茲：Base taper → 中段外鼓 → 缸口
function bez(k0, c, v){ const u=1-v; return u*u*k0 + 2*u*v*c + v*v*1; }

// 牆壁剖面：手繪剖面優先，否則用貝茲曲線
// 倒扣限制：P.undercut=false（常規上下垂直出模）時，側壁任何高度都不得外鼓超過缸口（k ≤ 1）
// inner=true 時忽略裙擺（裙擺只作用於外殼，內缸維持正常碗形）
function wallK(v, k0, c, inner){
  let k;
  if(P.customProfile && P.shape === 'custom'){
    const arr = P.customProfile, t = Math.max(0, Math.min(1, v)) * (arr.length - 1);
    const i = Math.floor(t), f = t - i;
    k = arr[i] * (1 - f) + arr[Math.min(i + 1, arr.length - 1)] * f;
  } else if(P.skirt && !inner){
    k = skirtShellK(v, k0, c);
  } else if(P.wallMode === 'arc'){
    k = arcK(v, k0);
  } else if(P.wallMode === 's'){
    k = sArcK(v, k0);
  } else {
    k = bez(k0, c, v);
  }
  return P.undercut ? k : Math.min(k, 1);
}

// 上段剖面（可從任意起點高度 zA、起點寬 kw 接續到缸緣）：依 wallMode 回傳絕對 x（mm）
function coreX(z, kw, zA, c){
  const x1 = P.W/2, h = Math.max(1, P.H + P.dH/2);
  if(P.wallMode === 'arc') return arcBetween([kw*x1, zA], [x1, h], P.wallR, +1, z);
  if(P.wallMode === 's'){
    const vm = Math.max(0.15, Math.min(0.85, P.wallMid/100));
    const J = [kw*x1 + (x1-kw*x1)*vm, zA + (h-zA)*vm];
    return z <= J[1] ? arcBetween([kw*x1, zA], J, P.wallR, +1, z)
                     : arcBetween(J, [x1, h], P.wallR2, -1, z);
  }
  const v2 = (z - zA) / Math.max(1, h - zA);
  return bez(kw, c, v2) * x1;
}

// 裙擺安全幾何（快取）：
// ① 收腰寬度不得窄於「內缸壁在該高度＋壁厚」——否則外殼切進內缸
// ② 弧的有效 R 由數值檢查迭代放大，直到整段弧與內缸壁保持安全距離（R 太小＝做得太飽會咬穿）
// 圖面標註與規格表都顯示有效值
let _skirtCache = { key:'' };
function skirtGeom(){
  const key = [P.W, P.H, P.dH, P.b, P.t, P.taper, P.skirtH, P.waistK, P.skirtR, P.shape,
               P.customProfile ? 1 : 0].join(',');
  if(_skirtCache.key === key) return _skirtCache;
  const x1 = P.W/2, h = Math.max(1, P.H + P.dH/2);
  const zA = Math.max(h*0.08, Math.min(h*0.6, P.skirtH));
  const inn = innerDims(), s = baseK(), k0 = s;
  const innerX = z => (z <= P.b) ? 0 : (inn.W/2) * wallK((z - P.b) / Math.max(1, h - P.b), s, 1.03, true);
  // ① 收腰下限
  const kw = Math.max(P.waistK/100, (innerX(zA) + P.t) / x1);
  // ② R 下限：先夾弦長 0.75 倍，再迭代放大到全程安全（R→∞ 退化為直線弦，必收斂）
  const d = Math.hypot((kw - k0)*x1, zA);
  let R = Math.max(P.skirtR, d*0.75);
  for(let it = 0; it < 14; it++){
    let ok = true;
    for(let m = 1; m < 24; m++){
      const z = zA*m/24;
      if(arcBetween([k0*x1, 0], [kw*x1, zA], R, -1, z) < innerX(z) + P.t*0.75){ ok = false; break; }
    }
    if(ok) break;
    R *= 1.3;
  }
  _skirtCache = { key, zA, kw, R };
  return _skirtCache;
}
function skirtReff(){ return skirtGeom().R; }
function waistKeff(){ return skirtGeom().kw; }

// 裙擺式外殼（Oneida 式三段）：裙擺脚（寬=底部收縮）反向弧外翻 → 收腰 → 上段剖面到缸緣
function skirtShellK(v, k0, c){
  const x1 = P.W/2, h = Math.max(1, P.H + P.dH/2);
  const z = Math.max(0, Math.min(1, v)) * h;
  const g = skirtGeom();
  if(z <= g.zA) return arcBetween([k0*x1, 0], [g.kw*x1, g.zA], g.R, -1, z) / x1;
  return coreX(z, g.kw, g.zA, c) / x1;
}

// ---------- 側壁圓弧幾何（工廠 R 值語言，會議 2026-07-10 工廠端） ----------
// 兩點＋半徑＋凸向的圓弧，在高度 z 取 x：side=+1 向 +x 外鼓、side=-1 反向（內凹）
// R 太小時自動夾到可成弧的最小值（弦長一半）
function arcBetween(p, q, Rr, side, z){
  const dx=q[0]-p[0], dz=q[1]-p[1], d=Math.max(1e-6, Math.hypot(dx,dz));
  const R=Math.max(Rr, d/2 + 0.5);
  const m=Math.sqrt(Math.max(0, R*R - d*d/4));
  const cx2=(p[0]+q[0])/2 - side*m*dz/d, cz=(p[1]+q[1])/2 + side*m*dx/d;   // 圓心在弦法線側
  const sq=Math.sqrt(Math.max(0, R*R - (z-cz)*(z-cz)));
  return side>0 ? cx2+sq : cx2-sq;
}
// 單弧：以寬度方向（短邊，如 580）剖面為定義基準——起點＝收縮後缸底邊 (W/2·k0, 0)、終點＝缸緣邊 (W/2, H)
function arcK(v, k0){
  const x1 = P.W/2, x0 = x1*k0, h = Math.max(1, P.H + P.dH/2);
  const z = Math.max(0, Math.min(1, v))*h;
  return arcBetween([x0,0], [x1,h], P.wallR, +1, z)/x1;
}
// S 曲線（雙弧，達爾文式）：下段 R1 外鼓、上段 R2 反向內收，轉折點在弦上 P.wallMid% 高度
function sArcK(v, k0){
  const x1 = P.W/2, x0 = x1*k0, h = Math.max(1, P.H + P.dH/2);
  const vm = Math.max(0.15, Math.min(0.85, P.wallMid/100));
  const J = [x0 + (x1-x0)*vm, h*vm];
  const z = Math.max(0, Math.min(1, v))*h;
  const xr = (z <= J[1]) ? arcBetween([x0,0], J, P.wallR, +1, z)
                         : arcBetween(J, [x1,h], P.wallR2, -1, z);
  return xr/x1;
}

// ---------- 手繪剖面 → 圓弧擬合（把自由曲線翻成工廠 R 語言） ----------
// Kasa 最小平方圓擬合：回傳圓心/半徑/最大偏差
function fitCircle(pts){
  let Sx=0,Sz=0,Sxx=0,Szz=0,Sxz=0,Sxr=0,Szr=0,Sr=0;
  const n=pts.length;
  pts.forEach(([x,z])=>{ const r=x*x+z*z; Sx+=x; Sz+=z; Sxx+=x*x; Szz+=z*z; Sxz+=x*z; Sxr+=x*r; Szr+=z*r; Sr+=r; });
  // 解 3x3：[Sxx Sxz Sx; Sxz Szz Sz; Sx Sz n]·[A B C] = [Sxr Szr Sr]，圓 x²+z² = A·x+B·z+C
  const M=[[Sxx,Sxz,Sx],[Sxz,Szz,Sz],[Sx,Sz,n]], V=[Sxr,Szr,Sr];
  const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D=det(M);
  if(Math.abs(D)<1e-9) return {cx:0, cz:0, R:1e9, err:1e9};
  const rep=(m,c2,v2)=>m.map((row,i2)=>row.map((x2,j2)=>j2===c2?v2[i2]:x2));
  const A=det(rep(M,0,V))/D, B=det(rep(M,1,V))/D, C=det(rep(M,2,V))/D;
  const cx=A/2, cz=B/2, R=Math.sqrt(Math.max(0, C+cx*cx+cz*cz));
  let err=0;
  pts.forEach(([x,z])=>{ err=Math.max(err, Math.abs(Math.hypot(x-cx,z-cz)-R)); });
  return {cx, cz, R, err};
}
// 把手繪側牆剖面（k 取樣）擬合成 1–3 段圓弧；容差 6mm（實際 mm 座標）
function fitProfileArcs(){
  if(!(P.customProfile && P.shape==='custom')) return null;
  const h=Math.max(1, P.H+P.dH/2), x1=P.W/2, arr=P.customProfile, N=arr.length-1;
  const pts=arr.map((k,i)=>[Math.min(k,P.undercut?k:1)*x1, i/N*h]);
  const TOL=6;
  const tryFit=bnd=>{
    const arcs=[];
    for(let s2=0;s2<bnd.length-1;s2++){
      const seg=pts.slice(bnd[s2], bnd[s2+1]+1);
      const c=fitCircle(seg);
      arcs.push({R:c.R, err:c.err, v0:bnd[s2]/N, v1:bnd[s2+1]/N, straight:c.R>12000});
    }
    return arcs;
  };
  let best=null;
  [[0,N],[0,Math.round(N/2),N],[0,Math.round(N/3),Math.round(2*N/3),N]].forEach(bnd=>{
    if(best && best.ok) return;
    const arcs=tryFit(bnd), maxErr=Math.max(...arcs.map(a=>a.err));
    const cand={arcs, maxErr, ok:maxErr<=TOL};
    if(!best || cand.ok || maxErr<best.maxErr) best=cand;
  });
  best.label=best.arcs.map(a=>a.straight?'STR':'R'+Math.round(a.R)).join(' + ');
  return best;
}
// 缸底相對缸口的比例（legacy 模式）
function baseK(){ return (P.customProfile && P.shape === 'custom') ? P.customProfile[0] : P.taper/100; }

// ---------- Factory 模式（達爾文圖面語言，2026-07-13）----------
// 內外殼各自獨立：上口尺寸＋底部尺寸＋連接弧 R；長邊/短邊剖面 R 各自獨立。
// 幾何為「每軸縮放」：點 (x,y) 在高度 z 映射為 (x·kx(z), y·ky(z))，
// kx 由長邊剖面弧決定、ky 由短邊剖面弧決定，0°/90° 剖面即為圖面上的真實弧。
function isFactory(){ return P.wallMode === 'factory' && !(P.customProfile && P.shape === 'custom'); }
// v=0 → 該殼體底部、v=1 → 缸緣；inner=true 內缸（底部在 z=P.b）
function facK(v, inner){
  const h = Math.max(1, P.H + P.dH/2);
  if(inner){
    const z = P.b + Math.max(0, Math.min(1, v)) * (h - P.b);
    const xt = Math.max(1, (P.L - 2*P.lip)/2), yt = Math.max(1, (P.W - 2*P.lip)/2);
    let kx = arcBetween([P.ibL/2, P.b], [xt, h], P.riL, +1, z) / xt;
    let ky = arcBetween([P.ibW/2, P.b], [yt, h], P.riW, +1, z) / yt;
    if(!P.undercut){ kx = Math.min(kx, 1); ky = Math.min(ky, 1); }
    return [kx, ky];
  }
  const z = Math.max(0, Math.min(1, v)) * h;
  let kx = arcBetween([P.obL/2, 0], [P.L/2, h], P.roL, +1, z) / (P.L/2);
  let ky = arcBetween([P.obW/2, 0], [P.W/2, h], P.roW, +1, z) / (P.W/2);
  if(!P.undercut){ kx = Math.min(kx, 1); ky = Math.min(ky, 1); }
  return [kx, ky];
}
// 統一介面：任何模式回傳 [kx, ky]（legacy 模式 kx=ky=wallK）
function shellKxy(v, inner){
  if(isFactory()) return facK(v, inner);
  const k = wallK(v, baseK(), inner ? 1.03 : 1.07, inner);
  return [k, k];
}
// 底部尺寸順序硬限制：外缸底必須大於內缸底（兩側合計至少 BASE_GAP，每側 5mm 壁厚）
// 調整哪個參數就 clamp 哪個（滑桿拉到界限自動停住）；匯入/網址參數用 sanitizeBase() 統一修正
const BASE_GAP = 10;
function enforceBaseOrder(key){
  let changed = false;
  if(key === 'ibL' && P.ibL > P.obL - BASE_GAP){ P.ibL = P.obL - BASE_GAP; changed = true; }
  if(key === 'ibW' && P.ibW > P.obW - BASE_GAP){ P.ibW = P.obW - BASE_GAP; changed = true; }
  if(key === 'obL' && P.obL < P.ibL + BASE_GAP){ P.obL = P.ibL + BASE_GAP; changed = true; }
  if(key === 'obW' && P.obW < P.ibW + BASE_GAP){ P.obW = P.ibW + BASE_GAP; changed = true; }
  return changed;
}
function sanitizeBase(){
  if(P.ibL > P.obL - BASE_GAP) P.ibL = P.obL - BASE_GAP;   // 來源不明時以外缸底為準、內縮內缸底
  if(P.ibW > P.obW - BASE_GAP) P.ibW = P.obW - BASE_GAP;
}

// 內外殼最小壁厚掃描（factory 模式防呆：全高度、長寬兩軸取最小水平間距）
function minWallGap(){
  if(!isFactory()) return 99;
  const h = Math.max(1, P.H + P.dH/2);
  const xtI = (P.L - 2*P.lip)/2, ytI = (P.W - 2*P.lip)/2;
  let g = P.lip;                                   // 缸口平邊本身也是壁厚的一部分
  for(let i=0;i<=24;i++){
    const z = P.b + (h - P.b)*i/24;
    const [ox, oy] = facK(z/h, false);
    const [ix, iy] = facK((z - P.b)/Math.max(1, h - P.b), true);
    g = Math.min(g, ox*P.L/2 - ix*xtI, oy*P.W/2 - iy*ytI);
  }
  return g;
}

// ===================== 曲面放樣建模 =====================
let tubGroup = null;
const N_SEG = 96, M_RING = 24;

function innerDims(){
  const e = isFactory() ? P.lip : P.t;   // factory 模式：內缸口＝外缸口 − 2×邊寬
  return { L:P.L-2*e, W:P.W-2*e, D:P.H-P.b, r:Math.max(P.r-e,10) };
}

// 放樣曲面：由底環漸變至缸緣(rimH(x), 縮放1)；縮放採每軸 [kx,ky]（factory 長短邊獨立弧）
// z0f（選用）：底環各點的高度函式（如洩水斜底）；inner=true 表示內殼（不套裙擺）
function loftGeometry(pts, L, z0, H, dH, z0f, inner){
  const pos=[], idx=[];
  const [kbx, kby] = shellKxy(0, inner);
  for(let m=0;m<=M_RING;m++){
    const v=m/M_RING, [kx, ky]=shellKxy(v, inner);
    for(let i=0;i<N_SEG;i++){
      const [x,y]=pts[i];
      const zTop=rimH(x, L, H, dH);
      const zB = z0f ? z0f(x*kbx, y*kby) : z0;
      pos.push(x*kx, zB+v*(zTop-zB), y*ky);
    }
  }
  for(let m=0;m<M_RING;m++)
    for(let i=0;i<N_SEG;i++){
      const a=m*N_SEG+i, b=m*N_SEG+(i+1)%N_SEG, c=a+N_SEG, d=b+N_SEG;
      idx.push(a,c,b, b,c,d);
    }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 環帶（缸緣：外頂環 → 內頂環）
// Rim profile：flat Flat直接相連；round Rounded＝半圓滾邊向上鼓起；bevel Beveled＝中間隆起的兩段斜面
function stripGeometry(ptsA, LA, ptsB, LB, H, dH){
  const RM = (P.rim === 'flat') ? 1 : 10;
  const rise = P.t * 0.5;                                    // 隆起高度 = 壁厚一半
  const bump = u => P.rim === 'round' ? Math.sin(u*Math.PI)*rise
              : P.rim === 'bevel' ? (u < 0.5 ? u*2 : (1-u)*2)*rise
              : 0;
  const pos=[], idx=[];
  for(let m=0;m<=RM;m++){
    const u = m/RM;
    for(let i=0;i<N_SEG;i++){
      const [xa,ya]=ptsA[i], [xb,yb]=ptsB[i];
      const x = xa+(xb-xa)*u, y = ya+(yb-ya)*u;
      pos.push(x, rimH(x, LA+(LB-LA)*u, H, dH) + bump(u), y);
    }
  }
  for(let m=0;m<RM;m++)
    for(let i=0;i<N_SEG;i++){
      const a=m*N_SEG+i, b=m*N_SEG+(i+1)%N_SEG, c=a+N_SEG, d=b+N_SEG;
      idx.push(a,b,c, b,d,c);
    }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Flat封蓋（底板 / 缸內底面）。z0f(選用，2026-08-22缸底斜面下放Basic新增)：跟loftGeometry()
// 同一個約定，逐點高度函式，未傳時維持原本單一z值的行為不變
function capGeometry(pts, kx, ky, z, z0f){
  const center = z0f ? z0f(0, 0) : z;
  const pos=[0, center, 0], idx=[];
  for(let i=0;i<N_SEG;i++){
    const x=pts[i][0]*kx, y=pts[i][1]*ky;
    pos.push(x, z0f ? z0f(x, y) : z, y);
  }
  for(let i=0;i<N_SEG;i++) idx.push(0, i+1, (i+1)%N_SEG+1);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 缸底整體傾斜(單一斜率參數，2026-08-22原為Pro專屬進階選項，Lyric裁定改列基本功能下放Medium/Basic)。
// 只沿長軸(X)方向線性傾斜，+X端墊高、−X端下沉。P.baseSlope=0時回傳恆為0，等同沒有這個函式存在。
// 安全clamp：下沉端最多吃掉70%的P.b(缸底厚度)，跟lib-edit3d-geometry.js的outerBaseZ()同一份邏輯，
// 逐字複製過來(Basic是獨立引擎，沒有共用模組可以直接reuse)。
function outerBaseZ(x){
  if(!P.baseSlope) return 0;
  const raw = Math.tan(P.baseSlope * Math.PI / 180) * x;
  const cap = P.b * 0.7;
  return Math.max(-cap, Math.min(cap, raw));
}

// 排水位置（工廠常規三式）：中間集中 / 兩頭（長軸 X 正負端）/ 短邊（寬軸 Y 端）
function drainXY(){
  const inn=innerDims(), fac=isFactory(), s=baseK();
  const reach = Math.max(0, (fac ? P.ibL/2 : inn.L/2*s) - 130);
  const reachW = Math.max(0, (fac ? P.ibW/2 : inn.W/2*s) - 110);
  if(P.drain==='back')  return {x:-reach, y:0};
  if(P.drain==='front') return {x: reach, y:0};
  if(P.drain==='side')  return {x:0, y:reachW};
  if(P.drain==='side2') return {x:0, y:-reachW};
  return {x:0, y:0};
}

// 洩水斜底：缸內底面高度（排水孔＝最低點 P.b，向外以 P.slope° 升高）
function floorZ(x, y){
  const d = drainXY();
  return P.b + Math.tan(P.slope*Math.PI/180) * Math.hypot(x-d.x, y-d.y);
}

// 洩水斜底封蓋（以排水孔為扇心，環點依距離升高）
function slopedCapGeometry(pts, kx, ky, z0){
  const d = drainXY();
  const pos=[d.x, z0, d.y], idx=[];
  for(let i=0;i<N_SEG;i++){
    const x=pts[i][0]*kx, y=pts[i][1]*ky;
    pos.push(x, floorZ(x, y), y);
  }
  for(let i=0;i<N_SEG;i++) idx.push(0, i+1, (i+1)%N_SEG+1);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildTub(){
  if(typeof clearExt === 'function') clearExt();     // 離開外部 CAD 檢視模式
  if(tubGroup){ scene.remove(tubGroup); tubGroup.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); }); }
  tubGroup = new THREE.Group();
  const inn = innerDims();
  const valid = inn.L>100 && inn.W>100 && inn.D>100;
  document.getElementById('warn').style.display = valid ? 'none' : 'block';
  if(!valid){ scene.add(tubGroup); return; }

  const outerPts = outlinePts(P.shape, P.L, P.W, P.r, P.egg, N_SEG);
  const innerPts = outlinePts(P.shape, inn.L, inn.W, inn.r, P.egg, N_SEG);
  const [obx, oby] = shellKxy(0, false), [ibx, iby] = shellKxy(0, true);
  const mat = new THREE.MeshStandardMaterial({ color:P.color, roughness:P.material==='solid'?0.6:0.22, metalness:0.05, side:THREE.DoubleSide });

  tubGroup.add(new THREE.Mesh(loftGeometry(outerPts, P.L, 0,   P.H, P.dH, (x,y)=>outerBaseZ(x)), mat)); // 外殼(缸底斜面z0f)
  tubGroup.add(new THREE.Mesh(loftGeometry(innerPts, inn.L, P.b, P.H, P.dH, floorZ, true), mat)); // 內壁（底=洩水斜底，不套裙擺）
  tubGroup.add(new THREE.Mesh(stripGeometry(outerPts, P.L, innerPts, inn.L, P.H, P.dH), mat)); // 缸緣
  tubGroup.add(new THREE.Mesh(capGeometry(outerPts, obx, oby, 0, (x,y)=>outerBaseZ(x)), mat));   // 底封板(跟外殼base ring用同一個z0f，接縫吻合)
  tubGroup.add(new THREE.Mesh(slopedCapGeometry(innerPts, ibx, iby, P.b), mat)); // 缸內底面（向排水孔傾斜 P.slope°）

  // 排水孔（位於斜底最低點）
  const d = drainXY();
  const drain = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 26, 8, 32),
    new THREE.MeshStandardMaterial({color:0x666e75, metalness:0.8, roughness:0.3})
  );
  drain.position.set(d.x, P.b+4, d.y);
  tubGroup.add(drain);

  // 溢水口（工廠標準件，細部不建模）：後端內壁、距缸緣 P.ovfDrop
  if(P.ovf){
    const hRef = Math.max(1, P.H + P.dH/2);
    const zo = Math.max(P.b+40, rimH(-inn.L/2, inn.L, P.H, P.dH) - P.ovfDrop);
    const vo = Math.max(0, Math.min(1, (zo - P.b) / Math.max(1, hRef - P.b)));
    const ko = shellKxy(vo, true);
    const om = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 26, 6, 24),
      new THREE.MeshStandardMaterial({color:0x666e75, metalness:0.8, roughness:0.3})
    );
    om.rotation.z = Math.PI/2;
    om.position.set(-(inn.L/2)*ko[0] + 8, zo, 0);
    tubGroup.add(om);
  }

  // 水位模擬（藍色半透明 = 水）：沿內壁放樣的水體，水面平坦、高度 = 內部深度的八成
  if(P.water){
    const wd = inn.D*0.8, wl = P.b + wd;
    const WM = 10, wpos = [], widx = [];
    for(let m=0;m<=WM;m++){
      const z = P.b + wd*m/WM;
      for(let i=0;i<N_SEG;i++){
        const [x,y] = innerPts[i];
        const vEff = (z - P.b) / Math.max(1, rimH(x, inn.L, P.H, P.dH) - P.b);   // 對應內壁的高度參數
        const kw = shellKxy(vEff, true);
        wpos.push(x*kw[0]*0.985, z, y*kw[1]*0.985);
      }
    }
    for(let m=0;m<WM;m++)
      for(let i=0;i<N_SEG;i++){
        const a=m*N_SEG+i, b2=m*N_SEG+(i+1)%N_SEG, c=a+N_SEG, d=b2+N_SEG;
        widx.push(a,c,b2, b2,c,d);
      }
    // 平坦水面（頂蓋）
    const centerIdx = wpos.length/3;
    wpos.push(0, wl, 0);
    for(let i=0;i<N_SEG;i++) widx.push(centerIdx, WM*N_SEG+i, WM*N_SEG+(i+1)%N_SEG);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos,3));
    wg.setIndex(widx);
    wg.computeVertexNormals();
    const water = new THREE.Mesh(wg,
      new THREE.MeshStandardMaterial({color:0x7ec8e3, transparent:true, opacity:0.55, roughness:0.1, side:THREE.DoubleSide})
    );
    water.name = 'waterSim';   // AR匯出(lib-edit3d-ar-export.js的buildExportGroup)靠這個名字濾掉水位模擬，跟lib-edit3d-geometry.js一致
    tubGroup.add(water);
  }

  scene.add(tubGroup);
  orbit.target.set(0, (P.H+P.dH/2)/2, 0);
  updateSpec();
  if(typeof buildHandles === 'function') buildHandles();
}

// ===================== 規格計算 =====================
function computeSpec(){
  const inn = innerDims();
  // 數值積分：截面積隨高度以 kx(v)·ky(v) 縮放（factory 模式長短邊獨立弧）
  let taperF = 0;
  for(let i=0;i<=32;i++){ const ks = shellKxy(i/32, true); taperF += ks[0]*ks[1]; }   // 內腔容積：不含裙擺
  taperF /= 33;
  const Ai = shoelace(outlinePts(P.shape, inn.L, inn.W, inn.r, P.egg, N_SEG));
  const Ao = shoelace(outlinePts(P.shape, P.L, P.W, P.r, P.egg, N_SEG));
  const fullVol = Ai*inn.D*taperF/1e6;
  const useVol = fullVol*0.8;                   // 與水位模擬一致：八成滿
  const Hmid = P.H + P.dH/2;
  const shellVol = Ao*Hmid*taperF - Ai*(Hmid-P.b)*taperF;
  // 重量（2026-07 校準，與 Materials 頁一致：壓克力 27–45 kg、人造石 90–150 kg）：
  // 人造石＝實心澆鑄，幾何殼體即實際材料量；
  // 壓克力＝熱塑板材（4–6mm）＋玻纖補強，與模具壁厚設定無關 →
  //   幾何殼體 ÷ 壁厚 ≈ 表面積，按等效板厚 6mm、複合密度 1.5 g/cm³ 計。
  let weight;
  if(P.material === 'solid'){
    weight = shellVol * 1.75e-6;
  } else {
    weight = (shellVol / Math.max(P.t, 1)) * 7.2e-6;   // 等效面密度 ~7.2 kg/m²（4.5mm 壓克力＋玻纖補強）
  }
  const crated = weight + 8;   // 2026-09-02校準：實際包裝約比產品重8kg，原本按底板面積估算的木箱重量明顯偏高
  return { inn, fullVol, useVol, weight, crated };
}

function updateSpec(){
  const s = computeSpec();
  // B3(2026-09-02)：每列改成三元組 [英文鍵, 翻譯後標籤, 值]，供 Basic 白名單比對用（第一欄用未翻譯英文鍵）
  const rows = [
    ['Material', t('Material'), t(P.material==='solid' ? 'Solid surface' : 'Premium acrylic')],
    ['Rim shape', t('Rim shape'), P.shape==='custom' ? t('✏️ Custom sketch') : t({rect:'Rounded Rect',stadium:'Rounded Ends',ellipse:'Oval'}[P.shape])],
    ['Overall size (L×W)', t('Overall size (L×W)'), `${P.L} × ${P.W} mm`],
    ['Rim height front / rear', t('Rim height front / rear'), `${P.H} / ${P.H+P.dH} mm`],
    ['Rim profile', t('Rim profile'), t({flat:'Flat', round:'Rounded', bevel:'Beveled'}[P.rim])],
    ['Interior size (L×W)', t('Interior size (L×W)'), `${s.inn.L} × ${s.inn.W} mm`],
    ['Interior depth (front)', t('Interior depth (front)'), `${s.inn.D} mm`],
    ...(isFactory() ? [
      ['Rim edge width', t('Rim edge width'), `${P.lip} mm`],
      ['Outer base (L×W)', t('Outer base (L×W)'), `${P.obL} × ${P.obW} mm`],
      ['Inner base (L×W)', t('Inner base (L×W)'), `${P.ibL} × ${P.ibW} mm`],
    ] : [
      ['Base footprint (tapered)', t('Base footprint (tapered)'), `${Math.round(P.L*baseK())} × ${Math.round(P.W*baseK())} mm${(P.customProfile && P.shape==='custom') ? t(' (sketched profile)') : ''}`],
    ]),
    ['Full capacity (est.)', t('Full capacity (est.)'), `${s.fullVol.toFixed(0)} L`],
    ['Recommended fill (80%)', t('Recommended fill (80%)'), `${s.useVol.toFixed(0)} L`],
    ['Product weight (est.)', t('Product weight (est.)'), `~${s.weight.toFixed(0)} kg`],
    ['Crated shipping weight (est.)', t('Crated shipping weight (est.)'), `~${s.crated.toFixed(0)} kg`],
    ['Side wall profile', t('Side wall profile'), (function(){
      if(P.customProfile && P.shape==='custom'){
        const fit=fitProfileArcs();
        return (fit && fit.ok) ? `≈ ${fit.label}` : t('Freeform (no clean arc fit)');
      }
      if(isFactory()) return `IN R${P.riL}/R${P.riW} · OUT R${P.roL}/R${P.roW}`;
      if(P.wallMode==='arc') return `R${P.wallR}`;
      if(P.wallMode==='s')   return `R${P.wallR} + R${P.wallR2}`;
      return t('Default curve');
    })()],
    ...(isFactory() ? [['Overflow', t('Overflow'), P.ovf ? t('Yes (factory std)') : t('None')]] : []),
    ['Pedestal skirt', t('Pedestal skirt'), P.skirt ? `R${Math.round(skirtReff())} · ${P.skirtH}mm` : t('None')],
    ['Drain position', t('Drain position'), t({center:'Center', back:'End · rear', front:'End · front', side:'Short edge', side2:'Short edge · opposite'}[P.drain])],
    ['Floor drain slope', t('Floor drain slope'), `${P.slope}°`],
    ['Undercut', t('Undercut'), P.undercut ? t('Yes (split mould)') : t('None (vertical demould)')],
  ];
  // B3(2026-09-02)：Basic（PAGE_SPEC_COMPACT）只顯示 8 列，其餘收進 <details>；未設 flag 的頁面輸出與改前逐位元相同
  const specEl = document.getElementById('spec');
  const rowHtml = r => `<tr><td>${r[1]}</td><td>${r[2]}</td></tr>`;
  if(window.PAGE_SPEC_COMPACT === true){
    const KEEP = ['Material','Rim shape','Overall size (L×W)','Interior size (L×W)','Interior depth (front)','Full capacity (est.)','Product weight (est.)','Crated shipping weight (est.)'];
    const primary = KEEP.map(k => rows.find(r => r[0] === k)).filter(Boolean);
    const rest = rows.filter(r => !KEEP.includes(r[0]));
    const wasOpen = !!(specEl.querySelector('details') && specEl.querySelector('details').open);
    specEl.innerHTML = primary.map(rowHtml).join('')
      + `<tr><td colspan="2" style="padding:0"><details id="specMore"${wasOpen ? ' open' : ''}><summary>${t('Full specification')}</summary><table>${rest.map(rowHtml).join('')}</table></details></td></tr>`;
  } else {
    specEl.innerHTML = rows.map(rowHtml).join('');
  }
  // 會議規範警示：內長 <950 只能坐姿／蹲姿；壓克力＋倒扣＝左右合模高成本
  const lw = document.getElementById('lenWarn');
  if(lw){ lw.style.display = (s.inn.L < 950) ? 'block' : 'none'; lw.textContent = t('⚠ Interior length under 950mm — only suitable for seated / crouched bathing (leg-to-hip ≈ 900mm).'); }
  const uw = document.getElementById('undercutWarn');
  if(uw){ uw.style.display = (P.undercut && P.material==='acrylic') ? 'block' : 'none'; uw.textContent = t('⚠ Undercut on acrylic needs a split mould and hand-finished seams — high cost. Consider solid surface, or continue as premium bespoke.'); }
  const tw = document.getElementById('thinWarn');
  if(tw){ tw.style.display = (minWallGap() < 5) ? 'block' : 'none'; tw.textContent = t('⚠ Wall thickness below 5mm between inner and outer shells — adjust base sizes or arc R.'); }
  updatePrice();
}

// ===================== 三層定價引擎（PM 2026-07 定價結構） =====================
