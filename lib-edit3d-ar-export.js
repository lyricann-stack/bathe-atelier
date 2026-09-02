// ===================== lib-edit3d-ar-export.js =====================
// Phase 8 M8-1a(2026-08-21)：3D場景匯出成AR通用格式(glb/usdz)，供iOS Safari原生AR Quick Look／
// Android Chrome原生Scene Viewer使用。本檔只做「匯出器接線＋單位校正＋桌面驗證」——真正面向
// 使用者的「在你的空間查看」按鈕＋QR code流程是M8-1b，需要Lyric的iPhone實機驗收，尚未做。
// 依賴：GLTFExporter.js／USDZExporter.js(three.js r128官方examples，UMD版，掛在THREE命名空間下，
// 跟本專案既有的three.min.js CDN載入方式一致，不需要改成ES module架構)。

// 2026-09-02，Lyric真機AR Quick Look實測回報：浴缸看起來像一片薄殼(看不到缸緣厚度、
// 內缸凹陷)，繞著走時外形還會隨角度跳來跳去。查證：缸體的缸壁/缸緣/底這些薄殼網格在
// 編輯器裡本來就是material.side=THREE.DoubleSide(雙面渲染，否則邊緣稍微透視角度就會看穿)，
// 但無論新舊版本的three.js USDZExporter都只會印警告「USDZ does not support double sided
// materials」、實際上完全不處理——USD格式本身其實有doubleSided屬性，只是這顆匯出器沒實作，
// 单面 culling 的結果就是：依相機角度，牆面這一面被剔除、看起來像半片殼、走位時忽隱忽現。
// 修法：匯出前手動把每個雙面網格複製一份、翻轉三角形環繞方向+反轉法線，疊在原本那份上面，
// 變成兩片單面網格背對背——任何單面渲染器(包含RealityKit/AR Quick Look)都會正常顯示，
// 不需要USD格式支援doubleSided屬性，也不用等三方套件補實作。
function makeBackfaceClone(mesh){
  const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  // 每三個頂點一個三角形，交換後兩點順序=翻轉環繞方向(正面變反面)
  for(let i=0; i<pos.count; i+=3){
    for(const attr of [pos, nrm]){
      if(!attr) continue;
      const x1=attr.getX(i+1), y1=attr.getY(i+1), z1=attr.getZ(i+1);
      const x2=attr.getX(i+2), y2=attr.getY(i+2), z2=attr.getZ(i+2);
      attr.setXYZ(i+1, x2, y2, z2);
      attr.setXYZ(i+2, x1, y1, z1);
    }
  }
  if(nrm){
    for(let i=0;i<nrm.count;i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
    nrm.needsUpdate = true;
  }
  pos.needsUpdate = true;
  const clone = new THREE.Mesh(geo, mesh.material);
  clone.name = (mesh.name || 'mesh') + '_backface';
  return clone;
}

// 匯出用的場景複本：結構性clone(幾何/材質仍共用參照，純讀取安全)，縮放0.001把mm轉成m
// (glTF/USDZ/AR生態系統的慣例單位，1.6m的缸在AR裡才會真的量出1.6m)——不改動原始tubGroup，
// 編輯器繼續正常運作。
// 2026-09-02 Lyric決定：水位模擬('waterSim')改成保留、一起匯出，不再濾掉——之前(*本行以上的
// 舊註解*)認為水只是編輯器預覽輔助、不該進AR，但實際測試後Lyric覺得AR裡看到水面效果更好，
// 明確要求保留。water本身material.side本來就是THREE.DoubleSide，下面雙面材質補背面的迴圈
// 會自動把它也一併處理，不用額外寫特例。
function buildExportGroup(){
  const g = tubGroup.clone(true);
  // 雙面材質補背面：先蒐集清單再逐一加入，避免邊遍歷邊修改children陣列
  const doubleSided = [];
  g.traverse(obj => { if(obj.isMesh && obj.material && obj.material.side === THREE.DoubleSide) doubleSided.push(obj); });
  doubleSided.forEach(mesh => mesh.parent.add(makeBackfaceClone(mesh)));
  g.scale.set(0.001, 0.001, 0.001);
  g.updateMatrixWorld(true);
  return g;
}

// noDownload=true 回傳{arrayBuffer,filename,sizeBytes}供驗收/測試用，不觸發瀏覽器下載
function exportGLB(noDownload){
  return new Promise((resolve, reject) => {
    if(typeof THREE.GLTFExporter !== 'function'){ reject(new Error('GLTFExporter not loaded')); return; }
    const exporter = new THREE.GLTFExporter();
    const g = buildExportGroup();
    try {
      exporter.parse(g, (result) => {
        const filename = `${DESIGN_ID}.glb`;
        if(noDownload){ resolve({ arrayBuffer: result, filename, sizeBytes: result.byteLength }); return; }
        const blob = new Blob([result], {type:'model/gltf-binary'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = filename; a.click();
        URL.revokeObjectURL(a.href);
        if(typeof showDlToast === 'function') showDlToast(filename);
        resolve({ filename, sizeBytes: result.byteLength });
      }, { binary: true, embedImages: false });
    } catch(err) { reject(err); }
  });
}

async function exportUSDZ(noDownload){
  if(typeof THREE.USDZExporter !== 'function') throw new Error('USDZExporter not loaded');
  const exporter = new THREE.USDZExporter();
  const g = buildExportGroup();
  const bytes = await exporter.parse(g);
  const filename = `${DESIGN_ID}.usdz`;
  if(noDownload) return { arrayBuffer: bytes.buffer, filename, sizeBytes: bytes.byteLength };
  const blob = new Blob([bytes], {type:'model/vnd.usdz+zip'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
  if(typeof showDlToast === 'function') showDlToast(filename);
  return { filename, sizeBytes: bytes.byteLength };
}
