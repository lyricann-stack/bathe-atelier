// ===================== lib-edit3d-geometry.js =====================
// Phase 5抽取(2026-08-20)：逐字抽自Edit3D單檔架構(photo2tub-app.html/medium.html)856-1362行的幾何引擎。
// 依賴宿主頁面提供：P(state)、N_SEG、scene/tubGroup/orbit(scene.js)、buildHandles(選用)。

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

// 內缸口輪廓（中央函式）：有獨立手繪內輪廓（customPtsInner，與外輪廓同座標系）就用它 →
// 邊寬可繞周變化；否則照舊由外形等比縮出（均勻邊寬），完全向下相容。
function innerOutlinePts(inn, N){
  if(P.customPtsInner) return P.customPtsInner.map(p=>[p[0]*P.L, p[1]*P.W]);
  return outlinePts(P.shape, inn.L, inn.W, inn.r, P.egg, N||N_SEG);
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
  // Phase 6A(2026-08-21)：customProfile的啟用條件從「&& P.shape==='custom'」解耦成只看
  // customProfile本身存在與否——語意上side profile(側牆形狀)跟top-view outline(俯視外形是
  // 圓/方/自訂)是正交的兩件事，舊寫法只是「customProfile歷史上只由手繪sketch產生、
  // 且sketch必然同時設shape=custom」這個巧合，不是刻意設計的耦合。放寬後customProfile可以
  // 獨立套用在任何top-view shape上(例如photo2tub只萃取到側面剖面、沒有俯視homography時)。
  // 優先序不變：customProfile > factory(見isFactory()) > 一般wallMode參數化——這裡本來就是
  // customProfile分支排最前面，沒有動到既有優先序。
  if(P.customProfile){
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

// ---------- 側壁圓弧幾何（工廠 R 值語言，會議 2026-07-10 張總） ----------
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
  if(!P.customProfile) return null;  // Phase 6A解耦，見wallK()註解
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
function baseK(){ return P.customProfile ? P.customProfile[0] : P.taper/100; }  // Phase 6A解耦，見wallK()註解

// ---------- Factory 模式（達爾文圖面語言，2026-07-13）----------
// 內外殼各自獨立：上口尺寸＋底部尺寸＋連接弧 R；長邊/短邊剖面 R 各自獨立。
// 幾何為「每軸縮放」：點 (x,y) 在高度 z 映射為 (x·kx(z), y·ky(z))，
// kx 由長邊剖面弧決定、ky 由短邊剖面弧決定，0°/90° 剖面即為圖面上的真實弧。
function isFactory(){ return P.wallMode === 'factory' && !P.customProfile; }  // Phase 6A解耦，見wallK()註解——customProfile優先序仍在factory之前，未變
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
  let k;
  if(isFactory()) k = facK(v, inner);
  else { const s = wallK(v, baseK(), inner ? 1.03 : 1.07, inner); k = [s, s]; }
  if(!inner && P.wallMod){
    const m = wallModAt(v);
    if(m) k = [k[0]*(1+m), k[1]*(1+m)];
  }
  return k;
}
// 側壁修飾層取值：33 點線性內插
// Phase 7(2026-08-21)：缸底連動修正——原本這裡直接回傳插值，v=0(缸底)那端如果Gaussian
// 節點的影響範圍剛好蓋到底部，會讓缸底footprint被側壁編輯意外拖動變形(既有缺口，非新問題，
// 對應Masa會議Stanley的設計原則「邊緣拉、底部不縮」)。修法：乘上v本身當衰減係數——
// v=0(缸底)強制歸零(不管節點的Gaussian插值算出什麼，缸底一律不受側壁編輯影響)、
// v=1(缸緣)保持100%不衰減、中間線性內插。只影響這個取值函式，不改變`recomputeSide()`
// 產生節點Gaussian delta的邏輯本身，所以拖曳手感(节点在v多少位置有多大峰值)不變，
// 變的只是「這個峰值實際套用到殼體時，越靠近缸底衰減得越多」。
function wallModAt(v){
  const a = P.wallMod;
  if(!a || !a.length) return 0;
  const vv = Math.max(0, Math.min(1, v));
  const t = vv * (a.length - 1);
  const j = Math.floor(t), f = t - j;
  const raw = a[j] + (a[Math.min(j + 1, a.length - 1)] - a[j]) * f;
  return raw * vv;  // 衰減：缸底(v=0)→0，缸緣(v=1)→100%，線性內插
}
// 缸緣高度修飾取值：依輪廓點索引（外殼/內壁/缸緣帶同索引對齊）
function rimModI(i){
  const a = P.rimMod;
  if(!a || !a.length) return 0;
  return a[((i % a.length) + a.length) % a.length] || 0;
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

// ===================== 浴缸設計基本原則約束層(Phase 7 §3，2026-08-21) =====================
// 目的：把散落各處的既有可製造性/設計原則檢核集中登記成一份清冊，方便之後Stanley的四項製造
// 參數／人造石供應商生產限制數字到位時，直接掛進同一份清冊，而不是再各自新增獨立warn div。
// 盤點結果(2026-08-21)：規格書§3(a)點名的四類原則裡，三類其實已經是既有上線功能——
// 最小內缸人體空間＝lenWarn(inn.L<950)、壁厚＝thinWarn(minWallGap()<5)、脫模角＝undercutWarn
// (P.undercut)，只有洩水坡度沒有獨立警示(滑桿本身就限制在1.3–1.5°範圍內、無法產生非法值，
// 屬於「靠輸入範圍防呆」而不是「執行期檢查」)。這裡不重複造一套新UI，只是正式命名＋集中登記
// (既有三個warn div維持原樣運作，不受影響)。§3(b)擬合端(Photo2Tub)串接：盤點後發現Photo2Tub
// 管線目前只輸出造型/比例類參數(shape_code/customPts/side_profile/L/W/egg%/taper%/dH)，
// 完全不輸出壁厚/脫模角/洩水坡度——這些欄位由前端編輯決定、Photo2Tub從未設定過，所以「擬合端
// 自動過同一套檢核」在v1階段沒有實質掛勾點，誠實記錄不強行接一個沒有意義的檢查。
function designPrincipleChecks(){
  const s = computeSpec();
  return [
    { id:'base-decay', label:'Base floor stays flat when shaping walls',
      status:'ok', source:'wallModAt()衰減乘數(結構性保證，非可能失敗的執行期檢查)',
      detail:'Stanley：邊緣拉、底部不縮——Phase 7 Step 0，commit 941a16e' },
    { id:'base-slope-thickness', label:'Base thickness preserved when tilting the base (advanced)',
      status:'ok', source:'outerBaseZ()安全clamp(結構性保證，2026-08-22佇列項11實測發現minWallGap()' +
        '不涵蓋此風險後補上)', detail:'缸底斜面下沉端最多吃掉70%缸底厚度，clamp在幾何層面強制執行，不是只警告' },
    { id:'inner-clearance', label:'Interior space large enough to sit in',
      status: s.inn.L < 950 ? 'warn' : 'ok', source:'既有lenWarn(#lenWarn)',
      detail:'內長<950mm僅適合坐姿/蹲姿(腿到臀約900mm)——門檻是既有值，非本次新訂' },
    { id:'wall-thickness', label:'Wall thickness between inner and outer shells',
      status: minWallGap() < 5 ? 'warn' : 'ok', source:'既有thinWarn(#thinWarn)',
      detail:`目前最小壁厚約${minWallGap().toFixed(1)}mm，門檻5mm——僅factory模式下有意義(非factory固定回傳99視為永遠合格)` },
    { id:'demould-angle', label:'Demould direction (undercut)',
      status: P.undercut ? 'warn' : 'ok', source:'既有undercutWarn(#undercutWarn)',
      detail: P.undercut ? '允許倒扣＝需左右合模＋手工修邊，成本較高' : '垂直出模，標準開模' },
    { id:'floor-slope', label:'Floor drain slope',
      status:'ok', source:'滑桿range防呆(#rSlope min=1.3 max=1.5)',
      detail:`目前${P.slope}°，落在工廠標準1.3–1.5°範圍內(滑桿本身無法超出)` },
    { id:'stanley-params', label:"Stanley's 4 manufacturing parameters (R角/進出角/抽真空角度/S曲線上下限)",
      status:'pending', source:'待補研究',
      detail:'2026-08-19已確認Lyric出差未拿到，Stanley 2026-08-26參展後預計補回' },
    { id:'solid-surface-supplier-limits', label:'Solid-surface supplier forming limits',
      status:'pending', source:'待補研究',
      detail:'2026-08-21 Masa會議交辦詢問供應商，用來收斂入口一參數滑桿上下限' },
  ];
}

// ===================== 曲面放樣建模 =====================
let tubGroup = null;
const N_SEG = 96, M_RING = 24;

function innerDims(){
  const e = isFactory() ? P.lip : P.t;   // factory 模式：內缸口＝外缸口 − 2×邊寬
  if(P.customPtsInner){                  // 獨立內輪廓：尺寸＝其 bbox（邊寬可不均勻）
    let mnx=1e9, mxx=-1e9, mny=1e9, mxy=-1e9;
    P.customPtsInner.forEach(p=>{
      const x=p[0]*P.L, y=p[1]*P.W;
      if(x<mnx)mnx=x; if(x>mxx)mxx=x; if(y<mny)mny=y; if(y>mxy)mxy=y;
    });
    return { L:mxx-mnx, W:mxy-mny, D:P.H-P.b, r:Math.max(P.r-e,10) };
  }
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
      const zTop=rimH(x, L, H, dH) + rimModI(i);
      const zB = z0f ? z0f(x*kbx, y*kby) : z0;
      // Phase 4 P4-M1(併入lib-edit3d-wallmount.js)：貼牆面外殼不外鼓，垂直直落(k→1)，視為隱藏在牆內、不做裙擺/側壁造型
      let kxi=kx, kyi=ky;
      if(!inner){
        const w = wallIdxWeight(i);
        if(w > 0){ kxi = kx + (1-kx)*w; kyi = ky + (1-ky)*w; }
      }
      pos.push(x*kxi, zB+v*(zTop-zB), y*kyi);
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
      // Phase 4 P4-M1(併入lib-edit3d-wallmount.js)：貼牆邊不做圓角/斜角裝飾緣邊，bump依wallIdxWeight淡出至0
      const bumpV = bump(u) * (1 - wallIdxWeight(i));
      pos.push(x, rimH(x, LA+(LB-LA)*u, H, dH) + rimModI(i) + bumpV, y);
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

// Flat封蓋（底板 / 缸內底面）。z0f(選用)：跟loftGeometry()同一個約定，逐點高度函式，
// 佇列項11(2026-08-22)新增此參數供outerBaseZ()使用，未傳時維持原本單一z值的行為不變
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

// 佇列項11(2026-08-22)：獨立缸底曲線編輯v1——缸底整體傾斜(單一斜率參數)，對應規格書
// 「非平整底、斜面底」的具體例子。刻意不做「任意自訂缸底輪廓」(v2 backlog，08裁定)：
// 只沿長軸(X)方向線性傾斜，+X端墊高、−X端下沉，跟rimH()/drainXY()等既有函式一樣用
// mm為單位的世界座標(x已經是loftGeometry()傳入的實際mm座標，不是normalized值)。
// P.baseSlope=0時回傳恆為0，等同沒有這個函式存在，跟現行行為零改變(Medium/basic皆同)。
function outerBaseZ(x){
  if(!P.baseSlope) return 0;
  const raw = Math.tan(P.baseSlope * Math.PI / 180) * x;
  // 安全clamp(2026-08-22實測發現後補上)：minWallGap()只檢查水平壁厚(factory模式的xy間距)，
  // 非factory模式甚至固定回傳99跳過檢查——兩者都不會偵測到「斜面把下沉端的缸底厚度吃掉」
  // 這個垂直方向的風險，需要獨立防護。這裡直接在幾何層面clamp，不管使用者怎麼組合L/斜率，
  // 下沉端最多吃掉70%的P.b(缸底厚度)，保證結構上一定還有材料，不是只警告不擋。
  const cap = P.b * 0.7;
  return Math.max(-cap, Math.min(cap, raw));
}

// 排水位置（工廠常規三式）：中間集中 / 兩頭（長軸 X 正負端）/ 短邊（寬軸 Y 端）
// Phase 7(2026-08-21)：去水口安全活動範圍——跟原本5個離散選項用同一組邊界margin(130mm長軸/
// 110mm短軸，離內壁的安全淨距)，供drainXY()的custom分支跟拖曳互動共用同一個「合法範圍」定義，
// 不要各自維護一份容易對不上。用橢圓邊界(而非矩形夾範圍)，對大多數浴缸內緣輪廓(橢圓/圓角矩形)
// 都是合理近似，v1不做逐形狀精確碰撞。
function drainReach(){
  const inn=innerDims(), fac=isFactory(), s=baseK();
  return {
    reach:  Math.max(0, (fac ? P.ibL/2 : inn.L/2*s) - 130),
    reachW: Math.max(0, (fac ? P.ibW/2 : inn.W/2*s) - 110),
  };
}
function clampDrainPos(x, y){
  const {reach, reachW} = drainReach();
  if(reach<=0 || reachW<=0) return {x:0, y:0};
  const nx = x/reach, ny = y/reachW, r = Math.hypot(nx, ny);
  return r<=1 ? {x, y} : {x: x/r, y: y/r};
}
function drainXY(){
  if(P.drainPos) return clampDrainPos(P.drainPos[0], P.drainPos[1]);
  const {reach, reachW} = drainReach();
  if(P.drain==='back')  return {x:-reach, y:0};
  if(P.drain==='front') return {x: reach, y:0};
  if(P.drain==='side')  return {x:0, y:reachW};
  if(P.drain==='side2') return {x:0, y:-reachW};
  return {x:0, y:0};
}

// ===================== 溢水孔連續座標(Phase 7) =====================
// t=內壁周長索引(0~N_SEG-1整數，跟rimMod/rimModI同一套索引慣例)；depth=距該點局部缸緣高度mm
function ovfReachDepth(px, inn){
  const rh = rimH(px, inn.L, P.H, P.dH);
  return { min: 20, max: Math.max(20, rh - (P.b + 40)) };
}
function clampOvfPos(t, depth){
  const inn = innerDims();
  const pts = innerOutlinePts(inn, N_SEG);
  const N = pts.length;
  const ti = ((Math.round(t) % N) + N) % N;
  const rd = ovfReachDepth(pts[ti][0], inn);
  return { t: ti, depth: Math.max(rd.min, Math.min(rd.max, depth)) };
}
// 依水平世界座標(hx,hz)找內壁周長上最近的索引(按角度，96點約3.75°解析度已足夠拖曳平滑)
function ovfClosestIndex(hx, hz, inn){
  const pts = innerOutlinePts(inn, N_SEG);
  const ang = Math.atan2(hz, hx);
  let best = 0, bestDiff = Infinity;
  for(let i=0;i<pts.length;i++){
    const a = Math.atan2(pts[i][1], pts[i][0]);
    let diff = Math.abs(a - ang); if(diff > Math.PI) diff = 2*Math.PI - diff;
    if(diff < bestDiff){ bestDiff = diff; best = i; }
  }
  return best;
}
// 溢水口目前的(索引,深度,未縮放內壁座標)：有自訂座標(P.ovfPos)用自訂，否則退回舊版後端置中(index=N_SEG/2)+P.ovfDrop
function ovfCurrent(){
  const inn = innerDims();
  const N = N_SEG;
  const t = P.ovfPos ? P.ovfPos[0] : Math.round(N/2);
  const depth = P.ovfPos ? P.ovfPos[1] : P.ovfDrop;
  const pts = innerOutlinePts(inn, N);
  const ti = ((Math.round(t) % N) + N) % N;
  return { index: ti, depth, x: pts[ti][0], y: pts[ti][1], inn };
}
// 溢水口3D世界座標(Three.js座標系：x,z水平面，y高度)，供buildTub()與拖曳互動共用
function ovfWorldXYZ(){
  const c = ovfCurrent();
  const rh = rimH(c.x, c.inn.L, P.H, P.dH);
  const hRef = Math.max(1, P.H + P.dH/2);
  const height = Math.max(P.b + 40, rh - c.depth);
  const vo = Math.max(0, Math.min(1, (height - P.b) / Math.max(1, hRef - P.b)));
  const [kx, ky] = shellKxy(vo, true);
  const sx = c.x*kx, sy = c.y*ky;
  const rlen = Math.hypot(sx, sy) || 1;
  return { x: sx - (sx/rlen)*8, y: height, z: sy - (sy/rlen)*8, index: c.index };
}

// ===================== 龍頭孔連續座標(Phase 7) =====================
// t=周長索引(0~N_SEG-1，同rimMod/去水口/溢水孔慣例)；u=缸緣寬度方向位置(0=外緣、1=內緣，跟stripGeometry()的u同義)
function clampFaucetPos(t, u){
  const N = N_SEG;
  const ti = ((Math.round(t) % N) + N) % N;
  // 0.1~0.9：先卡位避免太靠外/內緣，離邊最小距離的真實數值待Phase7規格書§3(浴缸設計基本原則約束層)填入
  return { t: ti, u: Math.max(0.1, Math.min(0.9, u)) };
}
function faucetClosestIndex(hx, hz, pts){
  const ang = Math.atan2(hz, hx);
  let best = 0, bestDiff = Infinity;
  for(let i=0;i<pts.length;i++){
    const a = Math.atan2(pts[i][1], pts[i][0]);
    let diff = Math.abs(a - ang); if(diff > Math.PI) diff = 2*Math.PI - diff;
    if(diff < bestDiff){ bestDiff = diff; best = i; }
  }
  return best;
}
// 龍頭孔目前的(索引,缸緣寬度位置,平面座標)：無自訂座標時給一個示意預設(後端側邊、緣寬置中)
function faucetCurrent(){
  const inn = innerDims();
  const outerPts = outlinePts(P.shape, P.L, P.W, P.r, P.egg, N_SEG);
  const innerPts = innerOutlinePts(inn, N_SEG);
  const N = N_SEG;
  const t = P.faucetPos ? P.faucetPos[0] : Math.round(N * 0.75);
  const u = P.faucetPos ? P.faucetPos[1] : 0.5;
  const ti = ((Math.round(t) % N) + N) % N;
  const [xa, ya] = outerPts[ti], [xb, yb] = innerPts[ti];
  return { index: ti, u, x: xa + (xb - xa) * u, y: ya + (yb - ya) * u, LA: P.L, LB: inn.L };
}
// 龍頭孔3D世界座標(Three.js座標系：x,z水平面，y高度)，套用跟stripGeometry()同一套高度公式，確保標記真的貼在缸緣面上
function faucetWorldXYZ(){
  const c = faucetCurrent();
  const h = rimH(c.x, c.LA + (c.LB - c.LA) * c.u, P.H, P.dH) + rimModI(c.index);
  return { x: c.x, y: h + 6, z: c.y, index: c.index };   // +6mm墊高避免跟缸緣面z-fighting
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
  const innerPts = innerOutlinePts(inn, N_SEG);
  const [obx, oby] = shellKxy(0, false), [ibx, iby] = shellKxy(0, true);
  const mat = new THREE.MeshStandardMaterial({ color:P.color, roughness:P.material==='solid'?0.6:0.22, metalness:0.05, side:THREE.DoubleSide });

  tubGroup.add(new THREE.Mesh(loftGeometry(outerPts, P.L, 0,   P.H, P.dH, (x,y)=>outerBaseZ(x)), mat)); // 外殼(佇列項11：缸底斜面z0f)
  const innerWallMesh = new THREE.Mesh(loftGeometry(innerPts, inn.L, P.b, P.H, P.dH, floorZ, true), mat); // 內壁（底=洩水斜底，不套裙擺）
  innerWallMesh.name = 'innerWallMesh';  // Phase 7：溢水孔拖曳時對實際內壁面做光線投射
  tubGroup.add(innerWallMesh);
  const rimStripMesh = new THREE.Mesh(stripGeometry(outerPts, P.L, innerPts, inn.L, P.H, P.dH), mat); // 缸緣
  rimStripMesh.name = 'rimStripMesh';  // Phase 7：龍頭孔拖曳時對實際缸緣面做光線投射
  tubGroup.add(rimStripMesh);
  tubGroup.add(new THREE.Mesh(capGeometry(outerPts, obx, oby, 0, (x,y)=>outerBaseZ(x)), mat));   // 底封板(跟外殼base ring用同一個z0f，接縫吻合)
  tubGroup.add(new THREE.Mesh(slopedCapGeometry(innerPts, ibx, iby, P.b), mat)); // 缸內底面（向排水孔傾斜 P.slope°）

  // 排水孔（位於斜底最低點）
  const d = drainXY();
  const drain = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 26, 8, 32),
    new THREE.MeshStandardMaterial({color:0x666e75, metalness:0.8, roughness:0.3})
  );
  drain.position.set(d.x, P.b+4, d.y);
  drain.name = 'drainHandle';  // Phase 7：拖曳互動用名稱查找，tubGroup每次buildTub()都重建
  tubGroup.add(drain);

  // 溢水口（工廠標準件，細部不建模）：Phase 7起支援周向+深度自訂座標，見ovfWorldXYZ()
  if(P.ovf){
    const ov = ovfWorldXYZ();
    const om = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 26, 6, 24),
      new THREE.MeshStandardMaterial({color:0x666e75, metalness:0.8, roughness:0.3})
    );
    const nrm = new THREE.Vector3(ov.x, 0, ov.z);
    if(nrm.lengthSq() < 1e-6) nrm.set(-1, 0, 0);
    om.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), nrm.normalize());
    om.position.set(ov.x, ov.y, ov.z);
    om.name = 'ovfHandle';  // Phase 7：拖曳互動用名稱查找
    tubGroup.add(om);
  }

  // 龍頭孔（配件v1，細部不建模）：貼在缸緣面上，見faucetWorldXYZ()
  if(P.faucet){
    const fv = faucetWorldXYZ();
    const fm = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, 10, 20),
      new THREE.MeshStandardMaterial({color:0x666e75, metalness:0.8, roughness:0.3})
    );
    fm.position.set(fv.x, fv.y, fv.z);
    fm.name = 'faucetHandle';  // Phase 7：拖曳互動用名稱查找
    tubGroup.add(fm);
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
    water.name = 'waterSim';  // Phase 8：AR/glb匯出時要濾掉的編輯器預覽用網格，不是真實產品的一部分
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
  const Ai = shoelace(innerOutlinePts(inn, N_SEG));
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
  const crated = weight + 10 + (P.L/1000)*(P.W/1000)*12;   // 木箱依底板面積估算
  return { inn, fullVol, useVol, weight, crated };
}

function updateSpec(){
  const s = computeSpec();
  const rows = [
    [t('Material'), t(P.material==='solid' ? 'Solid surface' : 'Premium acrylic')],
    [t('Rim shape'), P.shape==='custom' ? t('✏️ Custom sketch') : t({rect:'Rounded Rect',stadium:'Rounded Ends',ellipse:'Oval'}[P.shape])],
    [t('Overall size (L×W)'), `${P.L} × ${P.W} mm`],
    [t('Rim height front / rear'), `${P.H} / ${P.H+P.dH} mm`],
    [t('Rim profile'), t({flat:'Flat', round:'Rounded', bevel:'Beveled'}[P.rim])],
    [t('Interior size (L×W)'), `${s.inn.L} × ${s.inn.W} mm`],
    [t('Interior depth (front)'), `${s.inn.D} mm`],
    ...(isFactory() ? [
      [t('Rim edge width'), `${P.lip} mm`],
      [t('Outer base (L×W)'), `${P.obL} × ${P.obW} mm`],
      [t('Inner base (L×W)'), `${P.ibL} × ${P.ibW} mm`],
    ] : [
      [t('Base footprint (tapered)'), `${Math.round(P.L*baseK())} × ${Math.round(P.W*baseK())} mm${P.customProfile ? t(' (custom profile)') : ''}`],
    ]),
    [t('Full capacity (est.)'), `${s.fullVol.toFixed(0)} L`],
    [t('Recommended fill (80%)'), `${s.useVol.toFixed(0)} L`],
    [t('Product weight (est.)'), `~${s.weight.toFixed(0)} kg`],
    [t('Crated shipping weight (est.)'), `~${s.crated.toFixed(0)} kg`],
    [t('Side wall profile'), (function(){
      if(P.customProfile){
        const fit=fitProfileArcs();
        return (fit && fit.ok) ? `≈ ${fit.label}` : t('Freeform (no clean arc fit)');
      }
      if(isFactory()) return `IN R${P.riL}/R${P.riW} · OUT R${P.roL}/R${P.roW}`;
      if(P.wallMode==='arc') return `R${P.wallR}`;
      if(P.wallMode==='s')   return `R${P.wallR} + R${P.wallR2}`;
      return t('Default curve');
    })()],
    ...(isFactory() ? [[t('Overflow'), P.ovf ? t('Yes (factory std)') : t('None')]] : []),
    [t('Pedestal skirt'), P.skirt ? `R${Math.round(skirtReff())} · ${P.skirtH}mm` : t('None')],
    [t('Drain position'), t({center:'Center', back:'End · rear', front:'End · front', side:'Short edge', side2:'Short edge · opposite'}[P.drain])],
    [t('Floor drain slope'), `${P.slope}°`],
    [t('Undercut'), P.undercut ? t('Yes (split mould)') : t('None (vertical demould)')],
  ];
  document.getElementById('spec').innerHTML = rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  // 會議規範警示：內長 <950 只能坐姿／蹲姿；壓克力＋倒扣＝左右合模高成本
  const lw = document.getElementById('lenWarn');
  if(lw){ lw.style.display = (s.inn.L < 950) ? 'block' : 'none'; lw.textContent = t('⚠ Interior length under 950mm — only suitable for seated / crouched bathing (leg-to-hip ≈ 900mm).'); }
  const uw = document.getElementById('undercutWarn');
  if(uw){ uw.style.display = (P.undercut && P.material==='acrylic') ? 'block' : 'none'; uw.textContent = t('⚠ Undercut on acrylic needs a split mould and hand-finished seams — high cost. Consider solid surface, or continue as premium bespoke.'); }
  const tw = document.getElementById('thinWarn');
  if(tw){ tw.style.display = (minWallGap() < 5) ? 'block' : 'none'; tw.textContent = t('⚠ Wall thickness below 5mm between inner and outer shells — adjust base sizes or arc R.'); }
  updatePrice();
}

