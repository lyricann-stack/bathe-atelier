// ===================== lib-edit3d-photo2tub.js =====================
// Phase 5抽取(2026-08-20)：逐字抽自photo2tub-app.html 4407-4512行(P3-M3規格書的photo2tub上傳模組)。
// 依賴宿主頁面：#p2tBanner DOM、importSpecJSON()(export/import模組)、缸型選擇(tub_type)。

// ============================================================
(function(){
  const P2T_API_BASE = 'https://lyricann--photo2tub-api-fastapi-app.modal.run'; // P3-M2：雲端Modal端點(2026-08-20部署，GPU/T4)
  // 2026-08-21 token輪替準備：新token+新Modal secret名稱(photo2tub-api-token-20260821)已備妥，
  // 但**尚未切換**——這裡先寫入新值(跟photo2tub-app.html同步)，實際生效需要有Modal帳號權限的人
  // 執行`modal secret create photo2tub-api-token-20260821 PHOTO2TUB_API_TOKEN=<新token>`並把
  // api/modal_app.py的secret名稱改成讀新secret後重新deploy——三件事(這裡的commit push、建新
  // secret、modal_app.py改名+deploy)要同時生效，否則push了但secret沒轉會讓正式頁打不通API。
  const P2T_API_TOKEN = 'KziTQXe5ltFKzu5swfb20DoshQihl3h_etRKmbLQ5AE';          // 新token(待跟Modal secret同步切換，見上)
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

  // Phase 8佇列項8：照片張數→預期精度提示(規格書UX節)。純張數門檻(client端沒有上傳前的角度推斷能力，
  // 規格原文「可推斷的視角組成」是選配，這裡誠實只做張數這個可靠訊號)，跟Stage 1.5已上線的
  // 「人機分工」低信心標註是同一溝通方向的互補：那個是分析完事後標，這個是選片當下先設預期。
  // 三語(EN/zh/th)透過t()呼叫——這段文字是動態組出來的banner內容，不是靜態DOM，collectI18nNodes()
  // 掃描不到，所以直接呼叫t()而非依賴語言切換時的TreeWalker機制(跟本頁其餘banner文字保持英文不同，
  // 那些是既有債，本次刻意只還「新增的這一句」，不擴大成整套banner系統i18n化)。
  function photoCountHint(n){
    if(n <= 2) return t('Expect only a rough proportional estimate — add more angles for shape detail.');
    if(n === P2T_MIN_PHOTOS) return t('Expect basic proportions — shape detail depends on which angles you chose.');
    if(n <= 6) return t('Good chance of capturing the profile-curve shape, especially with a side-on and a top-down photo included.');
    return t('The most complete shape reconstruction this tool supports.');
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
        `${P2T_MIN_PHOTOS}–${P2T_MAX_PHOTOS} photos from different angles works best — continuing anyway with what you gave me. ${photoCountHint(list.length)}`);
    } else {
      showBanner('progress', 'Uploading & processing…', `${photoCountHint(list.length)} Usually 30–90 seconds. First run after idle time (cold start) can take 2–3 minutes — please don\'t close this tab.`);
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
      else if(resp.status === 429) reason = 'Too many attempts from this network in a short time — please wait a few minutes and try again.';
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
