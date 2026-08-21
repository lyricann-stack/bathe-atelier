// lib-tub-state.js 設計狀態與編號 — 由 customize.html 抽出（行 509-533），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
// ===================== 狀態 =====================
const P = {
  shape:'ellipse', L:1600, W:800, H:580, t:20, b:130, r:150,
  material:'acrylic',               // 'acrylic' Acrylic (gloss)/ 'solid' 人造石 solid surface（霧面）
  dH:0, egg:0, taper:74,            // 不對稱參數：靠背增高 / 蛋形% / Base taper%（legacy 模式用）
  drain:'center', color:'#f5f5f0', water:false, rim:'flat',    // Rim profile：flat Flat / round Rounded / bevel Beveled
  arc:60,                                                       // Rise curvature 0–100%：0=直線，越高曲線越彎
  slope:1.5,                        // 排水洩水角度（°）：缸內底面向排水孔傾斜，工廠常規 1.3–1.5
  undercut:false,                   // 倒扣：false=限制側壁不外鼓超過缸口（上下垂直出模）；true=允許（左右合模）
  wallMode:'factory',               // 側壁剖面模式：factory 工廠弧（內外缸/長短邊獨立 R，達爾文圖面語言）/ curve 預設貝茲 / arc 單圓弧 / s 雙弧 S 曲線
  wallR:2000, wallR2:1200, wallMid:55,   // legacy：單弧 R 或 S 下段 R1；S 上段 R2（反向）；S 轉折高度 %
  // ---- factory 模式參數（2026-07-13 依達爾文工廠圖：上口＋底部＋連接弧 R 的開模語言）----
  lip:20,                           // 浴缸邊寬（缸口平邊，外缸口→內缸口）
  obL:1190, obW:600,                // 外缸底長/寬（mm，絕對值）
  ibL:1108, ibW:518,                // 內缸底長/寬（mm，絕對值）
  riL:1001, riW:1152,               // 內缸側弧 R：長邊剖面 / 短邊剖面
  roL:887,  roW:1743,               // 外缸側弧 R：長邊剖面 / 短邊剖面
  ovf:true, ovfDrop:75,             // 溢水口（工廠標準件）＋距缸緣距離 mm
  skirt:false, skirtH:180, waistK:58, skirtR:400,   // 裙擺式底座（Oneida 式，僅外殼、legacy 模式）：裙擺高 mm / 收腰寬 % / 裙擺弧 R
  customPts:null,                   // 手繪俯視輪廓（normalized 至 ±0.5 bbox，96 點）
  customProfile:null,               // 手繪側牆剖面 k(v)，25 個取樣值，k[24]=1
  // Phase 5(2026-08-20)：EDIT_MODE節點編輯＋wallFace模式新增欄位，補齊預設值(原本靠動態賦值也能運作，
  // 但明確預設跟Edit3D單檔架構的P物件定義一致，避免undefined跟null混用造成閱讀混淆)
  customPtsInner:null, wallMod:null, rimMod:null,
  tub_type:'freestanding', wallEdgeStart:null, wallEdgeEnd:null,
  drainPos:null,                    // Phase 7(2026-08-21)：去水口自訂連續座標[x,y](mm，缸底面座標系，
                                     // 跟drainXY()回傳同一套)，非null時覆蓋P.drain離散選項，見lib-edit3d-geometry.js
  ovfPos:null,                      // Phase 7(2026-08-21)：溢水孔自訂座標[t,depth](t=內壁周長索引0~N_SEG-1整數，
                                     // depth=距該點局部缸緣高度mm)，非null時覆蓋P.ovfDrop固定後端置中位置，見ovfWorldXYZ()
  faucet:false, faucetPos:null,     // Phase 7(2026-08-21)：龍頭孔(配件v1)開關＋自訂座標[t,u](t=周長索引，
                                     // u=缸緣寬度方向位置0外緣~1內緣，跟stripGeometry()的u同義)，見faucetWorldXYZ()
  baseSlope:0                       // 佇列項11(2026-08-22)：獨立缸底曲線編輯v1(缸底整體傾斜，度)，Pro專屬進階
                                     // 選項，預設0(關閉，跟現行零改動)，正值時+X端墊高、−X端下沉(見outerBaseZ())
};

// 設計編號：浮水印、Concept PDF 與詢價單追蹤用
// 版本前綴：各頁在載入本檔前設 window.PAGE_ID_PREFIX（BA-B／BA-M／BA-P），未設則維持 BA（與舊版相容）
const DESIGN_ID = (window.PAGE_ID_PREFIX || 'BA') + '-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
