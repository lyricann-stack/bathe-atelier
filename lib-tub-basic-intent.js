// lib-tub-basic-intent.js — Basic v2(2026-09-02)：Shape & comfort 意圖層。只有 basic.html 載入。
// INTENT 是「控制面」，P 仍是唯一真實來源；applyIntent 把 INTENT 寫進 P 並守門，syncIntentFromP 反向同步滑桿。
// 常數（V2-Q6：Sharp 極限先 4×，太像水桶再收窄這裡）
const INTENT_FOOT_BASE_L = 0.744, INTENT_FOOT_BASE_W = 0.75, INTENT_FOOT_STEP = 0.0028;   // Darwin obL/L、obW/W；每格 0.28%
const INTENT_IB_GAP_L = 0.0515, INTENT_IB_GAP_W = 0.1025;                                  // Darwin 內外底差（比例）
const INTENT_R_BASE = { riL:1001/1600, riW:1152/800, roL:887/1600, roW:1743/800 };        // Darwin R 對 L 或 W 的比例
const INTENT_R_MIN = 300, INTENT_R_MAX = 5000, INTENT_PROFILE_SPAN = 25;                   // m = 2^((v-50)/25) → 0.25×～4×
const INTENT = { footprint:50, profile:50, depth:450, backrest:0, lip:20 };

// S1-0(2026-09-02)：骨架階段先放空殼，函式本體與事件綁定留給 S1-1
function applyIntent(changedKey){ /* S1-1 填寫 */ }
function syncIntentFromP(){ /* S1-1 填寫 */ }
// 事件綁定與載入同步在 S1-1 一併完成
