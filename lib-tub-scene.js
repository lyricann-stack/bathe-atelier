// lib-tub-scene.js Three.js 場景 — 由 customize.html 抽出（行 786-827），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== Three.js 場景 =====================
const canvas = document.getElementById('canvas3d');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x131211);   // Noir 近黑（與新首頁銜接）

const camera = new THREE.PerspectiveCamera(42, 1, 10, 30000);
let orbit = { theta: Math.PI/4, phi: Math.PI/3.2, radius: 3400, target: new THREE.Vector3(0, 280, 0) };

function updateCamera(){
  // 全方位旋轉：允許轉到浴缸下方仰視（phi 接近 0=正上方、π=正下方）
  orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi));
  orbit.radius = Math.max(1200, Math.min(9000, orbit.radius));
  const s = Math.sin(orbit.phi), c = Math.cos(orbit.phi);
  camera.position.set(
    orbit.target.x + orbit.radius * s * Math.cos(orbit.theta),
    orbit.target.y + orbit.radius * c,
    orbit.target.z + orbit.radius * s * Math.sin(orbit.theta)
  );
  camera.lookAt(orbit.target);
}

scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b8c0, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.75);
dir.position.set(1500, 2500, 1200);
scene.add(dir);
const dir2 = new THREE.DirectionalLight(0xfff2e0, 0.3);
dir2.position.set(-1800, 1200, -1000);
scene.add(dir2);

// 地板（單面Material：轉到下方仰視時地板自動消失，不會擋住視線）
// 深色底座：與白色缸體拉開對比，細節（缸緣、收縮、斜底）看得清楚
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5000, 64),
  new THREE.MeshStandardMaterial({color:0x1d1b18, roughness:0.95})
);
floor.rotation.x = -Math.PI/2;
scene.add(floor);
const grid = new THREE.GridHelper(6000, 30, 0x2e2a24, 0x24211d);
grid.position.y = 1;
scene.add(grid);
