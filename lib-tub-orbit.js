// lib-tub-orbit.js 視角旋轉＋主迴圈 — 由 customize.html 抽出（行 3153-3189），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== 滑鼠 / 觸控（360° 自由旋轉） =====================
let dragging=false, lastX=0, lastY=0, pinchD=0;
canvas.addEventListener('pointerdown', e=>{ if(dragH) return; dragging=true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener('pointermove', e=>{
  if(!dragging || dragH) return;
  orbit.theta += (e.clientX-lastX)*0.006;
  orbit.phi   -= (e.clientY-lastY)*0.006;
  lastX=e.clientX; lastY=e.clientY;
});
window.addEventListener('pointerup', ()=> dragging=false);
canvas.addEventListener('wheel', e=>{ e.preventDefault(); orbit.radius *= (1+Math.sign(e.deltaY)*0.08); }, {passive:false});
canvas.addEventListener('touchmove', e=>{
  if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    const dNow=Math.hypot(dx,dy);
    if(pinchD) orbit.radius *= pinchD/dNow;
    pinchD=dNow;
  }
}, {passive:true});
canvas.addEventListener('touchend', ()=> pinchD=0);

// ===================== 主迴圈 =====================
function resize(){
  const w=canvas.clientWidth, h=canvas.clientHeight;
  if(canvas.width !== w*devicePixelRatio || canvas.height !== h*devicePixelRatio){
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
}
function animate(){
  requestAnimationFrame(animate);
  resize();
  updateCamera();
  renderer.render(scene, camera);
}
