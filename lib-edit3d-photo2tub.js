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

  // 2026-08-22：photo2tub上傳banner系統整套i18n化(佇列項8只還了photoCountHint那一句，
  // 其餘19條訊息當時刻意留債)。**這份字典跟photo2tub-app.html自己inline的同名P2T_I18N
  // 是同一份內容的兩份拷貝**——那個頁面是獨立單檔架構，沒有載入這個檔案，只能各自維護一份，
  // 這是該頁架構的固有結果，不是疏漏。改一邊時務必同步改另一邊，否則兩個頁面的訊息文案會漂移。
  // 不併入lib-edit3d-i18n.js共用大字典：這19條含動態內插值的長句樣板，跟共用字典裡220多條
  // 靜態UI標籤性質不同，塞進去只會讓pro.html/medium.html都要載入的共用字典徒增膨脹(監督裁定)。
  // 佔位符{xxx}用p2tT()呼叫時的第二參數物件取代，不是t()原本的無參數查表機制。
  const P2T_I18N = {
    '⚠ Too many photos ({n})': ['⚠ 照片太多张({n})', '⚠ รูปถ่ายมากเกินไป ({n})', '⚠ 照片太多張({n})'],
    'Please select at most {max} photos.': ['请最多选择{max}张照片。', 'กรุณาเลือกรูปถ่ายไม่เกิน {max} รูป', '請最多選擇{max}張照片。'],
    '⚠ Only {n} photo(s) selected': ['⚠ 只选了{n}张照片', '⚠ เลือกรูปถ่ายเพียง {n} รูป', '⚠ 只選了{n}張照片'],
    '{min}–{max} photos from different angles works best — continuing anyway with what you gave me.': ['{min}–{max}张不同角度的照片效果最好——仍会用你提供的照片继续处理。', 'รูปถ่าย {min}–{max} รูปจากมุมต่างกันจะได้ผลดีที่สุด — ระบบจะดำเนินการต่อด้วยรูปที่คุณให้มา', '{min}–{max}張不同角度的照片效果最好——仍會用你提供的照片繼續處理。'],
    'Uploading & processing…': ['上传处理中…', 'กำลังอัปโหลดและประมวลผล…', '上傳處理中…'],
    'Usually 30–90 seconds. First run after idle time (cold start) can take 2–3 minutes — please don\'t close this tab.': ['通常需要30–90秒。闲置后第一次运行(冷启动)可能需要2–3分钟——请勿关闭此分页。', 'โดยปกติใช้เวลา 30–90 วินาที การรันครั้งแรกหลังไม่มีการใช้งาน (cold start) อาจใช้เวลา 2–3 นาที — กรุณาอย่าปิดแท็บนี้', '通常需要30–90秒。閒置後第一次運行(冷啟動)可能需要2–3分鐘——請勿關閉此分頁。'],
    '⚠ Could not reach the reconstruction service': ['⚠ 无法连线到重建服务', '⚠ ไม่สามารถเชื่อมต่อบริการสร้างโมเดลได้', '⚠ 無法連線到重建服務'],
    // ⚠ 文案審視backlog(2026-08-22，08裁定本次照原文翻譯不改寫)："P3-M2 cloud deploy"是2026-08-20
    // 已完成的部署事件，這句話當初寫給開發期參考、現在讀起來像還沒deploy，過時但本次不動英文原文
    'Network/CORS error — is the API endpoint reachable? ({err}). This is expected if the local test API isn\'t running, or before P3-M2 cloud deploy.': ['网路/CORS错误——API端点可以连线吗？({err})。如果本机测试API没有运行，或云端部署前，这是预期中的情况。', 'ข้อผิดพลาดเครือข่าย/CORS — เข้าถึง API endpoint ได้หรือไม่ ({err}) หากยังไม่ได้รัน API ทดสอบในเครื่อง หรือก่อนการ deploy ขึ้นคลาวด์ นี่เป็นเรื่องปกติ', '網路/CORS錯誤——API端點可以連線嗎？({err})。如果本機測試API沒有運行，或雲端部署前，這是預期中的情況。'],
    'The pipeline could not produce a model from these photos.': ['管线无法从这些照片产生模型。', 'ไพพ์ไลน์ไม่สามารถสร้างโมเดลจากรูปถ่ายเหล่านี้ได้', '管線無法從這些照片產生模型。'],
    // ⚠ 文案審視backlog：「test-page config issue」在pro.html(正式頁)出現不合適(不是測試頁)，
    // 本次照原文翻譯不改寫，留給文案審視項一次處理
    'Authentication failed (bad API token) — this is a test-page config issue, not a photo problem.': ['认证失败(API token错误)——这是测试页设定问题，不是照片本身的问题。', 'การยืนยันตัวตนล้มเหลว (API token ไม่ถูกต้อง) — เป็นปัญหาการตั้งค่าหน้าทดสอบ ไม่ใช่ปัญหารูปถ่าย', '認證失敗(API token錯誤)——這是測試頁設定問題，不是照片本身的問題。'],
    'Please upload 1–8 photos.': ['请上传1–8张照片。', 'กรุณาอัปโหลดรูปถ่าย 1–8 รูป', '請上傳1–8張照片。'],
    'No bathtub was found in any of the uploaded photos. Try a clearer shot with the tub filling more of the frame, or better lighting.': ['上传的照片里都没有侦测到浴缸。请试试让浴缸占满画面、或加强照明后重拍。', 'ไม่พบอ่างอาบน้ำในรูปถ่ายที่อัปโหลด ลองถ่ายให้อ่างเต็มเฟรมมากขึ้น หรือเพิ่มแสงให้ชัดเจนขึ้น', '上傳的照片裡都沒有偵測到浴缸。請試試讓浴缸佔滿畫面、或加強照明後重拍。'],
    'Too many attempts from this network in a short time — please wait a few minutes and try again.': ['同一网路短时间内尝试次数过多——请稍候几分钟再试。', 'มีการพยายามจากเครือข่ายนี้มากเกินไปในเวลาอันสั้น — กรุณารอสักครู่แล้วลองใหม่', '同一網路短時間內嘗試次數過多——請稍候幾分鐘再試。'],
    '⚠ Model reconstructed but failed to load into the editor': ['⚠ 模型已重建，但载入编辑器失败', '⚠ สร้างโมเดลสำเร็จ แต่โหลดเข้าตัวแก้ไขไม่สำเร็จ', '⚠ 模型已重建，但載入編輯器失敗'],
    '✓ Model generated ({elapsed}s)': ['✓ 模型已产生({elapsed}秒)', '✓ สร้างโมเดลสำเร็จ ({elapsed} วินาที)', '✓ 模型已產生({elapsed}秒)'],
    'Proportional model — default length 1.7m ({L}×{W}mm shown). This is <b>not a measurement</b> — use the Length/Width sliders below to set the real dimensions.': ['比例模型——预设长度1.7米(显示为{L}×{W}mm)。这<b>不是量测结果</b>——请用下方长度/宽度滑杆设定实际尺寸。', 'โมเดลตามสัดส่วน — ความยาวเริ่มต้น 1.7 ม. (แสดง {L}×{W}มม.) นี่<b>ไม่ใช่ผลการวัด</b> — ใช้สไลเดอร์ความยาว/ความกว้างด้านล่างเพื่อกำหนดขนาดจริง', '比例模型——預設長度1.7米(顯示為{L}×{W}mm)。這<b>不是量測結果</b>——請用下方長度/寬度滑桿設定實際尺寸。'],
    'Angle quality was too limited for a reliable shape/size estimate — only a rough outline could be produced. Consider a more top-down photo, or use the 4-point perspective tool below.': ['照片角度品质不足以可靠估计形状/尺寸——只能产生粗略外形。建议补拍更俯视的角度，或使用下方的4点透视校正工具。', 'คุณภาพมุมถ่ายภาพไม่เพียงพอสำหรับการประมาณรูปทรง/ขนาดที่น่าเชื่อถือ — สร้างได้เพียงโครงร่างคร่าวๆ ลองถ่ายมุมที่มองจากด้านบนมากขึ้น หรือใช้เครื่องมือแก้ไขมุมมอง 4 จุดด้านล่าง', '照片角度品質不足以可靠估計形狀/尺寸——只能產生粗略外形。建議補拍更俯視的角度，或使用下方的4點透視校正工具。'],
    '⚠ Please manually confirm: <b>{fields}</b> (low confidence).': ['⚠ 请人工确认：<b>{fields}</b>(低信心)。', '⚠ กรุณายืนยันด้วยตนเอง: <b>{fields}</b> (ความเชื่อมั่นต่ำ)', '⚠ 請人工確認：<b>{fields}</b>(低信心)。'],
    '⚠ More than one bathtub-like shape was seen in {photoWord} — the largest was used. If that\'s wrong, re-photograph the target tub on its own.': ['⚠ {photoWord}里看到不只一个像浴缸的形状——已采用最大的那个。如果判断错误，请单独重拍目标浴缸。', 'พบรูปทรงคล้ายอ่างอาบน้ำมากกว่าหนึ่งรูปทรงใน{photoWord} — ใช้รูปทรงที่ใหญ่ที่สุด หากไม่ถูกต้อง กรุณาถ่ายอ่างเป้าหมายใหม่แยกต่างหาก', '⚠ {photoWord}裡看到不只一個像浴缸的形狀——已採用最大的那個。如果判斷錯誤，請單獨重拍目標浴缸。'],
    'a photo': ['一张照片', 'รูปหนึ่งรูป', '一張照片'],
    'some photos': ['部分照片', 'บางรูป', '部分照片'],
    'Pipeline notes ({n}) — click to expand': ['管线记录({n})——点击展开', 'บันทึกไพพ์ไลน์ ({n}) — คลิกเพื่อขยาย', '管線記錄({n})——點擊展開'],
  };
  // p2tT(key, vars)：跟共用t()同一套LANG查表邏輯，差別是多一個vars參數做{placeholder}取代
  function p2tT(key, vars){
    let s = (typeof LANG !== 'undefined' && LANG !== 'en')
      ? (P2T_I18N[key] ? P2T_I18N[key][LANG === 'zhS' ? 0 : (LANG === 'th' ? 1 : 2)] : key)
      : key;
    if(vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp('\\{'+k+'\\}', 'g'), vars[k]); });
    return s;
  }

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
    return `<details id="p2tDetails"><summary>${p2tT('Pipeline notes ({n}) — click to expand', {n:messages.length})}</summary><ul>${items}</ul></details>`;
  }

  // Phase 8佇列項8：照片張數→預期精度提示(規格書UX節)。純張數門檻(client端沒有上傳前的角度推斷能力，
  // 規格原文「可推斷的視角組成」是選配，這裡誠實只做張數這個可靠訊號)，跟Stage 1.5已上線的
  // 「人機分工」低信心標註是同一溝通方向的互補：那個是分析完事後標，這個是選片當下先設預期。
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
      showBanner('err', p2tT('⚠ Too many photos ({n})', {n:list.length}), p2tT('Please select at most {max} photos.', {max:P2T_MAX_PHOTOS}));
      return;
    }
    if(list.length < P2T_MIN_PHOTOS){
      showBanner('warn', p2tT('⚠ Only {n} photo(s) selected', {n:list.length}),
        `${p2tT('{min}–{max} photos from different angles works best — continuing anyway with what you gave me.', {min:P2T_MIN_PHOTOS, max:P2T_MAX_PHOTOS})} ${photoCountHint(list.length)}`);
    } else {
      showBanner('progress', p2tT('Uploading & processing…'), `${photoCountHint(list.length)} ${p2tT('Usually 30–90 seconds. First run after idle time (cold start) can take 2–3 minutes — please don\'t close this tab.')}`);
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
      showBanner('err', p2tT('⚠ Could not reach the reconstruction service'),
        p2tT('Network/CORS error — is the API endpoint reachable? ({err}). This is expected if the local test API isn\'t running, or before P3-M2 cloud deploy.', {err:err.message}));
      return;
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

    if(!resp.ok){
      const detail = data && data.detail;
      const msgs = (detail && detail.messages) || [];
      let reason = p2tT('The pipeline could not produce a model from these photos.');
      if(resp.status === 401) reason = p2tT('Authentication failed (bad API token) — this is a test-page config issue, not a photo problem.');
      else if(resp.status === 400) reason = (detail && detail.detail) || p2tT('Please upload 1–8 photos.');
      else if(resp.status === 422) reason = p2tT('No bathtub was found in any of the uploaded photos. Try a clearer shot with the tub filling more of the frame, or better lighting.');
      else if(resp.status === 429) reason = p2tT('Too many attempts from this network in a short time — please wait a few minutes and try again.');
      showBanner('err', '⚠ ' + reason, msgs.length ? '' : `(${resp.status}, ${elapsed}s)`, messagesToDetailsHtml(msgs));
      return;
    }

    // 成功：載入spec JSON進3D編輯器(跟⬆ Upload CAD File按鈕走同一個函式)
    try {
      importSpecJSON(JSON.stringify(data.spec));
    } catch(err){
      showBanner('err', p2tT('⚠ Model reconstructed but failed to load into the editor'), err.message);
      return;
    }

    const dp = data.spec['設計參數'] || {};
    const dimsMode = data.spec['dims_mode'];
    let title = p2tT('✓ Model generated ({elapsed}s)', {elapsed});
    let sub = '';
    if(dimsMode === 'proportional_default'){
      sub = p2tT('Proportional model — default length 1.7m ({L}×{W}mm shown). This is <b>not a measurement</b> — use the Length/Width sliders below to set the real dimensions.',
        {L:dp['外部長度_mm'], W:dp['外部寬度_mm']});
    } else if(!dimsMode){
      sub = p2tT('Angle quality was too limited for a reliable shape/size estimate — only a rough outline could be produced. Consider a more top-down photo, or use the 4-point perspective tool below.');
    }
    const lowConf = Object.entries(data.spec['field_confidence'] || {}).filter(([k,v])=>v==='low').map(([k])=>k);
    if(lowConf.length){
      sub += (sub?'<br>':'') + p2tT('⚠ Please manually confirm: <b>{fields}</b> (low confidence).', {fields:lowConf.join(', ')});
    }
    const multiBoxMsgs = (data.messages || []).filter(m => /個候選框/.test(m));
    if(multiBoxMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ More than one bathtub-like shape was seen in {photoWord} — the largest was used. If that\'s wrong, re-photograph the target tub on its own.',
        {photoWord: p2tT(multiBoxMsgs.length===1 ? 'a photo' : 'some photos')});
    }
    showBanner('ok', title, sub, messagesToDetailsHtml(data.messages));
  }

  document.getElementById('photo2tubFiles').addEventListener('change', (e)=>{
    handlePhotoUpload(e.target.files);
    e.target.value = '';
  });
})();
