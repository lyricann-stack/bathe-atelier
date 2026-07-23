/* tub3d.js — lightweight canvas 3D bathtub renderer for Bathe Atelier
   Renders a shaded, rotatable freestanding-tub form. No dependencies.
   Usage:
     import { TubViewer } from './tub3d.js'
     const v = new TubViewer(canvasEl);
     v.set({ shape:'oval', len:1700, wid:800, dep:580, base:'#eef1f4', finish:'Gloss White', addons:[] });
     v.setYaw(0.6);            // radians, or let drag handle it
   The viewer owns its own requestAnimationFrame loop for idle auto-spin + drag.
*/

/* ---------- small vec helpers ---------- */
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(a) { const l = Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }
function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

function hexToRgb(h) {
  h = String(h).replace('#','');
  if (h.length === 3) h = h.split('').map(c => c+c).join('');
  return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
}

/* cross-section radius multiplier for angle t in [0,2pi) given shape */
function sectionXY(shape, t) {
  const c = Math.cos(t), s = Math.sin(t);
  if (shape === 'round' || shape === 'japanese') return [c, s];
  if (shape === 'rect') {
    // superellipse (rounded rectangle), exponent controls corner sharpness
    const n = 4.2;
    const cx = Math.sign(c) * Math.pow(Math.abs(c), 2/n);
    const sz = Math.sign(s) * Math.pow(Math.abs(s), 2/n);
    return [cx, sz];
  }
  // oval / slipper: ellipse (a,b applied later)
  return [c, s];
}

/* ---------- geometry build ---------- */
function buildGeometry(p) {
  const shape = p.shape || 'oval';
  // half-extents in model units (normalized ~ -1..1 footprint), height along +y
  let a = 1.0;                       // along length (x)
  let b = (p.wid / p.len) * 0.62;    // along width (z), relative
  if (shape === 'round' || shape === 'japanese') { a = 0.8; b = 0.8; }
  if (shape === 'rect') b = (p.wid / p.len) * 0.66;
  let height = (p.dep / p.len) * 1.85;
  if (shape === 'japanese') height *= 1.5;

  /* ---- free-form sculpt params (0..100 slider values; defaults match old look) ---- */
  const num = (v, d) => (v == null || isNaN(Number(v)) ? d : Number(v));
  const curve    = num(p.curve, 55) / 100;          // body curvature: 0 straight-sided → 1 full belly
  const taper    = num(p.taper, 40) / 100;          // base narrowing
  // edge angle: slider 0..100 → -5°..+20° (thermoform deep-draw draft ≥5-7°, so outward
  // flare is the natural range; inward tuck limited to a subtle -5°). default 52 ≈ +8°.
  const flareDeg = num(p.flare, 52) * 0.25 - 5;
  const flare    = flareDeg / 20;                   // normalized: -0.25 … +1
  const edgeSoft = num(p.edgeSoft, 35) / 100;       // edge roundness: 0 crisp → 1 rolled lip
  const wallTh   = num(p.wall, 45) / 100;           // rim width: 0 slim edge → 1 substantial
  const cornerK  = num(p.corner, 55) / 100;         // rect corner sharpness
  // freeform (irregular) shape harmonics — only applied when shape === 'freeform'
  const asymK    = num(p.asym, 0) / 100;            // one end fuller than the other
  const waistK   = num(p.waist, 0) / 100;           // hourglass pinch at the middle
  const lobeK    = num(p.lobe, 0) / 100;            // organic three-lobe undulation

  const nExp = 2.2 + cornerK * 5.2;                 // superellipse exponent for rect corners
  function section(t) {
    const c = Math.cos(t), s = Math.sin(t);
    if (shape === 'rect') {
      const cx = Math.sign(c) * Math.pow(Math.abs(c), 2/nExp);
      const sz = Math.sign(s) * Math.pow(Math.abs(s), 2/nExp);
      return [cx, sz];
    }
    if (shape === 'freeform') {
      let m = 1 + asymK*0.22*Math.cos(t) - waistK*0.30*Math.sin(t)*Math.sin(t) + lobeK*0.12*Math.cos(3*t + 0.6);
      m = Math.max(0.4, Math.min(1.5, m));
      return [c*m, s*m];
    }
    return [c, s];
  }

  const SEG = 64;
  // parametric outer profile: blend straight-sided ↔ bellied, with edge flare
  const r0 = 1 - 0.55 * taper;                      // bottom radius
  const rTop = 1 + flare * 0.14;                    // rim outer radius (edge angle)
  function outerR(h) {
    const straight = r0 + (rTop - r0) * h;
    const belly = r0 + (rTop - r0) * Math.pow(h, 0.42) + Math.sin(Math.PI * h) * 0.09 * curve;
    return straight * (1 - curve) + belly * curve;
  }
  const outer = [0, 0.09, 0.26, 0.55, 0.8, 0.94].map(h => [h, outerR(h)]);
  outer.push([0.97, rTop + edgeSoft * 0.045]);      // rolled-lip ring (edge roundness)
  outer.push([1.00, rTop]);
  // rim thickness (thin slab ↔ thick rim) and matching inner basin
  const rimOuterR = rTop;
  const rimInnerR = Math.max(0.35, rTop - (0.035 + wallTh * 0.19));
  const inner = [
    [1.00, rimInnerR], [0.74, rimInnerR * 0.93],
    [0.40, Math.min(rimInnerR * 0.8, 0.66)], [0.17, 0.34], [0.135, 0.0]
  ];

  // slipper: raise the back of the rim (angles near t=PI) into a backrest
  function rimBoost(t) {
    if (shape !== 'slipper') return 0;
    const back = Math.max(0, -Math.cos(t));   // 1 at t=PI (back), 0 at front
    return Math.pow(back, 1.4) * height * 0.85;
  }

  const quads = [];
  function ringPoint(radiusMult, hFrac, t, boost) {
    const [ux, uz] = section(t);
    return [ux * a * radiusMult, hFrac * height + (boost || 0), uz * b * radiusMult];
  }

  // OUTER wall
  for (let r = 0; r < outer.length - 1; r++) {
    const [h0, r0] = outer[r], [h1, r1] = outer[r+1];
    const topRing = (r === outer.length - 2);
    for (let i = 0; i < SEG; i++) {
      const t0 = (i / SEG) * Math.PI * 2, t1 = ((i+1) / SEG) * Math.PI * 2;
      const bo0 = topRing ? rimBoost(t0) : 0, bo1 = topRing ? rimBoost(t1) : 0;
      quads.push({
        v: [ ringPoint(r0,h0,t0,0), ringPoint(r0,h0,t1,0), ringPoint(r1,h1,t1,bo1), ringPoint(r1,h1,t0,bo0) ],
        kind: 'out'
      });
    }
  }
  // TOP RIM annulus (outer top -> inner top)
  for (let i = 0; i < SEG; i++) {
    const t0 = (i / SEG) * Math.PI * 2, t1 = ((i+1) / SEG) * Math.PI * 2;
    const b0 = rimBoost(t0), b1 = rimBoost(t1);
    quads.push({
      v: [ ringPoint(rimOuterR,1,t0,b0), ringPoint(rimOuterR,1,t1,b1), ringPoint(rimInnerR,1,t1,b1), ringPoint(rimInnerR,1,t0,b0) ],
      kind: 'rim'
    });
  }
  // INNER wall (down to basin)
  for (let r = 0; r < inner.length - 1; r++) {
    const [h0, r0] = inner[r], [h1, r1] = inner[r+1];
    const topRing = (r === 0);
    for (let i = 0; i < SEG; i++) {
      const t0 = (i / SEG) * Math.PI * 2, t1 = ((i+1) / SEG) * Math.PI * 2;
      const bo0 = topRing ? rimBoost(t0) : 0, bo1 = topRing ? rimBoost(t1) : 0;
      quads.push({
        v: [ ringPoint(r0,h0,t0,bo0), ringPoint(r0,h0,t1,bo1), ringPoint(r1,h1,t1,0), ringPoint(r1,h1,t0,0) ],
        kind: 'in'
      });
    }
  }

  // LED strip path: follows the actual rim (any shape incl. freeform & slipper backrest)
  const led = [];
  const rMid = (rimOuterR + rimInnerR) / 2;
  for (let i = 0; i <= SEG; i++) {
    const t = (i / SEG) * Math.PI * 2;
    const [ux, uz] = section(t);
    led.push([ux * a * rMid, height + rimBoost(t), uz * b * rMid]);
  }

  // centre so vertical middle ~ 0
  const cy = height * 0.5;
  quads.forEach(q => q.v.forEach(pt => { pt[1] -= cy; }));
  led.forEach(pt => { pt[1] -= cy; });
  return { quads, height, a, b, led };
}

/* ---------- viewer ---------- */
export class TubViewer {
  constructor(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.params = { shape:'oval', len:1700, wid:800, dep:580, base:'#eef1f4', finish:'Gloss White', addons:[] };
    this.geo = buildGeometry(this.params);
    this.yaw = opts.yaw != null ? opts.yaw : 0.7;
    this.targetYaw = this.yaw;
    this.pitch = opts.pitch != null ? opts.pitch : 0.42;
    this.autoSpin = opts.autoSpin != null ? opts.autoSpin : false;  // manual drag only by default
    this.interactive = opts.interactive != null ? opts.interactive : true;
    this.spinSpeed = opts.spinSpeed != null ? opts.spinSpeed : 0.0045;
    this.dragging = false;
    this._dirty = true;
    this._raf = null;
    if (this.interactive) this._bindDrag();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  set(params) {
    Object.assign(this.params, params);
    this.geo = buildGeometry(this.params);
    this._dirty = true;
    this._safeDraw();
  }
  setYaw(y) { this.yaw = this.targetYaw = y; this._dirty = true; this._safeDraw(); }
  _safeDraw() {
    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) { this._draw(); this._dirty = false; }
    else { requestAnimationFrame(() => { if (this.canvas.clientWidth > 0) { this._draw(); this._dirty = false; } }); }
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
      this.yaw -= (x - lastX) * 0.012;          // full 360° horizontal
      this.pitch += (y - lastY) * 0.008;        // full 360° vertical — flip it right over
      this.targetYaw = this.yaw;
      lastX = x; lastY = y; this._dirty = true;
      this._draw(); this._dirty = false;
      e.preventDefault();
    };
    const up = () => { this.dragging = false; c.style.cursor = 'grab'; };
    c.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive:false });
    window.addEventListener('touchmove', move, { passive:false });
    window.addEventListener('touchend', up);
    c.style.cursor = 'grab';
  }

  _loop() {
    // redraw if the element resized after init (late layout / fonts / panel show)
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    if (cw !== this._lastW || ch !== this._lastH) { this._lastW = cw; this._lastH = ch; this._dirty = true; }
    if (this.autoSpin && !this.dragging) { this.yaw += this.spinSpeed; this._dirty = true; }
    if (this._dirty && cw > 0 && ch > 0) { this._draw(); this._dirty = false; }
    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() { if (this._raf) cancelAnimationFrame(this._raf); }

  _draw() {
    const canvas = this.canvas, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 520, H = canvas.clientHeight || 460;
    if (canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)) {
      canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cy = Math.cos(this.pitch), sy = Math.sin(this.pitch);
    const cA = Math.cos(this.yaw), sA = Math.sin(this.yaw);
    const rotate = (pt) => {
      let x = pt[0]*cA + pt[2]*sA;
      let z = -pt[0]*sA + pt[2]*cA;
      let y = pt[1];
      let y2 = y*cy - z*sy;
      let z2 = y*sy + z*cy;
      return [x, y2, z2];
    };

    // fit (abs() keeps the model framed at any vertical angle, incl. upside-down)
    const geo = this.geo;
    const spanX = 2 * geo.a, spanY = geo.height + 2*Math.max(geo.a,geo.b)*Math.abs(sy);
    const scale = Math.min(W / (spanX*1.15), H / (spanY*1.32 + 0.5));
    const cx = W/2, ccy = H*0.47;
    const project = (pt) => [cx + pt[0]*scale, ccy - pt[1]*scale];

    // ground shadow — only meaningful while viewing from above-ish; fades out otherwise
    const shY = ccy + (geo.height*0.52)*scale*cy + 6;
    if (sy > 0.08 && cy > 0.12) {
      const shW = geo.a*scale*1.35, shH = geo.b*scale*sy*1.6 + 8;
      const gsh = ctx.createRadialGradient(cx, shY, 4, cx, shY, shW);
      const shA = 0.30 * Math.min(1, cy*2);
      gsh.addColorStop(0, 'rgba(20,22,28,'+shA.toFixed(3)+')');
      gsh.addColorStop(1, 'rgba(20,22,28,0)');
      ctx.save(); ctx.translate(cx, shY); ctx.scale(1, shH/shW); ctx.beginPath();
      ctx.arc(0, 0, shW, 0, Math.PI*2); ctx.fillStyle = gsh; ctx.fill(); ctx.restore();
    }

    // rotate + shade + sort
    const base = hexToRgb(this.params.base || '#eef1f4');
    const finish = this.params.finish || 'Gloss White';
    const isGloss = /Gloss|Gold|Marble|Custom/i.test(finish);
    const specStr = /Gold/i.test(finish) ? 0.9 : /Gloss/i.test(finish) ? 0.85 : /Matte|Black/i.test(finish) ? 0.12 : 0.5;
    const light = norm([-0.45, -0.78, 0.62]);   // screen space: x right, y down, z toward viewer
    const view = [0, 0, 1];

    const faces = [];
    for (const q of geo.quads) {
      const w = q.v.map(rotate);
      const n = norm(cross(sub(w[1], w[0]), sub(w[3], w[0])));
      // ensure normal points toward viewer for lighting sign consistency (screen y down => flip y)
      const ns = [n[0], -n[1], n[2]];
      const facing = ns[2];
      const depth = (w[0][2]+w[1][2]+w[2][2]+w[3][2]) / 4;
      const pts = q.v.map((_, k) => project(w[k]));
      // diffuse
      let diff = Math.max(0, dot(ns, [-light[0], -light[1], -light[2]]));
      let lit = 0.28 + 0.72 * diff;             // ambient + diffuse
      // basin interior a touch darker
      if (q.kind === 'in') lit *= 0.82;
      if (q.kind === 'rim') lit *= 1.02;
      // specular (Blinn-ish)
      let spec = 0;
      if (isGloss && facing > 0) {
        const half = norm([-light[0]+view[0], -light[1]+view[1], -light[2]+view[2]]);
        spec = Math.pow(Math.max(0, dot(ns, half)), 22) * specStr;
      }
      let r = Math.min(255, base[0]*lit + spec*255);
      let g = Math.min(255, base[1]*lit + spec*255);
      let bl = Math.min(255, base[2]*lit + spec*255);
      // marble subtle vein noise
      if (/Marble/i.test(finish)) {
        const nz = (Math.sin(w[0][0]*7.3 + w[0][1]*5.1) * 0.5 + 0.5);
        const d = (nz - 0.5) * 22;
        r += d; g += d; bl += d;
      }
      faces.push({ pts, depth, facing, color: `rgb(${r|0},${g|0},${bl|0})`, kind: q.kind, ns });
    }
    faces.sort((f1, f2) => f1.depth - f2.depth);

    for (const f of faces) {
      if (f.facing <= -0.02 && f.kind === 'out') continue; // cull clearly back-facing outer
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (let k = 1; k < f.pts.length; k++) ctx.lineTo(f.pts[k][0], f.pts[k][1]);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 0.6;
      ctx.stroke();  // hides seams between quads
    }

    // addon: freestanding filler tap (simple arc) — drawn in front
    if ((this.params.addons||[]).indexOf('Freestanding filler tap') > -1) {
      const bx = cx + geo.a*scale*0.95, topY = ccy - geo.height*0.55*scale*cy, botY = shY-6;
      ctx.strokeStyle = '#b9bcc4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, botY); ctx.lineTo(bx, topY);
      ctx.quadraticCurveTo(bx, topY-14, bx-26, topY-14); ctx.stroke();
    }
    // addon: chromotherapy LED — glowing strip that hugs the actual rim geometry,
    // rotates with the tub, and takes a chosen colour (or cycles when 'rainbow')
    if ((this.params.addons||[]).indexOf('Chromotherapy LED') > -1 && geo.led) {
      let col = this.params.ledColor || 'rainbow';
      if (col === 'rainbow') {
        const t = performance.now()/1400;
        const hue = (Math.sin(t)*0.5+0.5)*260 + 180;
        col = `hsla(${hue|0},85%,64%,0.6)`;
        this._dirty = true; // keep the cycle animating
      } else {
        const rgb = hexToRgb(col);
        col = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.65)`;
      }
      const pts = geo.led.map(p => project(rotate(p)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
      ctx.lineWidth = 1.6; ctx.shadowBlur = 4;  // bright core pass
      ctx.stroke();
      ctx.restore();
    }
  }
}
