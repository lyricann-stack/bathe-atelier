/* tub3d.js — WebGL (Three.js) bathtub viewer for Bathe Atelier
   API-compatible upgrade of the original 2D-canvas renderer:
     import { TubViewer } from './tub3d.js'
     const v = new TubViewer(canvasEl, { autoSpin, interactive, yaw, pitch, spinSpeed });
     v.set({ shape, len, wid, dep, base, finish, addons, ledColor, curve, taper, flare,
             edgeSoft, wall, corner, asym, waist, lobe });
     v.setYaw(0.6); v.destroy();
   - One shared WebGL context renders every viewer on the page (blitted to each 2D canvas),
     so any number of tubs per page stays within browser context limits.
   - Transparent background: card gradients behind the canvas show through, same as before.
   - Full 360° drag (yaw + pitch, can flip right over) — behaviour preserved.
   - If Three.js fails to load (offline), falls back to the legacy renderer (tub3d-canvas.js).
*/

/* ---------- Three.js loader (single script tag, shared promise) ---------- */
let _threeP = null;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (_threeP) return _threeP;
  _threeP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => res();
    s.onerror = () => rej(new Error('three.js load failed'));
    document.head.appendChild(s);
  });
  return _threeP;
}

/* ---------- shared renderer (one WebGL context for the whole page) ---------- */
let _shared = null;
function sharedRenderer() {
  if (_shared) return _shared;
  const T = window.THREE;
  _shared = new T.WebGLRenderer({ alpha: true, antialias: true });
  _shared.setClearColor(0x000000, 0);
  return _shared;
}

const num = (v, d) => (v == null || isNaN(Number(v)) ? d : Number(v));

/* ---------- profile / cross-section math (identical to legacy renderer) ---------- */
function buildSpec(p) {
  const shape = p.shape || 'oval';
  let a = 1.0;
  let b = (p.wid / p.len) * 0.62;
  if (shape === 'round' || shape === 'japanese') { a = 0.8; b = 0.8; }
  if (shape === 'rect') b = (p.wid / p.len) * 0.66;
  let height = (p.dep / p.len) * 1.85;
  if (shape === 'japanese') height *= 1.5;

  const curve    = num(p.curve, 55) / 100;
  const taper    = num(p.taper, 40) / 100;
  const flareDeg = num(p.flare, 52) * 0.25 - 5;
  const flare    = flareDeg / 20;
  const edgeSoft = num(p.edgeSoft, 35) / 100;
  const wallTh   = num(p.wall, 45) / 100;
  const cornerK  = num(p.corner, 55) / 100;
  const asymK    = num(p.asym, 0) / 100;
  const waistK   = num(p.waist, 0) / 100;
  const lobeK    = num(p.lobe, 0) / 100;

  const nExp = 2.2 + cornerK * 5.2;
  function section(t) {
    const c = Math.cos(t), s = Math.sin(t);
    if (shape === 'rect') {
      return [Math.sign(c) * Math.pow(Math.abs(c), 2 / nExp),
              Math.sign(s) * Math.pow(Math.abs(s), 2 / nExp)];
    }
    if (shape === 'freeform') {
      let m = 1 + asymK * 0.22 * Math.cos(t) - waistK * 0.30 * Math.sin(t) * Math.sin(t) + lobeK * 0.12 * Math.cos(3 * t + 0.6);
      m = Math.max(0.4, Math.min(1.5, m));
      return [c * m, s * m];
    }
    return [c, s];
  }

  const r0 = 1 - 0.55 * taper;
  const rTop = 1 + flare * 0.14;
  function outerR(h) {
    const straight = r0 + (rTop - r0) * h;
    const belly = r0 + (rTop - r0) * Math.pow(h, 0.42) + Math.sin(Math.PI * h) * 0.09 * curve;
    return straight * (1 - curve) + belly * curve;
  }
  const rimInnerR = Math.max(0.35, rTop - (0.035 + wallTh * 0.19));

  // 連續剖面（由缸底外緣往上、越過缸緣、進到缸內、收到盆底）
  const rings = [];
  [0, 0.09, 0.26, 0.55, 0.8, 0.94].forEach(h => rings.push([h, outerR(h)]));
  rings.push([0.97, rTop + edgeSoft * 0.045]);
  rings.push([1.00, rTop]);
  rings.push([1.00, rimInnerR]);
  rings.push([0.74, rimInnerR * 0.93]);
  rings.push([0.40, Math.min(rimInnerR * 0.8, 0.66)]);
  rings.push([0.17, 0.34]);
  rings.push([0.135, 0.02]);

  // 拖鞋缸：靠背端缸緣抬升（沿高度平滑帶入，比舊版的頂環突變更順）
  function rimBoost(t, h) {
    if (shape !== 'slipper') return 0;
    const back = Math.max(0, -Math.cos(t));
    const w = Math.pow(Math.max(0, (h - 0.5) / 0.5), 1.6);
    return Math.pow(back, 1.4) * height * 0.85 * w;
  }

  return { shape, a, b, height, rings, section, rimBoost, rimInnerR, rTop };
}

/* ---------- BufferGeometry 掃掠建模 ---------- */
function buildGeometry(T, p) {
  const S = buildSpec(p);
  const SEG = 96;
  const rings = [[0.0, 0.02]].concat(S.rings);       // 底部封蓋起點
  const NR = rings.length;
  const pos = [], uv = [], idx = [];
  const cy = S.height * 0.5;

  for (let r = 0; r < NR; r++) {
    const [h, rad] = rings[r];
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      const [ux, uz] = S.section(t);
      const y = h * S.height + S.rimBoost(t, h) - cy;
      pos.push(ux * S.a * rad, y, uz * S.b * rad);
      uv.push(i / SEG, r / (NR - 1));
    }
  }
  for (let r = 0; r < NR - 1; r++) {
    for (let i = 0; i < SEG; i++) {
      const a0 = r * (SEG + 1) + i, b0 = a0 + 1, c0 = a0 + SEG + 1, d0 = c0 + 1;
      idx.push(a0, c0, b0, b0, c0, d0);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();

  // LED 燈條路徑（沿缸緣中線，含拖鞋缸背靠）
  const rMid = (S.rTop + S.rimInnerR) / 2;
  const led = [];
  for (let i = 0; i <= SEG; i++) {
    const t = (i / SEG) * Math.PI * 2;
    const [ux, uz] = S.section(t);
    led.push(new T.Vector3(ux * S.a * rMid, S.height + S.rimBoost(t, 1) - cy, uz * S.b * rMid));
  }
  return { geometry: g, spec: S, led };
}

/* ---------- 材質 ---------- */
function marbleTexture(T) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(120,125,135,0.28)'; x.lineWidth = 1.6;
  for (let v = 0; v < 7; v++) {
    x.beginPath();
    let px = Math.random() * 256, py = 0;
    x.moveTo(px, py);
    while (py < 256) { px += (Math.random() - 0.5) * 34; py += 10 + Math.random() * 18; x.lineTo(px, py); }
    x.stroke();
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}

function makeMaterial(T, p) {
  const finish = p.finish || 'Gloss White';
  const gold = /Gold/i.test(finish), matte = /Matte/i.test(finish), marble = /Marble/i.test(finish);
  const gloss = /Gloss|Custom/i.test(finish);
  const mat = new T.MeshPhysicalMaterial({
    color: new T.Color(p.base || '#eef1f4'),
    side: T.DoubleSide,
    roughness: matte ? 0.62 : (gloss || gold || marble) ? 0.16 : 0.4,
    metalness: gold ? 0.35 : 0.04,   // 無環境貼圖時高金屬度會發黑，取折衷值
    clearcoat: (gloss || marble) ? 0.55 : 0.0,
    clearcoatRoughness: 0.3
  });
  if (marble) mat.map = marbleTexture(T);
  return mat;
}

function shadowTexture(T) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 120);
  g.addColorStop(0, 'rgba(20,22,28,0.32)');
  g.addColorStop(1, 'rgba(20,22,28,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new T.CanvasTexture(c);
}

/* ---------- viewer ---------- */
export class TubViewer {
  constructor(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.params = { shape: 'oval', len: 1700, wid: 800, dep: 580, base: '#eef1f4', finish: 'Gloss White', addons: [] };
    this.yaw = opts.yaw != null ? opts.yaw : 0.7;
    this.targetYaw = this.yaw;
    this.pitch = opts.pitch != null ? opts.pitch : 0.42;
    this.autoSpin = opts.autoSpin != null ? opts.autoSpin : false;
    this.interactive = opts.interactive != null ? opts.interactive : true;
    this.spinSpeed = opts.spinSpeed != null ? opts.spinSpeed : 0.0045;
    this.dragging = false;
    this._dirty = true;
    this._ready = false;
    this._legacy = null;
    if (this.interactive) this._bindDrag();
    loadThree().then(() => this._init()).catch(() => this._fallback());
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /* --- 公開 API（與舊版一致） --- */
  set(params) {
    Object.assign(this.params, params);
    if (this._legacy) { this._legacy.set(params); return; }
    if (this._ready) this._rebuild();
    this._dirty = true;
  }
  setYaw(y) {
    this.yaw = this.targetYaw = y;
    if (this._legacy) { this._legacy.setYaw(y); return; }
    this._dirty = true;
  }
  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._legacy) this._legacy.destroy();
    if (this.scene) this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  }

  /* --- 內部 --- */
  _fallback() {
    import('./tub3d-canvas.js').then(m => {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._legacy = new m.TubViewer(this.canvas, {
        yaw: this.yaw, pitch: this.pitch, autoSpin: this.autoSpin,
        interactive: false /* 本類已綁定拖曳，轉發角度即可 */, spinSpeed: this.spinSpeed
      });
      this._legacy.set(this.params);
      this._raf = requestAnimationFrame(this._loop);
    }).catch(() => {});
  }

  _init() {
    const T = window.THREE;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(40, 1, 0.05, 60);
    this.group = new T.Group();
    this.scene.add(this.group);

    this.scene.add(new T.HemisphereLight(0xffffff, 0xb8bcc4, 0.85));
    const d1 = new T.DirectionalLight(0xffffff, 0.75); d1.position.set(-1.4, 2.4, 1.9); this.scene.add(d1);
    const d2 = new T.DirectionalLight(0xfff3e2, 0.28); d2.position.set(1.8, 1.2, -1.2); this.scene.add(d2);

    this.shadow = new T.Mesh(
      new T.PlaneGeometry(3.4, 3.4),
      new T.MeshBasicMaterial({ map: shadowTexture(T), transparent: true, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);

    this._ready = true;
    this._rebuild();
  }

  _rebuild() {
    const T = window.THREE;
    // 清掉舊模型與配件
    while (this.group.children.length) {
      const o = this.group.children.pop();
      o.traverse ? o.traverse(k => { if (k.geometry) k.geometry.dispose(); if (k.material) { if (k.material.map) k.material.map.dispose(); k.material.dispose(); } }) : null;
      this.group.remove(o);
    }
    const built = buildGeometry(T, this.params);
    this._spec = built.spec;
    this._ledPath = built.led;
    this.tub = new T.Mesh(built.geometry, makeMaterial(T, this.params));
    this.group.add(this.tub);
    this.shadow.position.y = -built.spec.height * 0.52 - 0.06;
    this.shadow.scale.setScalar(Math.max(built.spec.a, built.spec.b));

    const addons = this.params.addons || [];
    if (addons.indexOf('Freestanding filler tap') > -1) this.group.add(this._buildTap(T, built.spec));
    this._led = null;
    if (addons.indexOf('Chromotherapy LED') > -1) this.group.add(this._buildLed(T, built.led));
    this._dirty = true;
  }

  _buildTap(T, spec) {
    const g = new T.Group();
    const chrome = new T.MeshPhysicalMaterial({ color: 0xd9dde3, metalness: 0.3, roughness: 0.25, clearcoat: 0.5 });
    const h = spec.height * 1.35;
    const riser = new T.Mesh(new T.CylinderGeometry(0.022, 0.028, h, 24), chrome);
    riser.position.set(spec.a * 1.18, -spec.height * 0.5 + h / 2, 0);
    g.add(riser);
    const spout = new T.Mesh(new T.TorusGeometry(0.11, 0.02, 16, 24, Math.PI / 2), chrome);
    spout.position.set(spec.a * 1.18 - 0.11, -spec.height * 0.5 + h, 0);
    spout.rotation.z = Math.PI / 2;
    g.add(spout);
    const tip = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.07, 16), chrome);
    tip.position.set(spec.a * 1.18 - 0.22, -spec.height * 0.5 + h - 0.045, 0);
    g.add(tip);
    return g;
  }

  _buildLed(T, path) {
    const curve = new T.CatmullRomCurve3(path, true);
    const g = new T.Group();
    this._ledCore = new T.MeshBasicMaterial({ color: 0x7ae0c8, transparent: true, opacity: 0.9 });
    this._ledGlow = new T.MeshBasicMaterial({ color: 0x7ae0c8, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false });
    g.add(new T.Mesh(new T.TubeGeometry(curve, 128, 0.014, 8, true), this._ledCore));
    g.add(new T.Mesh(new T.TubeGeometry(curve, 128, 0.038, 8, true), this._ledGlow));
    this._led = g;
    return g;
  }

  _bindDrag() {
    const c = this.canvas;
    let lastX = 0, lastY = 0;
    const down = (e) => {
      this.dragging = true; this.autoSpin = false;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      lastY = (e.touches ? e.touches[0].clientY : e.clientY);
      c.style.cursor = 'grabbing';
      e.preventDefault();
    };
    const move = (e) => {
      if (!this.dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      this.yaw -= (x - lastX) * 0.012;
      this.pitch += (y - lastY) * 0.008;
      this.targetYaw = this.yaw;
      if (this._legacy) { this._legacy.yaw = this.yaw; this._legacy.pitch = this.pitch; this._legacy._dirty = true; }
      lastX = x; lastY = y; this._dirty = true;
      e.preventDefault();
    };
    const up = () => { this.dragging = false; c.style.cursor = 'grab'; };
    c.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    c.style.cursor = 'grab';
  }

  _loop() {
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    if (cw !== this._lastW || ch !== this._lastH) { this._lastW = cw; this._lastH = ch; this._dirty = true; }
    if (this.autoSpin && !this.dragging) { this.yaw += this.spinSpeed; this._dirty = true; }
    // LED 彩虹循環
    if (this._led && (this.params.ledColor || 'rainbow') === 'rainbow') {
      const t = performance.now() / 1400;
      const hue = ((Math.sin(t) * 0.5 + 0.5) * 260 + 180) % 360;
      this._ledCore.color.setHSL(hue / 360, 0.85, 0.64);
      this._ledGlow.color.copy(this._ledCore.color);
      this._dirty = true;
    } else if (this._led && this.params.ledColor) {
      this._ledCore.color.set(this.params.ledColor);
      this._ledGlow.color.copy(this._ledCore.color);
    }
    if (this._dirty && this._ready && !this._legacy && cw > 0 && ch > 0) { this._draw(); this._dirty = false; }
    this._raf = requestAnimationFrame(this._loop);
  }

  _draw() {
    const T = window.THREE;
    const r = sharedRenderer();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.canvas.clientWidth || 520, H = this.canvas.clientHeight || 460;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }

    // 模型旋轉（先 yaw 後 pitch，與舊版拖曳語意一致，可整個翻轉）
    this.group.rotation.set(this.pitch, this.yaw, 0, 'XYZ');

    // 地面陰影只在俯視角時可見（與舊版一致）
    const sy = Math.sin(this.pitch), cyv = Math.cos(this.pitch);
    this.shadow.material.opacity = (sy > 0.08 && cyv > 0.12) ? Math.min(1, cyv * 2) : 0;

    // 取景：依模型跨距與目前俯仰角自動拉遠近
    const spec = this._spec;
    const spanX = 2 * spec.a * 1.15;
    const spanY = (spec.height + 2 * Math.max(spec.a, spec.b) * Math.abs(sy)) * 1.32 + 0.5;
    const vFov = this.camera.fov * Math.PI / 180;
    this.camera.aspect = W / H;
    const dV = (spanY / 2) / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const dH = (spanX / 2) / Math.tan(hFov / 2);
    this.camera.position.set(0, 0, Math.max(dV, dH) + 0.6);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    r.setPixelRatio(dpr);
    r.setSize(W, H, false);
    r.render(this.scene, this.camera);

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(r.domElement, 0, 0, this.canvas.width, this.canvas.height);
  }
}
