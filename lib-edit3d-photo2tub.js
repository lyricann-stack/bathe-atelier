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
  let p2tLastData = null; // 招1(2026-08-23)：暫存最近一次成功reconstruct的完整回應，供追問卡片patch用

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
    // 非同步輪詢API(2026-08-27，b8核准設計)新增——四階段進度提示+expired終端狀態。
    'In queue…': ['排队中…', 'อยู่ในคิว…', '排隊中…'],
    'Analyzing photos…': ['分析照片中…', 'กำลังวิเคราะห์รูปถ่าย…', '分析照片中…'],
    'Computing shape…': ['计算造型中…', 'กำลังคำนวณรูปทรง…', '計算造型中…'],
    'This took too long and the job expired — please try uploading again.': ['处理时间过长，工作已过期——请重新上传再试一次。', 'ใช้เวลานานเกินไปและงานหมดอายุ — กรุณาอัปโหลดใหม่อีกครั้ง', '處理時間過長，工作已過期——請重新上傳再試一次。'],
    // 文案審視backlog修正(2026-08-22，08裁定「處理掉」)："P3-M2 cloud deploy"是2026-08-20已完成的
    // 部署事件，原文案寫給開發期參考、雲端deploy完成後讀起來反而像還沒deploy，永久性過時(不會隨時間
    // 變回準確)，這次直接改寫英文原文+三語同步，不只是翻譯留債。
    'Network/CORS error — is the API endpoint reachable? ({err}). This can happen during a temporary connectivity issue, or if you\'re testing against a local API that isn\'t running.': ['网路/CORS错误——API端点可以连线吗？({err})。可能是暂时的连线问题，或你正在测试一个没有运行的本机API。', 'ข้อผิดพลาดเครือข่าย/CORS — เข้าถึง API endpoint ได้หรือไม่ ({err}) อาจเกิดจากปัญหาการเชื่อมต่อชั่วคราว หรือกำลังทดสอบกับ API ในเครื่องที่ยังไม่ได้รัน', '網路/CORS錯誤——API端點可以連線嗎？({err})。可能是暫時的連線問題，或你正在測試一個沒有運行的本機API。'],
    'The pipeline could not produce a model from these photos.': ['管线无法从这些照片产生模型。', 'ไพพ์ไลน์ไม่สามารถสร้างโมเดลจากรูปถ่ายเหล่านี้ได้', '管線無法從這些照片產生模型。'],
    // 文案審視backlog修正：「test-page config issue」在pro.html(正式頁)出現不合適(不是測試頁)，
    // 這裡(共用檔，pro.html在用)改成不提「測試頁」的通用版本；photo2tub-app.html自己那份inline拷貝
    // 真的是測試頁，維持原文案不變(兩邊故意分流，不是漏改)。
    'Authentication failed (bad API token) — this is a site configuration issue, not a problem with your photo.': ['认证失败(API token错误)——这是网站设定问题，不是照片本身的问题。', 'การยืนยันตัวตนล้มเหลว (API token ไม่ถูกต้อง) — เป็นปัญหาการตั้งค่าเว็บไซต์ ไม่ใช่ปัญหารูปถ่าย', '認證失敗(API token錯誤)——這是網站設定問題，不是照片本身的問題。'],
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
    // R3聯合擬合第一層(輸入品質)擋下時的升級警示(2026-08-23，08裁定「訊息層修法」)：
    // R3判定「照片數/角度多樣性不足」是已經算好的訊號，原本擋完R3就丟掉，這裡接到既有
    // dims低信心路徑，給使用者更明確的補救方向(而不是只列"dims(低信心)"這種不知道要做
    // 什麼的提示)。偵測依據：`[R3]`訊息裡的too_few_photos/low_diversity字樣(見
    // r3_joint_fit.py的status/reason設計，跟multiBoxMsgs同一種"從data.messages篩關鍵字"手法。
    '⚠ Not enough photos or angle variety for the joint shape fit — the size/shape estimate may be unreliable. Please manually enter the actual dimensions, or retake photos from different angles and try again.': ['⚠ 照片数量或角度多样性不足，无法进行联合形状拟合——尺寸/形状估计可能不可靠。请手动输入实际尺寸，或补拍不同角度的照片后重试。', '⚠ จำนวนรูปถ่ายหรือความหลากหลายของมุมไม่เพียงพอสำหรับการปรับรูปทรงร่วม — การประมาณขนาด/รูปทรงอาจไม่น่าเชื่อถือ กรุณากรอกขนาดจริงด้วยตนเอง หรือถ่ายภาพจากมุมต่างๆ ใหม่แล้วลองอีกครั้ง', '⚠ 照片數量或角度多樣性不足，無法進行聯合形狀擬合——尺寸/形狀估計可能不可靠。請手動輸入實際尺寸，或補拍不同角度的照片後重試。'],
    // 遮罩抗干擾修正招A(2026-08-23，遮罩抗干擾修正_規格書.md)：R3有嘗試聯合擬合(輸入品質過關)
    // 但殘差太差(low_iou)被自己拒絕——這跟上面「照片不足」是不同情境(這裡是"拍夠了但畫面有
    // 干擾"，不是"沒拍夠")，故意用不同文案，不誤導使用者去補拍更多張(治標方向錯了，真正該做的
    // 是避開玻璃反光/遮擋物)。偵測依據：後端`[R3-低擬合品質]`標籤(photo2tub_api_core.py)。
    // 08審後補充(2026-08-23)：ADP_Glacier夾具案例的比例誤差達38.8%，顯示緣角點量測的長寬比
    // 在這種案例上也不是安全假設(粗粒度不代表完全免疫)，文案補上「尺寸比例也可能受影響」的
    // 提醒，不只警告外形——招1既有Q1(長度)追問卡剛好能讓使用者直接修正，動線是通的。
    '⚠ The joint shape fit could not find a reliable match for this photo set — the traced outline may be distorted by glass reflections or obstructions in the scene, so a standard shape was used instead. The length/width ratio may also be affected, not just the outline — please manually confirm both the shape and dimensions, or retake photos avoiding glass/reflective surfaces.': ['⚠ 联合形状拟合找不到任何能合理解释这批照片的浴缸形状——描出的轮廓可能受画面中玻璃反光或遮挡物干扰而失真，已改用标准造型。长宽比例也可能一并受影响，不只是外形——请人工确认造型与尺寸是否正确，或补拍避开反光/遮挡的清晰照片。', '⚠ การปรับรูปทรงร่วมไม่พบรูปทรงอ่างอาบน้ำที่อธิบายชุดภาพนี้ได้อย่างน่าเชื่อถือ — โครงร่างที่ลากไว้อาจผิดเพี้ยนจากแสงสะท้อนกระจกหรือสิ่งกีดขวางในภาพ จึงใช้รูปทรงมาตรฐานแทน อัตราส่วนความยาว/ความกว้างอาจได้รับผลกระทบไปด้วย ไม่ใช่แค่รูปทรง กรุณายืนยันทั้งรูปทรงและขนาดด้วยตนเอง หรือถ่ายภาพใหม่โดยหลีกเลี่ยงกระจก/พื้นผิวสะท้อนแสง', '⚠ 聯合形狀擬合找不到任何能合理解釋這批照片的浴缸形狀——描出的輪廓可能受畫面中玻璃反光或遮擋物干擾而失真，已改用標準造型。長寬比例也可能一併受影響，不只是外形——請人工確認造型與尺寸是否正確，或補拍避開反光/遮擋的清晰照片。'],
    // degraded靜默缺口修法(2026-08-26，54裁定「degraded靜默」票的前端半)：緊急煞車逾時
    // (photo2tub_api_core.py的`no_family_fit_completed`+`degraded=True`)是「系統這次忙、
    // 不是照片的問題」，跟上面兩種「照片本身有問題」的情境刻意用不同文案——不建議人工輸入
    // 尺寸(那是治標，治本是重試)，而是直接建議稍後重新上傳同一批照片。偵測依據：後端訊息裡
    // 的`no_family_fit_completed`字樣(見photo2tub_api_core.py的訊息分流)。
    '⚠ The joint shape fit could not finish within the time limit — the server was briefly overloaded, not a problem with your photos. The result shown uses a simpler fallback method instead; try re-uploading the same photos again in a minute or two for a more accurate multi-angle estimate.': ['⚠ 联合形状拟合这次没能在时限内跑完——服务器暂时负载过高，不是照片本身的问题，已改用较简单的备用方法呈现结果。建议稍后重新上传同一批照片，通常能拿到更准确的多角度估计。', '⚠ การปรับรูปทรงร่วมไม่สามารถเสร็จสิ้นภายในเวลาที่กำหนด — เซิร์ฟเวอร์มีภาระงานสูงชั่วคราว ไม่ใช่ปัญหาของรูปถ่ายของคุณ ระบบจึงแสดงผลด้วยวิธีสำรองที่ง่ายกว่าแทน ลองอัปโหลดรูปถ่ายชุดเดิมอีกครั้งในอีกสักครู่เพื่อผลลัพธ์ที่แม่นยำกว่า', '⚠ 聯合形狀擬合這次沒能在時限內跑完——伺服器暫時負載過高，不是照片本身的問題，已改用較簡單的備用方法呈現結果。建議稍後重新上傳同一批照片，通常能拿到更準確的多角度估計。'],
    // Pipeline訊息i18n第二批(2026-08-27，54核准設計，見測試案例/pipeline訊息i18n_文案審稿.md)：
    // 比例精度票(wl_ratio掃描段)7條+degraded分流票剩餘2條(low_iou/通用fallback)，都仿上面
    // 既有訊息的手寫摘要風格，不是逐字翻譯後端log。{x}/{w}/{lo}/{hi}由呼叫端從後端中文訊息
    // 正則抽取後代入，不是後端直接吐出的結構化欄位。
    '⚠ Different photos measured different width/length ratios (up to {x}× apart) — the joint fit still gives a number, but treat the width with extra caution. Consider adding a clean top-down photo.': ['⚠ 各张照片单独量到的宽长比不一致(最大差到{x}倍)——系统仍会给出一个宽度数字，但这个数字的把握程度较低，建议人工核对，或补一张正俯视角照片。', 'อัตราส่วนกว้าง/ยาวที่วัดได้จากแต่ละรูปไม่ตรงกัน (ต่างกันสูงสุดถึง {x} เท่า) — ระบบยังคำนวณค่าความกว้างให้ แต่ความน่าเชื่อถือของตัวเลขนี้ค่อนข้างต่ำ แนะนำให้ตรวจสอบด้วยตนเอง หรือเพิ่มรูปถ่ายมุมมองจากด้านบนที่ชัดเจน', '⚠ 各張照片單獨量到的寬長比不一致(最大差到{x}倍)——系統仍會給出一個寬度數字，但這個數字的把握程度較低，建議人工核對，或補一張正俯視角照片。'],
    '⚠ The environment was unusually slow, so the width refinement scan was skipped to stay within the processing time limit — the width shown uses the earlier estimate unchanged. This isn\'t normal behavior; try again later.': ['⚠ 这次环境耗时异常久，为避免超出处理时限，已跳过宽度精算扫描——显示的宽度维持先前的估计值不变。这不是正常状况，建议稍后重新上传再试一次。', 'ระบบใช้เวลาประมวลผลนานผิดปกติในครั้งนี้ จึงข้ามขั้นตอนคำนวณความกว้างแบบละเอียดเพื่อไม่ให้เกินเวลาที่กำหนด — ค่าความกว้างที่แสดงยังคงเป็นค่าประมาณการก่อนหน้า ซึ่งไม่ใช่สถานการณ์ปกติ แนะนำให้ลองอัปโหลดใหม่อีกครั้งในภายหลัง', '⚠ 這次環境耗時異常久，為避免超出處理時限，已跳過寬度精算掃描——顯示的寬度維持先前的估計值不變。這不是正常狀況，建議稍後重新上傳再試一次。'],
    'The width estimate was refined after a closer scan of the joint fit — updated to {w}mm.': ['系统对宽度做了进一步的精算扫描，找到比原本更准确的落点——已更新宽度为{w}mm。', 'ระบบทำการสแกนคำนวณความกว้างอย่างละเอียดเพิ่มเติม พบค่าที่แม่นยำกว่าค่าเดิม — อัปเดตความกว้างเป็น {w} มม. แล้ว', '系統對寬度做了進一步的精算掃描，找到比原本更準確的落點——已更新寬度為{w}mm。'],
    '⚠ These photos don\'t provide enough evidence to pin down an exact width — the {w}mm shown is only the midpoint of the scanned range, not a reliable number. Please enter the actual width manually, or add a clean top-down photo.': ['⚠ 这批照片的证据量不足以判定精确宽度——显示的{w}mm只是扫描范围的中点，不是可信数字。建议人工输入实际宽度，或补一张正俯视角照片。', 'ชุดรูปถ่ายนี้มีหลักฐานไม่เพียงพอที่จะระบุความกว้างที่แม่นยำ — ค่า {w} มม. ที่แสดงเป็นเพียงจุดกึ่งกลางของช่วงที่สแกน ไม่ใช่ตัวเลขที่เชื่อถือได้ แนะนำให้กรอกความกว้างจริงด้วยตนเอง หรือเพิ่มรูปถ่ายมุมมองจากด้านบนที่ชัดเจน', '⚠ 這批照片的證據量不足以判定精確寬度——顯示的{w}mm只是掃描範圍的中點，不是可信數字。建議人工輸入實際寬度，或補一張正俯視角照片。'],
    '⚠ These photos only support a width range, not an exact number: {lo}–{hi}mm (the {w}mm shown is the midpoint, not a confident answer). Please confirm manually, or add a clean top-down photo, or enter the actual width.': ['⚠ 这批照片的证据只能框出一个宽度范围：{lo}~{hi}mm(显示的{w}mm是范围中点，不是高信心答案)。建议人工核对，或补一张正俯视角照片，或直接输入实际宽度。', 'หลักฐานจากชุดรูปถ่ายนี้ระบุได้เพียงช่วงความกว้าง: {lo}–{hi} มม. (ค่า {w} มม. ที่แสดงเป็นจุดกึ่งกลางของช่วง ไม่ใช่คำตอบที่มั่นใจสูง) แนะนำให้ตรวจสอบด้วยตนเอง หรือเพิ่มรูปถ่ายมุมมองจากด้านบนที่ชัดเจน หรือกรอกความกว้างจริงโดยตรง', '⚠ 這批照片的證據只能框出一個寬度範圍：{lo}~{hi}mm(顯示的{w}mm是範圍中點，不是高信心答案)。建議人工核對，或補一張正俯視角照片，或直接輸入實際寬度。'],
    '⚠ The width evidence from these photos falls outside the scanned range even after extending it — width could not be determined. The {w}mm shown is not reliable; please enter the actual width manually.': ['⚠ 这批照片的宽度证据落在扫描范围外，即使扩大范围后仍量不出边界——无法判定宽度。显示的{w}mm不可信，建议直接人工输入实际宽度。', 'หลักฐานความกว้างจากชุดรูปถ่ายนี้อยู่นอกช่วงที่สแกน แม้จะขยายช่วงแล้วก็ยังหาขอบเขตไม่ได้ — ไม่สามารถระบุความกว้างได้ ค่า {w} มม. ที่แสดงไม่น่าเชื่อถือ แนะนำให้กรอกความกว้างจริงด้วยตนเองโดยตรง', '⚠ 這批照片的寬度證據落在掃描範圍外，即使擴大範圍後仍量不出邊界——無法判定寬度。顯示的{w}mm不可信，建議直接人工輸入實際寬度。'],
    '⚠ The width refinement scan hit an unexpected error — the width shown keeps the earlier estimate unchanged.': ['⚠ 宽度精算扫描过程发生非预期错误——显示的宽度维持先前的估计值不变。', 'เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสแกนคำนวณความกว้างอย่างละเอียด — ค่าความกว้างที่แสดงยังคงเป็นค่าประมาณการก่อนหน้า', '⚠ 寬度精算掃描過程發生非預期錯誤——顯示的寬度維持先前的估計值不變。'],
    '⚠ The multi-photo joint fit couldn\'t find a good match for this photo set (fit residual too high) — falling back to the existing single/limited-angle method. The outline may be affected by glare or obstructions in the photos; try again with cleaner, unobstructed shots.': ['⚠ 多照片联合拟合这次没能找到够好的匹配(拟合残差过大)——已改用既有的单张/有限角度估计方式。轮廓可能受画面反光或遮挡物影响，建议换一批背景干净、没有遮挡的照片重新上传。', 'การประมวลผลรูปทรงร่วมจากหลายรูปถ่ายไม่พบผลลัพธ์ที่แม่นยำเพียงพอในครั้งนี้ (ค่าความคลาดเคลื่อนสูงเกินไป) — ระบบจึงใช้วิธีประมาณการแบบมุมเดียว/มุมจำกัดแทน รูปทรงที่ได้อาจได้รับผลกระทบจากแสงสะท้อนหรือสิ่งกีดขวางในภาพ แนะนำให้ถ่ายรูปใหม่โดยพื้นหลังชัดเจนไม่มีสิ่งกีดขวาง', '⚠ 多照片聯合擬合這次沒能找到夠好的匹配(擬合殘差過大)——已改用既有的單張/有限角度估計方式。輪廓可能受畫面反光或遮擋物影響，建議換一批背景乾淨、沒有遮擋的照片重新上傳。'],
    'The multi-photo joint fit wasn\'t used this time — falling back to the existing estimation method.': ['多照片联合拟合这次未被采用——已改用既有的估计方式。', 'การประมวลผลรูปทรงร่วมจากหลายรูปถ่ายไม่ได้ถูกใช้ในครั้งนี้ — ระบบใช้วิธีประมาณการแบบเดิมแทน', '多照片聯合擬合這次未被採用——已改用既有的估計方式。'],
    // 單照片救援包招1(2026-08-23，Lyric拍板1b)：R3因照片不足被擋下時，除了上面那句升級警示，
    // 再補3題快問快答當約束，答案直接patch data.spec後重新importSpecJSON()，純前端不動後端。
    'A few quick questions can improve the estimate (optional — skip any you\'re not sure about):': ['几个简单问题可以改善估计(可选——不确定的可以跳过)：', 'คำถามสั้นๆ ช่วยปรับปรุงการประมาณ (ไม่บังคับ — ข้ามข้อที่ไม่แน่ใจได้)：', '幾個簡單問題可以改善估計(可選——不確定的可以跳過)：'],
    'About how long is it (external length)? You can fine-tune with the slider below afterward.': ['大概的外部长度是多少？之后还能用下面滑杆微调。', 'ความยาวภายนอกโดยประมาณเท่าไหร่? ปรับละเอียดได้ภายหลังด้วยสไลเดอร์ด้านล่าง', '大概的外部長度是多少？之後還能用下面滑桿微調。'],
    'Under 1400mm': ['小于1400mm', 'ต่ำกว่า 1400มม.', '小於1400mm'],
    '1400–1600mm': ['1400–1600mm', '1400–1600มม.', '1400–1600mm'],
    '1600–1800mm (most common)': ['1600–1800mm(最常见)', '1600–1800มม. (พบบ่อยที่สุด)', '1600–1800mm(最常見)'],
    '1800mm or more': ['1800mm以上', '1800มม. ขึ้นไป', '1800mm以上'],
    'Not sure — use default': ['不确定，先用预设值', 'ไม่แน่ใจ — ใช้ค่าเริ่มต้น', '不確定，先用預設值'],
    'Is this tub symmetric at both ends?': ['这款浴缸两端造型对称吗？', 'อ่างนี้สมมาตรทั้งสองด้านหรือไม่?', '這款浴缸兩端造型對稱嗎？'],
    'Symmetric (both ends alike)': ['对称(两端一样)', 'สมมาตร (ทั้งสองด้านเหมือนกัน)', '對稱(兩端一樣)'],
    'Asymmetric (one end noticeably narrower, egg-shaped)': ['不对称(一端明显比较窄，像蛋形)', 'ไม่สมมาตร (ปลายด้านหนึ่งแคบกว่าอย่างเห็นได้ชัด คล้ายรูปไข่)', '不對稱(一端明顯比較窄，像蛋形)'],
    'Not sure': ['不确定', 'ไม่แน่ใจ', '不確定'],
    'Looking from above, is the base much narrower than the rim?': ['由上往下看，缸底是不是比缸口窄很多？', 'เมื่อมองจากด้านบน ฐานแคบกว่าขอบมากหรือไม่?', '由上往下看，缸底是不是比缸口窄很多？'],
    'Nearly vertical (base ≈ rim width)': ['几乎垂直(缸底缸口差不多宽)', 'เกือบตั้งตรง (ฐานกว้างใกล้เคียงขอบ)', '幾乎垂直(缸底缸口差不多寬)'],
    'Tapers inward a lot (base much narrower, like a flowerpot)': ['有明显往内收(缸底窄很多，像花盆)', 'สอบเข้าด้านในมาก (ฐานแคบกว่ามาก คล้ายกระถางต้นไม้)', '有明顯往內收(缸底窄很多，像花盆)'],
    // H比例直算估計器(2026-08-24，Lyric親自指定方法)：無可用正交側視照片時高度沿用580mm預設，
    // 這裡補第4題讓使用者手動估計——跟Q1(長度)同一種"快問快答+可再用滑桿微調"設計，觸發條件
    // 獨立於Q1-3(too_few_photos/low_diversity)：只看後端spec的H_source==='default_no_side_view'，
    // 見handlePhotoUpload()裡的heightDefaulted判斷。
    'About how tall is it, measured from the floor to the rim? You can fine-tune with the slider below afterward.': ['大概的整体高度(从地面到缸口)是多少？之后还能用下面滑杆微调。', 'ความสูงโดยประมาณเท่าไหร่ (จากพื้นถึงขอบอ่าง)? ปรับละเอียดได้ภายหลังด้วยสไลเดอร์ด้านล่าง', '大概的整體高度(從地面到缸口)是多少？之後還能用下面滑桿微調。'],
    'Under 550mm': ['小于550mm', 'ต่ำกว่า 550มม.', '小於550mm'],
    '550–650mm (most common)': ['550–650mm(最常见)', '550–650มม. (พบบ่อยที่สุด)', '550–650mm(最常見)'],
    '650–750mm': ['650–750mm', '650–750มม.', '650–750mm'],
    '750mm or more': ['750mm以上', '750มม. ขึ้นไป', '750mm以上'],
    '✓ Got it — updated: {field}': ['✓ 已记录，已更新：{field}', '✓ รับทราบ — อัปเดตแล้ว: {field}', '✓ 已記錄，已更新：{field}'],
    '✓ Got it (kept the automatic estimate)': ['✓ 已记录(维持自动估计值)', '✓ รับทราบ (คงค่าประมาณอัตโนมัติไว้)', '✓ 已記錄(維持自動估計值)'],
    'external length/width (your estimate)': ['外部长宽(你的估计)', 'ความยาว/ความกว้างภายนอก (ค่าประมาณของคุณ)', '外部長寬(你的估計)'],
    'symmetry (confirmed symmetric)': ['对称性(已确认对称)', 'ความสมมาตร (ยืนยันสมมาตรแล้ว)', '對稱性(已確認對稱)'],
    'base taper (confirmed nearly vertical)': ['底部收缩(已确认接近直壁)', 'ความสอบของฐาน (ยืนยันเกือบตั้งตรงแล้ว)', '底部收縮(已確認接近直壁)'],
    'height (your estimate)': ['高度(你的估计)', 'ความสูง (ค่าประมาณของคุณ)', '高度(你的估計)'],
    // 招2「型錄檢索借參數」建議式借用UI(2026-08-23，Lyric裁定的安全轉向：單照片/ambiguous情境
    // 一律「建議+使用者確認」，不自動套用——見scripts/m6_catalog_match.py的三條安全紅線)。
    'We found a similar shape in our catalog — want to try it?': ['我们在型录里找到相似的造型——要套用看看吗？', 'เราพบรูปทรงที่คล้ายกันในแคตตาล็อกของเรา — ต้องการลองใช้ไหม?', '我們在型錄裡找到相似的造型——要套用看看嗎？'],
    // v1安全裁定(2026-08-23)：would_be_auto案例(N≥2+confident+不ambiguous)用語氣更肯定的文案，
    // 但套用動作仍要使用者手動點擊——見scripts/m6_catalog_match.py的AUTO_MODE_ENABLED說明。
    'Multiple photos closely match a shape in our catalog — want to apply it?': ['多张照片高度吻合型录里的一个造型——要套用看看吗？', 'รูปถ่ายหลายรูปตรงกับรูปทรงในแคตตาล็อกของเรามาก — ต้องการใช้ไหม?', '多張照片高度吻合型錄裡的一個造型——要套用看看嗎？'],
    'This only borrows the shape (no product name/brand is used or shown) — preview it before deciding.': ['这只是借用造型(不使用/不显示任何产品名称或品牌)——先预览再决定。', 'นี่เป็นการยืมเฉพาะรูปทรง (ไม่ใช้/ไม่แสดงชื่อผลิตภัณฑ์หรือแบรนด์ใดๆ) — ดูตัวอย่างก่อนตัดสินใจ', '這只是借用造型(不使用/不顯示任何產品名稱或品牌)——先預覽再決定。'],
    '👁 Preview': ['👁 预览', '👁 ดูตัวอย่าง', '👁 預覽'],
    '✓ Use this shape': ['✓ 套用这个造型', '✓ ใช้รูปทรงนี้', '✓ 套用這個造型'],
    'Not this one': ['不是这个', 'ไม่ใช่อันนี้', '不是這個'],
    '↺ Back to my photo result': ['↺ 还原成我的照片结果', '↺ กลับไปที่ผลลัพธ์จากรูปถ่ายของฉัน', '↺ 還原成我的照片結果'],
    'Previewing the suggested catalog shape (not applied yet).': ['正在预览建议的型录造型(尚未套用)。', 'กำลังดูตัวอย่างรูปทรงจากแคตตาล็อกที่แนะนำ (ยังไม่ได้ใช้)', '正在預覽建議的型錄造型(尚未套用)。'],
    '✓ Applied a similar catalog shape (no product name used) — you can undo this anytime to return to the state right before it was applied.': ['✓ 已套用型录里的相似造型(未使用任何产品名称)——随时可以撤销，还原为套用前的状态。', '✓ ใช้รูปทรงที่คล้ายกันจากแคตตาล็อกแล้ว (ไม่ใช้ชื่อผลิตภัณฑ์ใดๆ) — สามารถยกเลิกได้ทุกเมื่อเพื่อกลับไปยังสถานะก่อนใช้งาน', '✓ 已套用型錄裡的相似造型(未使用任何產品名稱)——隨時可以撤銷，還原為套用前的狀態。'],
    'Undo': ['撤销', 'ยกเลิก', '撤銷'],
  };

  // field_confidence欄位代號→人話標籤(2026-09-01，WP-W信心宣稱修法第①輪；英文標籤2026-09-01
  // 部署前補上，見校準集/WPW_預登記_bathe-atelier文案讀者清單_20260901.md)：填補{fields}變數
  // 本身完全沒有i18n的洞——p2tT()只翻譯句子模板，{fields}是翻完後才字面代入，過去客戶不管
  // 切哪個語言(含英文)看到的都是英文欄位代號本身(shape_code/egg_pct等)。用詞優先沿用
  // P2T_I18N既有137條裡出現過的概念(英文：shape/symmetry/base taper/external length-width/
  // height；中文：造型/對稱性/收縮/長寬/高度)，查不到才新譯——標記於下方註解。**泰文全部
  // 未經母語者校對**，dH/side_profile/wall_r/rim_mod四條(中英文皆)也是新譯(無既有precedent)，
  // 部署前必須先經人工核對(見預登記文件)。陣列順序[en, zhS, th, zhT]。
  const P2T_FIELD_LABEL = {
    shape_code:   ['shape', '造型', 'รูปทรง', '造型'],                                              // 沿用既有(en:「a similar shape in our catalog」等多處；中/泰同前)
    egg_pct:      ['symmetry', '对称性', 'ความสมมาตร', '對稱性'],                                     // 沿用既有(en:「symmetry (confirmed symmetric)」)
    taper_pct:    ['base taper', '底部收缩', 'ความสอบของฐาน', '底部收縮'],                             // 沿用既有(en:「base taper (confirmed nearly vertical)」)
    dims:         ['external length/width', '外部长宽', 'ความยาว/ความกว้างภายนอก', '外部長寬'],       // 沿用既有(en:「external length/width (your estimate)」)
    H_mm:         ['height', '整体高度', 'ความสูงโดยรวม', '整體高度'],                                 // en沿用既有「height (your estimate)」；中文沿用既有「整體高度」，泰文由既有詞根組合(非逐字既有句)
    dH:           ['backrest rise', '靠背增高', 'ความสูงพนักพิง', '靠背增高'],                         // 新譯，無precedent，中文取自後端欄位名「靠背增高判讀」
    side_profile: ['side wall curve', '侧壁曲线', 'เส้นโค้งผนังด้านข้าง', '側壁曲線'],                  // 新譯，無precedent
    wall_r:       ['wall corner radius', '缸壁圆角', 'รัศมีมุมผนังอ่าง', '缸壁圓角'],                   // 新譯，無precedent
    rim_mod:      ['rim contour', '缸缘起伏', 'ความลาดของขอบอ่าง', '缸緣起伏'],                        // 新譯，無precedent
  };
  function p2tFieldLabel(k){
    const entry = P2T_FIELD_LABEL[k];
    if(!entry) return k; // 查不到就退回原始英文代號(不是隱藏)，符合這個repo「寧可露代號也不隱藏警告」的既有精神
    if(typeof LANG === 'undefined' || LANG === 'en') return entry[0];
    return entry[LANG === 'zhS' ? 1 : (LANG === 'th' ? 2 : 3)];
  }
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

  // ===== 單照片救援包招1(2026-08-23，規格書§1)：R3因照片不足被擋下時的3題快問快答 =====
  // 純前端spec後製patch——不呼叫新API、不改Modal後端。答案覆寫data.spec['設計參數']對應欄位後
  // 重新importSpecJSON()。Q2答「不對稱」/Q3答「有明顯往內收」刻意不覆寫數值(維持既有估計，
  // 規格書§1.3明列這是實作時的保守路線選擇，不是遺漏)。
  const P2T_HINT_LENGTH_MM = {lt1400: 1300, '1400-1600': 1500, '1600-1800': 1700, '1800plus': 1900};
  // H比例直算估計器(2026-08-24)：Q4高度題的選項→mm對照，跟Q1同一種"取區間中點"設計
  const P2T_HINT_HEIGHT_MM = {lt550: 500, '550-650': 600, '650-750': 700, '750-900': 825, '900plus': 1000};
  // WP-B寬度追問卡(2026-08-30，監督angry-nightingale-a46d65-1d派工)：Q5寬度題的選項→mm對照，
  // 跟Q4同一種"取區間中點"設計。跟Q1(外部長度)不同的是Q1只重新按舊比例縮放寬度(假設長寬比
  // 本身沒問題)，這裡是後端已經明講「連長寬比本身都沒把握」的情境，需要使用者直接給寬度數字，
  // 不能再靠舊比例推算。
  const P2T_HINT_WIDTH_MM = {lt650: 600, '650-750': 700, '750-850': 800, '850-950': 900, '950plus': 1000};

  function buildHintCardHtml(opts){
    opts = opts || {};
    const showQ123 = opts.showQ123 !== false;  // 預設true(向下相容既有呼叫點)
    const showQ4 = !!opts.showQ4;
    const showQ5 = !!opts.showQ5;
    const q1Labels = {lt1400:'Under 1400mm', '1400-1600':'1400–1600mm', '1600-1800':'1600–1800mm (most common)', '1800plus':'1800mm or more', unsure:'Not sure — use default'};
    const q2Labels = {sym:'Symmetric (both ends alike)', asym:'Asymmetric (one end noticeably narrower, egg-shaped)', unsure:'Not sure'};
    const q3Labels = {vertical:'Nearly vertical (base ≈ rim width)', tapered:'Tapers inward a lot (base much narrower, like a flowerpot)', unsure:'Not sure'};
    const q4Labels = {lt550:'Under 550mm', '550-650':'550–650mm (most common)', '650-750':'650–750mm', '750-900':'750–900mm', '900plus':'900mm or more', unsure:'Not sure — use default'};
    // WP-B文案修正(2026-08-30，監督angry-nightingale-a46d65-1d目檢發現)：Q4的"use default"
    // 名副其實(580mm是有意義的預設值)，但Q5沒有"default"可用——所謂default就是上一行剛
    // 講"可能不可信"的那個數字，用"use default"等於邀請使用者選擇一個我們自己說不可信的值，
    // 把"知情"這件事的語氣降級成可有可無。改成明講後果，不用"default"這個字。
    const q5Labels = {lt650:'Under 650mm', '650-750':'650–750mm (most common)', '750-850':'750–850mm', '850-950':'850–950mm', '950plus':'950mm or more', unsure:'Not sure — keep the shown estimate (may be inaccurate)'};
    const pill = (q, opt, label) => `<button type="button" class="p2t-hint-pill" data-q="${q}" data-opt="${opt}">${p2tT(label)}</button>`;
    const row = (q, title, opts) => `<div class="p2t-hint-row">
        <div class="p2t-hint-q">${p2tT(title)}</div>
        <div class="p2t-hint-opts">${Object.entries(opts).map(([opt,label]) => pill(q, opt, label)).join('')}</div>
        <div class="p2t-hint-status" id="p2tHintStatus${q}"></div>
      </div>`;
    return `<div class="p2t-hint-card" id="p2tHintCard">
        <div class="p2t-hint-header">${p2tT('A few quick questions can improve the estimate (optional — skip any you\'re not sure about):')}</div>
        ${showQ123 ? row(1, 'About how long is it (external length)? You can fine-tune with the slider below afterward.', q1Labels) : ''}
        ${showQ123 ? row(2, 'Is this tub symmetric at both ends?', q2Labels) : ''}
        ${showQ123 ? row(3, 'Looking from above, is the base much narrower than the rim?', q3Labels) : ''}
        ${showQ4 ? row(4, 'About how tall is it, measured from the floor to the rim? You can fine-tune with the slider below afterward.', q4Labels) : ''}
        ${showQ5 ? row(5, 'The width shown may not be reliable — about how wide is it (external width, the shorter side)? Unlike the other questions, skipping this one means keeping that unreliable number.', q5Labels) : ''}
      </div>`;
  }

  function applyHint(q, opt, btn){
    if(!p2tLastData) return;
    const dp = p2tLastData.spec['設計參數'] || {};
    const fc = p2tLastData.spec['field_confidence'] || (p2tLastData.spec['field_confidence'] = {});
    const statusEl = document.getElementById('p2tHintStatus' + q);
    let updatedField = null;
    if(q === '1' && opt !== 'unsure'){
      const newL = P2T_HINT_LENGTH_MM[opt];
      const oldL = dp['外部長度_mm'], oldW = dp['外部寬度_mm'];
      if(oldL && oldW){ dp['外部寬度_mm'] = Math.round(oldW * (newL / oldL) * 10) / 10; }
      dp['外部長度_mm'] = newL;
      p2tLastData.spec['dims_mode'] = 'user_estimated';
      fc['dims'] = 'user_estimated';
      updatedField = 'external length/width (your estimate)';
    } else if(q === '2' && opt === 'sym'){
      dp['蛋形係數_pct'] = 0;
      fc['egg_pct'] = 'user_confirmed';
      updatedField = 'symmetry (confirmed symmetric)';
    } else if(q === '3' && opt === 'vertical'){
      dp['底部收縮_pct'] = 90;
      fc['taper_pct'] = 'user_confirmed';
      updatedField = 'base taper (confirmed nearly vertical)';
    } else if(q === '4' && opt !== 'unsure'){
      dp['缸緣高度_前端_mm'] = P2T_HINT_HEIGHT_MM[opt];
      fc['H_mm'] = 'user_confirmed';
      updatedField = 'height (your estimate)';
    } else if(q === '5' && opt !== 'unsure'){
      // WP-B(2026-08-30)：跟Q1不同，這裡直接覆寫外部寬度_mm(不是按舊比例縮放)——後端
      // W_source==='low_confidence'代表連長寬比本身都沒把握，舊比例本來就不可信，不能拿來
      // 當縮放基準。使用者一旦回答，同時清空寬度區間_mm(不再是不確定範圍，是使用者確認值)。
      dp['外部寬度_mm'] = P2T_HINT_WIDTH_MM[opt];
      dp['寬度區間_mm'] = null;
      fc['dims'] = 'user_confirmed';
      p2tLastData.spec['W_source'] = 'user_confirmed';
      updatedField = 'width (your estimate)';
    }
    if(updatedField){
      try { importSpecJSON(JSON.stringify(p2tLastData.spec)); } catch(err){ /* 靜默失敗不影響已選pill的視覺狀態 */ }
      if(statusEl) statusEl.textContent = p2tT('✓ Got it — updated: {field}', {field: p2tT(updatedField)});
    } else if(statusEl){
      statusEl.textContent = p2tT('✓ Got it (kept the automatic estimate)');
    }
    const row = btn.closest('.p2t-hint-opts');
    if(row) Array.from(row.children).forEach(b => b.classList.toggle('p2t-hint-pill-selected', b === btn));
  }

  banner.addEventListener('click', (e) => {
    const btn = e.target.closest('.p2t-hint-pill');
    if(!btn) return;
    applyHint(btn.dataset.q, btn.dataset.opt, btn);
  });

  // ===== 單照片救援包招2(2026-08-23，Lyric拍板+安全轉向)：型錄檢索借參數，建議式借用 =====
  // 獨立的Modal App(跟/reconstruct物理隔離，見api/modal_catalog_match.py)，只在照片數<3時
  // 額外打一次這個輕量endpoint，跟主要的/reconstruct呼叫平行進行、互不阻擋。三條安全紅線
  // (N=1永遠suggestion、ambiguous永遠降級suggestion、只回參數不回款名)全部在後端
  // scripts/m6_catalog_match.py實作，前端只負責呈現跟使用者確認流程，不重複判斷邏輯。
  const P2T_CATALOG_MATCH_API_BASE = 'https://lyricann--photo2tub-catalog-match-fastapi-app.modal.run';
  let p2tPreCatalogSpec = null; // 套用建議前的spec快照，供"還原/撤銷"使用

  function mergeCatalogParamsIntoSpec(spec, params){
    const dp = spec['設計參數'] || (spec['設計參數'] = {});
    const L = dp['外部長度_mm'];
    if(L && params.wl_ratio){ dp['外部寬度_mm'] = Math.round(L * params.wl_ratio * 10) / 10; }
    ['shape_code','蛋形係數_pct','底部收縮_pct','手繪俯視輪廓_normalized','側壁模式','側壁弧度R_mm',
     '上段弧R2_mm','S轉折高度_pct','內缸弧R_長邊剖面_mm','內缸弧R_短邊剖面_mm','外缸弧R_長邊剖面_mm','外缸弧R_短邊剖面_mm']
      .forEach(k => { if(params[k] !== undefined) dp[k] = params[k]; });
    const fc = spec['field_confidence'] || (spec['field_confidence'] = {});
    fc['shape_code'] = fc['egg_pct'] = fc['taper_pct'] = fc['wall_r'] = 'catalog_borrowed';
    return spec;
  }

  function revertCatalogSuggestion(){
    if(!p2tPreCatalogSpec || !p2tLastData) return;
    p2tLastData.spec = p2tPreCatalogSpec;
    try { importSpecJSON(JSON.stringify(p2tLastData.spec)); } catch(err){}
    const card = document.getElementById('p2tCatalogCard');
    if(card) card.remove();
  }

  function showCatalogSuggestionCard(candidate){
    // v1安全裁定(2026-08-23，擴大驗證報告後)：全面suggestion-only，不論後端回傳的mode是
    // 什麼，前端一律走「建議+使用者點擊才套用」這條路徑——不再有任何自動merge的分支。
    // candidate.confidence_tier==='high'(後端would_be_auto的案例：N>=2+confident+不ambiguous)
    // 用語氣更肯定的文案，但套用動作一樣要使用者手動點擊，這個欄位只影響文案，不影響流程。
    if(!p2tLastData) return;
    const card = document.createElement('div');
    card.id = 'p2tCatalogCard';
    card.className = 'p2t-hint-card';
    const headerText = candidate.confidence_tier === 'high'
      ? p2tT('Multiple photos closely match a shape in our catalog — want to apply it?')
      : p2tT('We found a similar shape in our catalog — want to try it?');
    card.innerHTML = `<div class="p2t-hint-header">${headerText}</div>
      <div class="p2t-hint-q">${p2tT('This only borrows the shape (no product name/brand is used or shown) — preview it before deciding.')}</div>
      <div class="p2t-hint-opts">
        <button type="button" class="p2t-hint-pill p2t-catalog-preview-btn">${p2tT('👁 Preview')}</button>
        <button type="button" class="p2t-hint-pill p2t-catalog-skip-btn">${p2tT('Not this one')}</button>
      </div>
      <div class="p2t-hint-status" id="p2tCatalogStatus"></div>`;
    banner.appendChild(card);
    card.__candidate = candidate;
  }

  banner.addEventListener('click', (e) => {
    const card = document.getElementById('p2tCatalogCard');
    if(!card) return;
    const candidate = card.__candidate;
    if(e.target.closest('.p2t-catalog-preview-btn') && p2tLastData){
      p2tPreCatalogSpec = JSON.parse(JSON.stringify(p2tLastData.spec));
      mergeCatalogParamsIntoSpec(p2tLastData.spec, candidate.params);
      try { importSpecJSON(JSON.stringify(p2tLastData.spec)); } catch(err){}
      document.getElementById('p2tCatalogStatus').textContent = p2tT('Previewing the suggested catalog shape (not applied yet).');
      const opts = card.querySelector('.p2t-hint-opts');
      opts.innerHTML = `<button type="button" class="p2t-hint-pill p2t-catalog-confirm-btn">${p2tT('✓ Use this shape')}</button>
        <button type="button" class="p2t-hint-pill p2t-catalog-revert-btn">${p2tT('↺ Back to my photo result')}</button>`;
    } else if(e.target.closest('.p2t-catalog-confirm-btn')){
      card.innerHTML = `<div class="p2t-hint-header">${p2tT('✓ Applied a similar catalog shape (no product name used) — you can undo this anytime to return to the state right before it was applied.')}</div>
        <button type="button" class="p2t-hint-pill p2t-catalog-revert-btn">${p2tT('Undo')}</button>`;
    } else if(e.target.closest('.p2t-catalog-revert-btn')){
      revertCatalogSuggestion();
    } else if(e.target.closest('.p2t-catalog-skip-btn')){
      card.remove();
    }
  });

  async function tryCatalogMatch(list){
    try {
      const fd = new FormData();
      list.forEach(f => fd.append('files', f, f.name));
      const resp = await fetch(P2T_CATALOG_MATCH_API_BASE + '/catalog_match', {
        method: 'POST', headers: {'x-api-token': P2T_API_TOKEN}, body: fd,
      });
      if(!resp.ok) return;
      const candidate = await resp.json().catch(() => null);
      if(candidate && candidate.matched) showCatalogSuggestionCard(candidate);
    } catch(err){
      // 招2是輔助性建議功能，呼叫失敗(包含這個endpoint還沒deploy時)靜默忽略，
      // 不能影響主要的照片重建流程——這是設計上的優雅降級，不是錯誤處理疏漏。
    }
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

  // 非同步輪詢API(2026-08-27，b8核准設計提案)：submit立即拿job_id(不等結果，繞開Modal
  // edge閘道~150秒同步回應上限)，固定3秒輪詢status直到done/failed/expired。回傳形狀刻意
  // 模仿舊版單次fetch的{resp, data}，讓呼叫端(handlePhotoUpload)既有的成功/失敗分流邏輯
  // 幾乎不用改。onProgress(stageText)在每次仍在跑的輪詢時呼叫，更新banner文字。
  async function reconstructAsync(fd, onProgress){
    const submitResp = await fetch(P2T_API_BASE + '/reconstruct-submit', {
      method: 'POST', headers: { 'x-api-token': P2T_API_TOKEN }, body: fd,
    });
    const submitData = await submitResp.json().catch(()=>null);
    if(!submitResp.ok) return {resp: submitResp, data: submitData};
    const jobId = submitData.job_id;
    const stageText = {
      queued: p2tT('In queue…'), segmenting: p2tT('Analyzing photos…'), computing: p2tT('Computing shape…'),
    };
    while(true){
      await new Promise(r => setTimeout(r, 3000));
      const statusResp = await fetch(`${P2T_API_BASE}/reconstruct-status/${jobId}`, {
        headers: { 'x-api-token': P2T_API_TOKEN },
      });
      const status = await statusResp.json().catch(()=>null);
      if(!statusResp.ok || !status) return {resp: statusResp, data: status};
      if(status.status === 'queued' || status.status === 'running'){
        onProgress(stageText[status.stage] || stageText.queued);
        continue;
      }
      if(status.status === 'done') return {resp: {ok:true, status:200}, data: status};
      if(status.status === 'expired') return {resp: {ok:false, status:408}, data: {expired:true}};
      // status.status === 'failed'：資料品質(no_bathtub_detected)對映舊版422語意，其餘一律500。
      const httpStatus = status.error_type === 'no_bathtub_detected' ? 422 : 500;
      return {resp: {ok:false, status: httpStatus}, data: {detail: {messages: status.messages || []}}};
    }
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

    // 送出鎖(2026-08-27，b8驗收要求)：每次submit=一個GPU job，鎖住按鈕防止重複點擊燒錢；
    // finally保證不管哪個return路徑都會解鎖，不用在每個return前手動補一行容易漏。
    const p2tBtn = document.getElementById('photo2tubBtn');
    if(p2tBtn) p2tBtn.disabled = true;
    try {
      let resp, data;
      try {
        // 非同步輪詢API(2026-08-27，b8核准設計提案)：submit立即拿job_id+固定3秒輪詢status，
        // 繞開Modal edge閘道~150秒同步回應上限(比例精度票事故：舊版單次fetch在>150秒時
        // 瀏覽器會收到CORS/503失敗，這個機制讓/reconstruct-status本身永遠是毫秒級查詢)。
        const outcome = await reconstructAsync(fd, (stageMsg) => {
          showBanner('progress', stageMsg, `${photoCountHint(list.length)} ${p2tT('Usually 30–90 seconds. First run after idle time (cold start) can take 2–3 minutes — please don\'t close this tab.')}`);
        });
        resp = outcome.resp; data = outcome.data;
      } catch(err){
        showBanner('err', p2tT('⚠ Could not reach the reconstruction service'),
          p2tT('Network/CORS error — is the API endpoint reachable? ({err}). This can happen during a temporary connectivity issue, or if you\'re testing against a local API that isn\'t running.', {err:err.message}));
        return;
      }

      if(data && data.expired){
        showBanner('err', p2tT('⚠ Could not reach the reconstruction service'),
          p2tT('This took too long and the job expired — please try uploading again.'));
        return;
      }

      const elapsed = (data && data.elapsed_sec != null) ? data.elapsed_sec.toFixed(1) : ((performance.now() - t0) / 1000).toFixed(1);

      if(!resp.ok){
        const detail = data && data.detail;
        const msgs = (detail && detail.messages) || [];
        let reason = p2tT('The pipeline could not produce a model from these photos.');
        if(resp.status === 401) reason = p2tT('Authentication failed (bad API token) — this is a site configuration issue, not a problem with your photo.');
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
    const lowConf = Object.entries(data.spec['field_confidence'] || {}).filter(([k,v])=>v==='low').map(([k])=>p2tFieldLabel(k));
    if(lowConf.length){
      sub += (sub?'<br>':'') + p2tT('⚠ Please manually confirm: <b>{fields}</b> (low confidence).', {fields:lowConf.join(', ')});
    }
    const multiBoxMsgs = (data.messages || []).filter(m => /個候選框/.test(m));
    if(multiBoxMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ More than one bathtub-like shape was seen in {photoWord} — the largest was used. If that\'s wrong, re-photograph the target tub on its own.',
        {photoWord: p2tT(multiBoxMsgs.length===1 ? 'a photo' : 'some photos')});
    }
    // Pipeline訊息i18n第二批(2026-08-27，見上方i18n條目註解)：M3-比例分歧+R3-比例掃描6條，
    // 都是「R3成功後」的附加提示，跟下面r3InsufficientMsgs~r3FallbackMsgs那條互斥鏈(R3被
    // 略過/拒絕時才觸發，兩者後端互斥)彼此獨立——這裡兩者可能同時出現(R3成功但比例證據
    // 分歧，同時掃描段又判定flat)，故意不共用同一條elif鏈，各自累加進sub。{x}/{w}/{lo}/{hi}
    // 從後端中文訊息用正則抽取，不是結構化欄位。
    const m3RatioDivergenceMsgs = (data.messages || []).filter(m => /\[M3-比例分歧\]/.test(m));
    if(m3RatioDivergenceMsgs.length){
      const mm = m3RatioDivergenceMsgs[0].match(/分歧達([\d.]+)倍/);
      sub += (sub?'<br>':'') + p2tT('⚠ Different photos measured different width/length ratios (up to {x}× apart) — the joint fit still gives a number, but treat the width with extra caution. Consider adding a clean top-down photo.',
        {x: mm ? mm[1] : '?'});
    }
    const r3ScanBrakeMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*環境耗時異常久/.test(m));
    const r3ScanPeakMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*改用掃描找到的峰值/.test(m));
    const r3ScanFlatFullMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*證據量本身撐不起精確寬度/.test(m));
    const r3ScanFlatPartialMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*只能框出.*一個範圍/.test(m));
    const r3ScanUndeterminedMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*落在掃描範圍外/.test(m));
    const r3ScanExceptionMsgs = (data.messages || []).filter(m => /\[R3-比例掃描\].*發生例外/.test(m));
    if(r3ScanBrakeMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ The environment was unusually slow, so the width refinement scan was skipped to stay within the processing time limit — the width shown uses the earlier estimate unchanged. This isn\'t normal behavior; try again later.');
    } else if(r3ScanPeakMsgs.length){
      const mm = r3ScanPeakMsgs[0].match(/覆寫寬度為(\d+)mm/);
      sub += (sub?'<br>':'') + p2tT('The width estimate was refined after a closer scan of the joint fit — updated to {w}mm.', {w: mm ? mm[1] : '?'});
    } else if(r3ScanFlatFullMsgs.length){
      const mm = r3ScanFlatFullMsgs[0].match(/顯示的(\d+)mm只是掃描範圍中點/);
      sub += (sub?'<br>':'') + p2tT('⚠ These photos don\'t provide enough evidence to pin down an exact width — the {w}mm shown is only the midpoint of the scanned range, not a reliable number. Please enter the actual width manually, or add a clean top-down photo.',
        {w: mm ? mm[1] : '?'});
    } else if(r3ScanFlatPartialMsgs.length){
      const mm = r3ScanFlatPartialMsgs[0].match(/框出.*範圍：(\d+)~(\d+)mm\(顯示值(\d+)mm/);
      sub += (sub?'<br>':'') + p2tT('⚠ These photos only support a width range, not an exact number: {lo}–{hi}mm (the {w}mm shown is the midpoint, not a confident answer). Please confirm manually, or add a clean top-down photo, or enter the actual width.',
        {lo: mm ? mm[1] : '?', hi: mm ? mm[2] : '?', w: mm ? mm[3] : '?'});
    } else if(r3ScanUndeterminedMsgs.length){
      const mm = r3ScanUndeterminedMsgs[0].match(/顯示的(\d+)mm不可信/);
      sub += (sub?'<br>':'') + p2tT('⚠ The width evidence from these photos falls outside the scanned range even after extending it — width could not be determined. The {w}mm shown is not reliable; please enter the actual width manually.',
        {w: mm ? mm[1] : '?'});
    } else if(r3ScanExceptionMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ The width refinement scan hit an unexpected error — the width shown keeps the earlier estimate unchanged.');
    }
    // R3聯合擬合因輸入證據不足被擋下(2026-08-23)：接手的既有比例估計路徑對這種案例沒有專屬
    // 保護(近圓形退化保護只做進了R3裡)，把R3已經算好的判定接成明確可執行的建議，不是又一句
    // 籠統的"dims(低信心)"。
    const r3InsufficientMsgs = (data.messages || []).filter(m => /\[R3\].*(too_few_photos|low_diversity)/.test(m));
    // 招A(2026-08-23)：跟上面r3InsufficientMsgs是不同情境(輸入品質過關但擬合殘差差)，故意分開偵測、
    // 分開文案——見上方i18n條目的註解。
    const r3QualityRejectMsgs = (data.messages || []).filter(m => /\[R3-低擬合品質\]/.test(m));
    // degraded靜默缺口修法(2026-08-26，見上方i18n條目註解)：系統忙、不是照片問題，跟上面
    // 兩種「照片本身有問題」情境互斥(後端joint_fit_shape每次只回傳一種status/reason)，
    // 故意用else if排在同一串——不像r3InsufficientMsgs/r3QualityRejectMsgs那樣顯示
    // 「手動輸入尺寸」的招1卡片，因為治本的動作是重試，不是幫使用者手動估尺寸。
    const r3DegradedMsgs = (data.messages || []).filter(m => /\[R3\].*no_family_fit_completed/.test(m));
    // Pipeline訊息i18n第二批(2026-08-27)：degraded分流票剩餘2條——low_iou跟上面r3QualityRejectMsgs
    // (871行的[R3-低擬合品質]，另一個獨立觸發點，會連帶讓customPts失效+顯示招1/招3卡片)語意
    // 相近但觸發點/後續影響不同，刻意不合併(54複審裁定)。正則刻意用`\[R3\]`(後面接空格)而不是
    // `\[R3-低擬合品質\]`，兩者前綴文字本身就不同，不會互相命中。fallback正則鎖定「(跳過：」
    // 這個只有真正catch-all分支才有的字樣，不會誤搶too_few_photos/low_diversity的訊息(它們
    // 各自的括號內文字是「照片張數不足，」/「照片角度太接近，」，不含「跳過：」)。
    const r3LowIouMsgs = (data.messages || []).filter(m => /\[R3\].*擬合殘差過大/.test(m));
    const r3FallbackMsgs = (data.messages || []).filter(m => /\[R3\] 多照片聯合擬合本次未採用\(跳過：/.test(m));
    // H比例直算估計器(2026-08-24)：獨立於上面兩個R3觸發條件——沒拍到正交側視照片時，
    // 不論R3輸入品質/擬合殘差如何都會發生(見photo2tub_api_core.py的H_source欄位)，所以
    // 這裡是第三個、互不排斥的觸發來源，Q4只在這個條件下顯示。
    const heightDefaulted = data.spec && data.spec['H_source'] === 'default_no_side_view';
    // WP-B(2026-08-30，監督angry-nightingale-a46d65-1d派工)：跟heightDefaulted同一種獨立、
    // 互不排斥的觸發來源——只讀後端明講的W_source欄位，前端不重新判斷任何dims_confidence/
    // 訊息文字(見photo2tub_api_core.py的compute_W_source())。
    const widthUncertain = data.spec && data.spec['W_source'] === 'low_confidence';
    let hintCardHtml = '';
    p2tLastData = data; // 招1+招2共用：兩者的patch/merge都要能存取最近一次成功reconstruct的結果
    if(r3InsufficientMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ Not enough photos or angle variety for the joint shape fit — the size/shape estimate may be unreliable. Please manually enter the actual dimensions, or retake photos from different angles and try again.');
      hintCardHtml = buildHintCardHtml({showQ123:true, showQ4:heightDefaulted, showQ5:widthUncertain});
    } else if(r3QualityRejectMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ The joint shape fit could not find a reliable match for this photo set — the traced outline may be distorted by glass reflections or obstructions in the scene, so a standard shape was used instead. The length/width ratio may also be affected, not just the outline — please manually confirm both the shape and dimensions, or retake photos avoiding glass/reflective surfaces.');
      hintCardHtml = buildHintCardHtml({showQ123:true, showQ4:heightDefaulted, showQ5:widthUncertain});
    } else if(r3DegradedMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ The joint shape fit could not finish within the time limit — the server was briefly overloaded, not a problem with your photos. The result shown uses a simpler fallback method instead; try re-uploading the same photos again in a minute or two for a more accurate multi-angle estimate.');
    } else if(r3LowIouMsgs.length){
      sub += (sub?'<br>':'') + p2tT('⚠ The multi-photo joint fit couldn\'t find a good match for this photo set (fit residual too high) — falling back to the existing single/limited-angle method. The outline may be affected by glare or obstructions in the photos; try again with cleaner, unobstructed shots.');
    } else if(r3FallbackMsgs.length){
      sub += (sub?'<br>':'') + p2tT('The multi-photo joint fit wasn\'t used this time — falling back to the existing estimation method.');
    } else if(heightDefaulted || widthUncertain){
      hintCardHtml = buildHintCardHtml({showQ123:false, showQ4:heightDefaulted, showQ5:widthUncertain});
    }
      showBanner('ok', title, sub, messagesToDetailsHtml(data.messages) + hintCardHtml);
      // 招2(2026-08-23)：照片數<3時額外打一次型錄比對，跟主流程平行、不阻擋、失敗靜默降級。
      if(list.length < 3) tryCatalogMatch(list);
    } finally {
      if(p2tBtn) p2tBtn.disabled = false;
    }
  }

  document.getElementById('photo2tubFiles').addEventListener('change', (e)=>{
    handlePhotoUpload(e.target.files);
    e.target.value = '';
  });
})();
