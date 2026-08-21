// ===================== lib-edit3d-ar-export.js =====================
// Phase 8 M8-1a(2026-08-21)：3D場景匯出成AR通用格式(glb/usdz)，供iOS Safari原生AR Quick Look／
// Android Chrome原生Scene Viewer使用。本檔只做「匯出器接線＋單位校正＋桌面驗證」——真正面向
// 使用者的「在你的空間查看」按鈕＋QR code流程是M8-1b，需要Lyric的iPhone實機驗收，尚未做。
// 依賴：GLTFExporter.js／USDZExporter.js(three.js r128官方examples，UMD版，掛在THREE命名空間下，
// 跟本專案既有的three.min.js CDN載入方式一致，不需要改成ES module架構)。

// 匯出用的場景複本：結構性clone(幾何/材質仍共用參照，純讀取安全)，縮放0.001把mm轉成m
// (glTF/USDZ/AR生態系統的慣例單位，1.6m的缸在AR裡才會真的量出1.6m)——不改動原始tubGroup，
// 編輯器繼續正常運作。濾掉'waterSim'：水位模擬是編輯器預覽輔助，不是產品本身的一部分。
function buildExportGroup(){
  const g = tubGroup.clone(true);
  const water = g.getObjectByName('waterSim');
  if(water) water.parent.remove(water);
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
