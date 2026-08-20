// ===================== lib-edit3d-sketch.js =====================
// Phase 5合併(2026-08-20，claude-code-77裁定「sketch以Edit3D版為基底」)：逐字抽自
// photo2tub-app.html 2694-2978行，比lib-tub-sketch.js多出floodAndLabel()/otsuThreshold()
// (抽成獨立函式供傳統Otsu版跟新增的邊框亮度版共用)、traceImage()新增的低對比補救邏輯
// (白缸配白底棚拍/透視矯正合成背景時的描邊修正)——diff核對過lib-tub-sketch.js沒有任何
// Edit3D版缺少的獨有函式，是乾淨的superset，可以整段換底不遺漏功能。
// ⚠️已排除的重複段：原始2979-3003行是updateRowVis()+色票/water/undercut/skirt/ovf
// 監聽器，這些跟lib-edit3d-ui.js(改自lib-tub-ui.js)裡的版本是同一段程式碼在單檔架構裡
// 物理上放錯地方(非UI綁定section卻定義UI綁定)，只留ui.js那份，這裡不重複註冊監聽器。
// ⚠️同理useDefaultProfile/uploadedContour這兩個狀態變數的宣告也排除了——lib-tub-ui.js
// (lib-edit3d-ui.js的底稿)本來就已經宣告過這兩個(pro.html既有架構的慣例：共用狀態宣告在
// ui.js，sketch.js只使用不重複宣告)，兩邊都宣告會在瀏覽器丟SyntaxError(不同<script>間的
// let重複宣告共用同一個全域lexical scope，會直接擋下整個檔案不執行)——這是瀏覽器實測時
// 抓到的真實bug，不是假設性的，修正方式是這裡不重複宣告，改用ui.js已宣告的那份。
// ===================== 手繪模式 =====================

function makePad(id, drawGuides){
  const cv = document.getElementById(id), ctx = cv.getContext('2d');
  const state = { pts: [], drawing: false };
  function redraw(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawGuides(ctx, cv);
    if(state.pts.length > 1){
      ctx.strokeStyle = '#1a2b3c'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      state.pts.forEach((p, i)=> i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
      ctx.stroke();
    }
  }
  function pos(e){
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  cv.addEventListener('pointerdown', e=>{ state.drawing = true; state.pts.push(pos(e)); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e=>{ if(state.drawing){ state.pts.push(pos(e)); redraw(); } });
  cv.addEventListener('pointerup', ()=> state.drawing = false);
  state.redraw = redraw;
  redraw();
  return state;
}

const padTop = makePad('padTop', (ctx, cv)=>{
  ctx.strokeStyle = '#dde3ea'; ctx.setLineDash([5,5]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cv.width/2, 10); ctx.lineTo(cv.width/2, cv.height-10);
  ctx.moveTo(10, cv.height/2); ctx.lineTo(cv.width-10, cv.height/2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#bbb'; ctx.font = '11px sans-serif';
  ctx.fillText(t('Draw a closed rim outline'), 12, 18);
});
const padSide = makePad('padSide', (ctx, cv)=>{
  ctx.strokeStyle = '#e67e22'; ctx.setLineDash([6,4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(28, 10); ctx.lineTo(28, cv.height-10); ctx.stroke();  // Centerline
  ctx.setLineDash([]);
  ctx.strokeStyle = '#dde3ea';
  ctx.beginPath(); ctx.moveTo(10, cv.height-30); ctx.lineTo(cv.width-10, cv.height-30);  // 地面
  ctx.moveTo(10, 30); ctx.lineTo(cv.width-10, 30); ctx.stroke();                          // 缸緣
  ctx.fillStyle = '#bbb'; ctx.font = '11px sans-serif';
  ctx.fillText(t('Centerline'), 6, cv.height/2 - 40);
  ctx.fillText(t('Rim (top)'), cv.width-80, 24);
  ctx.fillText(t('Base (bottom)'), cv.width-80, cv.height-16);
});

function clearPad(which){
  if(which === 'top'){ padTop.pts = []; uploadedContour = null; padTop.redraw(); }
  else { padSide.pts = []; padSide.redraw(); }
}
function skErr(msg){
  const el = document.getElementById('skErr');
  el.textContent = msg; el.style.display = msg ? 'block' : 'none';
}
function openSketch(){ skErr(''); document.getElementById('sketchModal').classList.add('open'); }
function closeSketch(){ document.getElementById('sketchModal').classList.remove('open'); }

// ---------- 幾何處理 ----------
function rdp(pts, eps){
  if(pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  const [x1,y1] = pts[0], [x2,y2] = pts[pts.length-1];
  const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy) || 1;
  for(let i=1;i<pts.length-1;i++){
    const d = Math.abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1) / len;
    if(d > maxD){ maxD = d; idx = i; }
  }
  if(maxD <= eps) return [pts[0], pts[pts.length-1]];
  return rdp(pts.slice(0, idx+1), eps).slice(0,-1).concat(rdp(pts.slice(idx), eps));
}
function chaikinClosed(pts){
  const out = [];
  for(let i=0;i<pts.length;i++){
    const a = pts[i], b = pts[(i+1)%pts.length];
    out.push([a[0]*0.75+b[0]*0.25, a[1]*0.75+b[1]*0.25]);
    out.push([a[0]*0.25+b[0]*0.75, a[1]*0.25+b[1]*0.75]);
  }
  return out;
}
function processTopSketch(raw){
  if(raw.length < 12) return null;
  let pts = rdp(raw, 2.5);
  if(pts.length < 4) return null;
  pts = chaikinClosed(chaikinClosed(pts));
  pts = resample(pts, N_SEG);
  // normalize：bbox 置中並縮放至 ±0.5
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  pts.forEach(p=>{ minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); });
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2, sx=(maxX-minX)||1, sy=(maxY-minY)||1;
  pts = pts.map(p=>[(p[0]-cx)/sx, -(p[1]-cy)/sy]);   // 翻轉 y（畫布 y 向下）
  if(shoelaceSigned(pts) < 0) pts.reverse();          // 統一逆時針
  return pts;
}
function shoelaceSigned(pts){
  let a=0;
  for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; a += p[0]*q[1]-q[0]*p[1]; }
  return a/2;
}
function processSideSketch(raw){
  if(raw.length < 10) return null;
  const AXIS_X = 28;  // 畫布Centerline位置
  let pts = raw.slice();
  if(pts[0][1] < pts[pts.length-1][1]) pts.reverse();  // 由下往上
  const yBot = pts[0][1], yTop = pts[pts.length-1][1];
  if(yBot - yTop < 40) return null;                     // 高度太小
  // 只保留 v 遞增的點（去除回鉤）
  const samples = [];
  let lastV = -1;
  pts.forEach(p=>{
    const v = (yBot - p[1]) / (yBot - yTop);
    if(v > lastV){ samples.push([v, Math.max(4, p[0] - AXIS_X)]); lastV = v; }
  });
  if(samples.length < 5) return null;
  // 以頂端寬度正規化 → k(1)=1，重取樣 25 級
  const kTop = samples[samples.length-1][1];
  const prof = [];
  for(let m=0;m<=24;m++){
    const v = m/24;
    let j=0;
    while(j < samples.length-1 && samples[j+1][0] < v) j++;
    const a = samples[j], b = samples[Math.min(j+1, samples.length-1)];
    const f = (b[0]-a[0]) > 1e-6 ? (v-a[0])/(b[0]-a[0]) : 0;
    prof.push(Math.max(0.08, Math.min(1.4, (a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,f))) / kTop)));
  }
  prof[24] = 1;
  return prof;
}

// ---------- 照片輪廓辨識 ----------
document.getElementById('uplTop').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const img = new Image();
  img.onload = ()=>{
    try {
      const contour = traceImage(img);
      if(!contour){ skErr(t('⚠ No closed shape detected. Use a dark pen on white paper, with even lighting and clear contrast.')); return; }
      skErr('');
      // 縮放到畫布並顯示
      const cv = document.getElementById('padTop');
      let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
      contour.forEach(p=>{ minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); });
      const sc = Math.min((cv.width-40)/(maxX-minX), (cv.height-40)/(maxY-minY));
      padTop.pts = contour.map(p=>[(p[0]-minX)*sc+20, (p[1]-minY)*sc+20]);
      uploadedContour = padTop.pts;
      padTop.redraw();
    } catch(err){ skErr(t('⚠ Image processing failed: ') + err.message); }
  };
  img.src = URL.createObjectURL(file);
  e.target.value = '';
});

// 給定「ink」二值遮罩 → 邊界 flood 背景 → 最大連通塊。回傳 {label,best,bestSize}，抽出供 Otsu 版/邊框亮度版共用。
function floodAndLabel(ink, w, h){
  const visited = new Uint8Array(w*h), queue = [];
  for(let x=0;x<w;x++){ queue.push(x, (h-1)*w+x); }
  for(let y=0;y<h;y++){ queue.push(y*w, y*w+w-1); }
  queue.forEach(i=>{ if(!ink[i]) visited[i] = 1; });
  let qi = 0;
  const q2 = queue.filter(i=>visited[i]);
  while(qi < q2.length){
    const i = q2[qi++], x = i%w, y = (i/w)|0;
    [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([nx,ny])=>{
      if(nx>=0 && nx<w && ny>=0 && ny<h){
        const ni = ny*w+nx;
        if(!visited[ni] && !ink[ni]){ visited[ni] = 1; q2.push(ni); }
      }
    });
  }
  const solid = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) solid[i] = (ink[i] || !visited[i]) ? 1 : 0;
  const label = new Int32Array(w*h).fill(-1);
  let best = -1, bestSize = 0, nl = 0;
  for(let i0=0;i0<w*h;i0++){
    if(solid[i0] && label[i0] < 0){
      const bfs = [i0]; label[i0] = nl;
      let bi = 0;
      while(bi < bfs.length){
        const i = bfs[bi++], x = i%w, y = (i/w)|0;
        [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([nx,ny])=>{
          if(nx>=0 && nx<w && ny>=0 && ny<h){
            const ni = ny*w+nx;
            if(solid[ni] && label[ni] < 0){ label[ni] = nl; bfs.push(ni); }
          }
        });
      }
      if(bfs.length > bestSize){ bestSize = bfs.length; best = nl; }
      nl++;
    }
  }
  return {label, best, bestSize};
}
// Otsu 閾值（給定任意灰階/梯度直方圖）
function otsuThreshold(hist, total){
  let sum=0; for(let i=0;i<256;i++) sum += i*hist[i];
  let sumB=0, wB=0, maxVar=0, thresh=128;
  for(let i=0;i<256;i++){
    wB += hist[i]; if(!wB) continue;
    const wF = total - wB; if(!wF) break;
    sumB += i*hist[i];
    const mB = sumB/wB, mF = (sum-sumB)/wF, v = wB*wF*(mB-mF)*(mB-mF);
    if(v > maxVar){ maxVar = v; thresh = i; }
  }
  return thresh;
}
function traceImage(img){
  const MAXW = 400;
  const sc = Math.min(1, MAXW / img.width);
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
  const ctx = oc.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  // 灰階 + Otsu 閾值
  const gray = new Uint8Array(w*h), hist = new Array(256).fill(0);
  for(let i=0;i<w*h;i++){
    const g = Math.round(0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2]);
    gray[i] = g; hist[g]++;
  }
  const total = w*h;
  const thresh = otsuThreshold(hist, total);
  const ink = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) ink[i] = gray[i] < thresh ? 1 : 0;
  let {label, best, bestSize} = floodAndLabel(ink, w, h);
  // 低對比補救：主體與背景亮度太接近時（如白缸配白底棚拍／透視矯正warp後的合成白背景），
  // 全域 Otsu 會把主體本身較亮的部位（缸緣高光）跟背景歸在同一類，即使沒有把整個主體
  // 都吃掉，也常在亮部位置留下缺口，使描邊輪廓出現局部凹陷（凸包比檢查會擋下這種結果）。
  // 修法：改用「邊框亮度」當背景基準——邊框本身理論上就是純背景（原圖四角本來就沒有
  // 主體，或是 perspWarp() 合成填色的區域），只有背景明顯偏亮（>150）時才啟用；
  // 暗背景（含手繪草圖常見的白紙已被上面 Otsu 正確處理，或本就非本情境）維持原本Otsu
  // 邏輯不變，不影響既有行為。
  const borderBrightness = (()=>{
    let sum=0, n=0;
    for(let x=0;x<w;x++){ sum+=gray[x]; sum+=gray[(h-1)*w+x]; n+=2; }
    for(let y=0;y<h;y++){ sum+=gray[y*w]; sum+=gray[y*w+w-1]; n+=2; }
    return sum/n;
  })();
  if(borderBrightness > 150){
    const BORDER_MARGIN = 15;
    const inkB = new Uint8Array(w*h);
    for(let i=0;i<w*h;i++) inkB[i] = gray[i] < (borderBrightness - BORDER_MARGIN) ? 1 : 0;
    const br = floodAndLabel(inkB, w, h);
    if(br.bestSize > bestSize){ label = br.label; best = br.best; bestSize = br.bestSize; }
  }
  if(bestSize < total*0.005) return null;   // 形狀太小
  const mask = i => label[i] === best;
  // Moore 邊界追蹤
  let start = -1;
  for(let i=0;i<w*h;i++) if(mask(i)){ start = i; break; }
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  const contour = [];
  let cx = start%w, cy = (start/w)|0, dir = 6;
  for(let step=0; step < w*h; step++){
    contour.push([cx, cy]);
    let found = false;
    for(let k=0;k<8;k++){
      const d = (dir + 6 + k) % 8;
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
      if(nx>=0 && nx<w && ny>=0 && ny<h && mask(ny*w+nx)){
        cx = nx; cy = ny; dir = d; found = true; break;
      }
    }
    if(!found) break;
    if(cx === start%w && cy === ((start/w)|0) && contour.length > 10) break;
  }
  return contour.length > 30 ? contour : null;
}

// ---------- 確認 ----------
function confirmSketch(){
  const raw = uploadedContour || padTop.pts;
  const norm = processTopSketch(raw);
  if(!norm){ skErr(t('⚠ Please draw (or upload) a closed rim outline first — the line needs to be long enough.')); return; }
  P.customPts = norm; P.customPtsInner = null;
  P.customProfile = processSideSketch(padSide.pts);   // 沒畫 → null → 用參數剖面
  P.shape = 'custom';
  document.querySelectorAll('.shape-btns button').forEach(b=>b.classList.toggle('active', b.dataset.shape==='custom'));
  updateRowVis();
  closeSketch();
  buildTub();
}
