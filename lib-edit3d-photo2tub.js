// ===================== lib-edit3d-photo2tub.js =====================
// Phase 5抽取(2026-08-20)：逐字抽自photo2tub-app.html 4407-4512行(P3-M3規格書的photo2tub上傳模組)。
// 依賴宿主頁面：#p2tBanner DOM、importSpecJSON()(export/import模組)、缸型選擇(tub_type)。

// ============================================================
(function(){
  const P2T_API_BASE = 'https://lyricann--photo2tub-api-fastapi-app.modal.run'; // P3-M2：雲端Modal端點(2026-08-20部署，GPU/T4)
  const P2T_API_TOKEN = 'x_DW2YaJxsl_BM6m74t2bVeILZJwO9BAkEdRERqh42I';          // 正式token(存於Modal Secret photo2tub-api-token)
  const P2T_MIN_PHOTOS = 3, P2T_MAX_PHOTOS = 8;

  const banner = document.getElementById('p2tBanner');

  function showBanner(kind, title, sub, detailsHtml){
    banner.className = kind;
    banner.style.display = 'block';
    banner.innerHTML = `<div class="p2t-row">${kind==='progress' ? '<div class="p2t-spinner"></div>' : ''}
      <div><div class="p2t-title">${title}</div>${sub ? `<div class="p2t-sub">${sub}</div>` : ''}</div></div>
      ${detailsHtml || ''}`;
  }

  function messagesToDetailsHtml(messages){
    if(!messages || !messages.length) return '';
    const items = messages.map(m=>{
      const isWarn = /⚠|建議|低信心|不足|退回|homography計算退化/.test(m);
      return `<li class="${isWarn ? 'p2t-warn-item' : ''}">${m.replace(/</g,'&lt;')}</li>`;
    }).join('');
    return `<details id="p2tDetails"><summary>Pipeline notes (${messages.length}) — click to expand</summary><ul>${items}</ul></details>`;
  }

  async function handlePhotoUpload(files){
    const list = Array.from(files);
    if(list.length === 0) return;
    if(list.length > P2T_MAX_PHOTOS){
      showBanner('err', `⚠ Too many photos (${list.length})`, `Please select at most ${P2T_MAX_PHOTOS} photos.`);
      return;
    }
    if(list.length < P2T_MIN_PHOTOS){
      showBanner('warn', `⚠ Only ${list.length} photo${list.length>1?'s':''} selected`,
        `${P2T_MIN_PHOTOS}–${P2T_MAX_PHOTOS} photos from different angles works best — continuing anyway with what you gave me.`);
    } else {
      showBanner('progress', 'Uploading & processing…', 'Usually 30–90 seconds. First run after idle time (cold start) can take 2–3 minutes — please don\'t close this tab.');
    }

    const t0 = performance.now();
    const fd = new FormData();
    list.forEach(f => fd.append('files', f, f.name));
    fd.append('tub_type', document.getElementById('photo2tubType').value);  // P4-M4：接上P4-M3新增的tub_type參數

    let resp, data;
    try {
      resp = await fetch(P2T_API_BASE + '/reconstruct', {
        method: 'POST',
        headers: { 'x-api-token': P2T_API_TOKEN },
        body: fd,
      });
      data = await resp.json().catch(()=>null);
    } catch(err){
      showBanner('err', '⚠ Could not reach the reconstruction service',
        `Network/CORS error — is the API endpoint reachable? (${err.message}). This is expected if the local test API isn't running, or before P3-M2 cloud deploy.`);
      return;
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    if(!resp.ok){
      const detail = data && data.detail;
      const msgs = (detail && detail.messages) || [];
      let reason = 'The pipeline could not produce a model from these photos.';
      if(resp.status === 401) reason = 'Authentication failed (bad API token) — this is a test-page config issue, not a photo problem.';
      else if(resp.status === 400) reason = (detail && detail.detail) || 'Please upload 1–8 photos.';
      else if(resp.status === 422) reason = 'No bathtub was found in any of the uploaded photos. Try a clearer shot with the tub filling more of the frame, or better lighting.';
      showBanner('err', '⚠ ' + reason, msgs.length ? '' : `(${resp.status}, ${elapsed}s)`, messagesToDetailsHtml(msgs));
      return;
    }

    // 成功：載入spec JSON進3D編輯器(跟⬆ Upload CAD File按鈕走同一個函式)
    try {
      importSpecJSON(JSON.stringify(data.spec));
    } catch(err){
      showBanner('err', '⚠ Model reconstructed but failed to load into the editor', err.message);
      return;
    }

    const dp = data.spec['設計參數'] || {};
    const dimsMode = data.spec['dims_mode'];
    let title = `✓ Model generated (${elapsed}s)`;
    let sub = '';
    if(dimsMode === 'proportional_default'){
      sub = `Proportional model — default length 1.7m (${dp['外部長度_mm']}×${dp['外部寬度_mm']}mm shown). ` +
            `This is <b>not a measurement</b> — use the Length/Width sliders below to set the real dimensions.`;
    } else if(!dimsMode){
      sub = 'Angle quality was too limited for a reliable shape/size estimate — only a rough outline could be produced. Consider a more top-down photo, or use the 4-point perspective tool below.';
    }
    const lowConf = Object.entries(data.spec['field_confidence'] || {}).filter(([k,v])=>v==='low').map(([k])=>k);
    if(lowConf.length){
      sub += (sub?'<br>':'') + `⚠ Please manually confirm: <b>${lowConf.join(', ')}</b> (low confidence).`;
    }
    const multiBoxMsgs = (data.messages || []).filter(m => /個候選框/.test(m));
    if(multiBoxMsgs.length){
      sub += (sub?'<br>':'') + `⚠ More than one bathtub-like shape was seen in ${multiBoxMsgs.length===1?'a photo':'some photos'} — ` +
             `the largest was used. If that's wrong, re-photograph the target tub on its own.`;
    }
    showBanner('ok', title, sub, messagesToDetailsHtml(data.messages));
  }

  document.getElementById('photo2tubFiles').addEventListener('change', (e)=>{
    handlePhotoUpload(e.target.files);
    e.target.value = '';
  });
})();
