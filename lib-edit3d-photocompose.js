// ===================== lib-edit3d-photocompose.js =====================
// Phase 8 M8-2a(2026-08-21)：照片合成 Tier A(貼紙式)——把目前設計的缸渲染成去背PNG貼紙，
// 疊在使用者上傳的現場照片上，拖曳/縮放/旋轉手動對齊後輸出合成圖。
// 與T5「Site photo notes」是兩個不同功能(T5=標註空間位置附在詢價信；本功能=合成展示圖)，
// 入口分開(並存原則)。純前端：照片不離開瀏覽器，連Modal API都不經過。
// 尺寸免責：合成圖的缸大小由使用者目測，不承諾真實比例——真實尺寸請用AR(M8-1b)，
// modal內放「改用AR查看」動線把兩個模式的互補性接起來。
//
// 為什麼要自建離屏渲染器：主編輯器的renderer(lib-tub-scene.js，三版本共用檔)建立時沒開
// alpha通道，且live scene有不透明背景+地板+grid，直接截圖拿不到透明背景。不動共用檔，
// 這裡惰性建一個獨立的WebGLRenderer(alpha:true)+臨時scene(clone tubGroup濾waterSim，
// 沿用M8-1a buildExportGroup的過濾思路但不做0.001單位縮放——這是渲染不是AR匯出)。

const PC_RENDER_SIZE = 1600;   // 離屏渲染尺寸(正方形，缸橫豎旋轉都不裁邊；夠大確保貼紙放大不明顯鋸齒)
const PC_DISPLAY_MAX = 1100;   // 顯示canvas上限(跟photoModal同慣例)；輸出用照片原始解析度另行重繪

const _pc = {
  photo: null,        // 原始Image(輸出時用naturalWidth/Height重繪，不能只留縮小版)
  sticker: null,      // 去背裁切後的貼紙(canvas)
  x: 0, y: 0,         // 貼紙中心在顯示canvas座標系的位置
  scale: 1,           // 顯示寬 = scale * sticker.width
  rot: 0,             // 2D平面旋轉(弧度)
  mode: 'place',      // 'place'=擺放 | 'view'=調整3D視角(拖曳改離屏相機角度即時重渲染)
  shadow: true,       // 接地陰影開關(預設開；地毯/草地等場景固定橢圓影會突兀，可關)
  renderer: null, cam: null, scene: null, orbit: null,
  pointers: new Map(),   // pointerId -> [x,y]，雙指pinch用
  pinch: null,           // 雙指手勢基準快照
  rafPending: false,
};

function pcInitRenderer(){
  if(_pc.renderer) return;
  _pc.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  _pc.renderer.setPixelRatio(1);   // 離屏固定1:1，尺寸已經給足，不需要跟著裝置DPR翻倍
  _pc.renderer.setSize(PC_RENDER_SIZE, PC_RENDER_SIZE);
  _pc.cam = new THREE.PerspectiveCamera(42, 1, 10, 30000);   // 跟主編輯器同FOV，貼紙透視感一致
}

// 接地陰影：半透明放射漸層橢圓貼在缸底平面，尺寸跟著缸的bbox走。
// 固定柔影、不分析照片光源——這是「貼紙品質」不是Tier B的光影匹配(監督裁定2026-08-21)。
function pcGroundShadow(g){
  const box = new THREE.Box3().setFromObject(g);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 24, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.38)');
  grad.addColorStop(0.65, 'rgba(0,0,0,0.16)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry((box.max.x - box.min.x) * 1.3, (box.max.z - box.min.z) * 1.3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((box.min.x + box.max.x) / 2, box.min.y + 2, (box.min.z + box.max.z) / 2);
  mesh.name = 'pcShadow';
  return mesh;
}

// 每次開modal重建臨時scene(設計可能改過)：clone共用幾何/材質參照(純讀取安全)，
// 燈光參數照抄lib-tub-scene.js(不共用live scene的燈光物件——add()會把它們從live scene搶走)
function pcBuildScene(){
  const sc = new THREE.Scene();   // 不設background => 透明
  sc.add(new THREE.HemisphereLight(0xffffff, 0xb0b8c0, 0.9));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.75); d1.position.set(1500, 2500, 1200); sc.add(d1);
  const d2 = new THREE.DirectionalLight(0xfff2e0, 0.3); d2.position.set(-1800, 1200, -1000); sc.add(d2);
  const g = tubGroup.clone(true);
  const water = g.getObjectByName('waterSim');
  if(water) water.parent.remove(water);
  if(_pc.shadow) g.add(pcGroundShadow(g));
  sc.add(g);
  _pc.scene = sc;
}

// alpha掃描求最小外接框裁掉透明邊——讓貼紙的中心點/縮放基準貼合缸體本身，拖曳不會「隔空」。
// stride=2抽樣掃描(邊界誤差±1px肉眼不可辨，掃描量省3/4)
function pcCropAlpha(srcCanvas){
  const w = srcCanvas.width, h = srcCanvas.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });   // 每次渲染都會getImageData掃描一次
  ctx.drawImage(srcCanvas, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for(let y = 0; y < h; y += 2){
    for(let x = 0; x < w; x += 2){
      if(data[(y * w + x) * 4 + 3] > 8){
        if(x < minX) minX = x; if(x > maxX) maxX = x;
        if(y < minY) minY = y; if(y > maxY) maxY = y;
      }
    }
  }
  if(maxX < 0) return cv;   // 空渲染(理論上不會發生)：整張原樣返回，別除以零
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(cv, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// 渲染貼紙。keepDisplaySize=true時保持「畫面上顯示的寬度」不變(調整3D視角後裁切框尺寸會變，
// 若不補償scale，貼紙會在使用者眼前突然跳大跳小)
function pcRenderSticker(keepDisplaySize){
  pcInitRenderer();
  const o = _pc.orbit;
  o.phi = Math.max(0.05, Math.min(Math.PI - 0.05, o.phi));
  o.radius = Math.max(1200, Math.min(9000, o.radius));
  const s = Math.sin(o.phi), c = Math.cos(o.phi);
  _pc.cam.position.set(
    o.target.x + o.radius * s * Math.cos(o.theta),
    o.target.y + o.radius * c,
    o.target.z + o.radius * s * Math.sin(o.theta)
  );
  _pc.cam.lookAt(o.target);
  _pc.renderer.render(_pc.scene, _pc.cam);
  const oldW = _pc.sticker ? _pc.sticker.width : 0;
  _pc.sticker = pcCropAlpha(_pc.renderer.domElement);
  if(keepDisplaySize && oldW && _pc.sticker.width) _pc.scale = _pc.scale * oldW / _pc.sticker.width;
}

// ---------- 顯示canvas重繪(rAF節流) ----------
function pcRequestRedraw(){
  if(_pc.rafPending) return;
  _pc.rafPending = true;
  requestAnimationFrame(() => { _pc.rafPending = false; pcRedraw(); });
}
function pcRedraw(){
  const cv = document.getElementById('pcCanvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  if(!_pc.photo) return;
  ctx.drawImage(_pc.photo, 0, 0, cv.width, cv.height);
  if(!_pc.sticker) return;
  ctx.save();
  ctx.translate(_pc.x, _pc.y);
  ctx.rotate(_pc.rot);
  ctx.scale(_pc.scale, _pc.scale);
  ctx.drawImage(_pc.sticker, -_pc.sticker.width / 2, -_pc.sticker.height / 2);
  ctx.restore();
}

// ---------- 開關與初始化 ----------
function openPhotoCompose(){
  document.getElementById('composeModal').style.display = 'flex';
  _pc.orbit = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius, target: orbit.target.clone() };   // 編輯器看到什麼角度，貼紙初始就是什麼角度
  pcBuildScene();
  pcRenderSticker(false);
  if(_pc.photo && !_pc.placed){ pcPlaceInitial(); }
  pcSetMode('place');
  document.getElementById('pcShadowChk').checked = _pc.shadow;
  // Web Share API能力偵測：能分享檔案才顯示分享鈕(桌機瀏覽器多半不支援，下載是保底)
  let canShare = false;
  try {
    canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] }));
  } catch(e){ canShare = false; }
  document.getElementById('pcShareBtn').style.display = canShare ? '' : 'none';
  pcRequestRedraw();
}
function closePhotoCompose(){
  document.getElementById('composeModal').style.display = 'none';
  _pc.scene = null;   // 臨時scene用完即棄(幾何/材質是共用參照，本來就不歸它管)；renderer保留重用
}
function pcPlaceInitial(){
  const cv = document.getElementById('pcCanvas');
  _pc.x = cv.width / 2;
  _pc.y = cv.height * 0.62;   // 缸通常擺在照片下半部(地面)，初始位置偏低比正中自然
  _pc.scale = (cv.width * 0.45) / _pc.sticker.width;
  _pc.rot = 0;
  document.getElementById('pcRotSlider').value = 0;
  _pc.placed = true;
}

document.getElementById('pcPhotoFile').addEventListener('change', e => {
  const f = e.target.files[0]; if(!f) return;
  const img = new Image();
  img.onload = () => {
    const cv = document.getElementById('pcCanvas');
    const k = Math.min(1, PC_DISPLAY_MAX / img.width, PC_DISPLAY_MAX / img.height);
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    _pc.photo = img;
    _pc.placed = false;
    document.getElementById('pcStatus').textContent = '';
    if(_pc.sticker) pcPlaceInitial();
    pcRequestRedraw();
  };
  img.src = URL.createObjectURL(f);
});

// ---------- 模式切換：擺放 vs 調整3D視角 ----------
function pcSetMode(m){
  _pc.mode = m;
  document.getElementById('pcModePlace').classList.toggle('active', m === 'place');
  document.getElementById('pcModeView').classList.toggle('active', m === 'view');
  document.getElementById('pcTip').textContent = m === 'place'
    ? t('Drag to move · pinch or scroll to resize · slider to rotate')
    : t('Drag to orbit the tub · pinch or scroll to zoom');
}
function pcToggleShadow(chk){
  _pc.shadow = chk.checked;
  pcBuildScene();               // 陰影是scene裡的mesh，重建臨時scene(便宜，clone只是物件包裝)
  pcRenderSticker(true);
  pcRequestRedraw();
}
document.getElementById('pcRotSlider').addEventListener('input', e => {
  _pc.rot = e.target.value * Math.PI / 180;
  pcRequestRedraw();
});

// ---------- 指標互動：單指拖曳／雙指pinch(縮放+旋轉一個手勢)／滾輪 ----------
const pcCv = document.getElementById('pcCanvas');
function pcPos(e){
  const r = pcCv.getBoundingClientRect();
  return [(e.clientX - r.left) * pcCv.width / r.width, (e.clientY - r.top) * pcCv.height / r.height];
}
function pcPinchSnapshot(){
  const pts = [..._pc.pointers.values()];
  const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1];
  return {
    dist: Math.hypot(dx, dy) || 1,
    ang: Math.atan2(dy, dx),
    mid: [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2],
    scale: _pc.scale, rot: _pc.rot, x: _pc.x, y: _pc.y, radius: _pc.orbit ? _pc.orbit.radius : 0,
  };
}
pcCv.addEventListener('pointerdown', e => {
  if(!_pc.photo || !_pc.sticker) return;
  // 防禦性try/catch：setPointerCapture在極少數環境下對第二根手指可能拋NotFoundError
  // (瀏覽器內部指標追蹤的邊界情況)，沒接住的話會讓這根手指整個不進_pc.pointers，
  // 雙指pinch直接失效——即使capture失敗，仍然要繼續追蹤這根手指(只是手指滑出canvas
  // 範圍時可能失去追蹤，比完全不追蹤好)
  try { pcCv.setPointerCapture(e.pointerId); } catch(err){ /* 追蹤降級，非致命 */ }
  _pc.pointers.set(e.pointerId, pcPos(e));
  _pc.pinch = _pc.pointers.size === 2 ? pcPinchSnapshot() : null;
  e.preventDefault();
});
pcCv.addEventListener('pointermove', e => {
  if(!_pc.pointers.has(e.pointerId)) return;
  const prev = _pc.pointers.get(e.pointerId);
  const cur = pcPos(e);
  _pc.pointers.set(e.pointerId, cur);
  if(_pc.pointers.size === 1){
    const dx = cur[0] - prev[0], dy = cur[1] - prev[1];
    if(_pc.mode === 'place'){
      _pc.x += dx; _pc.y += dy;
      pcRequestRedraw();
    } else {
      _pc.orbit.theta += dx * 0.008;
      _pc.orbit.phi   += dy * 0.008;
      pcRenderSticker(true);
      pcRequestRedraw();
    }
  } else if(_pc.pointers.size === 2 && _pc.pinch){
    const b = _pc.pinch;
    const pts = [..._pc.pointers.values()];
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1];
    const dist = Math.hypot(dx, dy) || 1;
    if(_pc.mode === 'place'){
      const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
      _pc.scale = Math.max(0.02, Math.min(10, b.scale * dist / b.dist));
      _pc.rot = b.rot + (Math.atan2(dy, dx) - b.ang);
      _pc.x = b.x + (mid[0] - b.mid[0]);
      _pc.y = b.y + (mid[1] - b.mid[1]);
      document.getElementById('pcRotSlider').value = Math.max(-180, Math.min(180, Math.round(_pc.rot * 180 / Math.PI)));
      pcRequestRedraw();
    } else {
      _pc.orbit.radius = b.radius * b.dist / dist;
      pcRenderSticker(true);
      pcRequestRedraw();
    }
  }
});
function pcPointerEnd(e){
  _pc.pointers.delete(e.pointerId);
  _pc.pinch = _pc.pointers.size === 2 ? pcPinchSnapshot() : null;
}
pcCv.addEventListener('pointerup', pcPointerEnd);
pcCv.addEventListener('pointercancel', pcPointerEnd);
pcCv.addEventListener('wheel', e => {
  if(!_pc.photo || !_pc.sticker) return;
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.08 : 1 / 1.08;
  if(_pc.mode === 'place'){
    _pc.scale = Math.max(0.02, Math.min(10, _pc.scale * f));
    pcRequestRedraw();
  } else {
    _pc.orbit.radius /= f;
    pcRenderSticker(true);
    pcRequestRedraw();
  }
}, { passive: false });

// ---------- 輸出：用照片「原始解析度」重繪(顯示canvas是縮小版，展示圖不能輸出縮小版) ----------
function pcComposeBlob(){
  return new Promise(resolve => {
    const cv = document.getElementById('pcCanvas');
    const out = document.createElement('canvas');
    out.width = _pc.photo.naturalWidth; out.height = _pc.photo.naturalHeight;
    const k = out.width / cv.width;   // 顯示座標系 → 原始解析度座標系
    const ctx = out.getContext('2d');
    ctx.drawImage(_pc.photo, 0, 0, out.width, out.height);
    ctx.save();
    ctx.translate(_pc.x * k, _pc.y * k);
    ctx.rotate(_pc.rot);
    ctx.scale(_pc.scale * k, _pc.scale * k);
    ctx.drawImage(_pc.sticker, -_pc.sticker.width / 2, -_pc.sticker.height / 2);
    ctx.restore();
    out.toBlob(b => resolve(b), 'image/png');
  });
}
function pcGuardReady(){
  if(!_pc.photo){ document.getElementById('pcStatus').textContent = t('⚠ Upload a photo first.'); return false; }
  return true;
}
async function pcDownload(){
  if(!pcGuardReady()) return;
  try {
    const blob = await pcComposeBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = DESIGN_ID + '_in-your-space.png';
    a.click();
    URL.revokeObjectURL(a.href);
    if(typeof showDlToast === 'function') showDlToast(a.download);
  } catch(err){
    console.error(err);
    document.getElementById('pcStatus').textContent = t('Could not prepare the composite image. Please try again.');
  }
}
async function pcShare(){
  if(!pcGuardReady()) return;
  try {
    const blob = await pcComposeBlob();
    const file = new File([blob], DESIGN_ID + '_in-your-space.png', { type: 'image/png' });
    await navigator.share({ files: [file] });
  } catch(err){
    if(err && err.name === 'AbortError') return;   // 使用者自己關掉分享面板，不是錯誤
    console.error(err);
    document.getElementById('pcStatus').textContent = t('Could not prepare the composite image. Please try again.');
  }
}
// 免責旁的動線：合成圖不承諾真實比例，要看真實尺寸 → 關本modal、開AR modal(M8-1b)
function pcSwitchToAR(){
  closePhotoCompose();
  if(typeof openARPreview === 'function') openARPreview();
}
