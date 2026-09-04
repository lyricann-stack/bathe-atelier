// lib-studio-steps.js — S1(2026-09-04)：三工作室共用的步驟骨架。window.PAGE_STEPS===true 才啟用；只切換顯示，不碰 P／OPTS／BRIEF，不搬既有 DOM。
(function(){
  if(window.PAGE_STEPS !== true) return;
  const panel = document.getElementById('panel');
  if(!panel) return;

  let steps = [];      // 面板子元素 data-step 的去重排序數值（排除 all）
  let cur = 0;
  let multiStep = false;

  // EDIT_MODE 注入的群組（#editIntro／#edgeEditGroup／#dimGroup／#rimProfileGroup 等）沒法在 HTML 標
  // data-step，只能在這裡依 window.PAGE_STEP_INJECTED（{id: step}）補 setAttribute，不搬 DOM。
  function applyInjected(){
    const inj = window.PAGE_STEP_INJECTED;
    if(!inj || typeof inj !== 'object') return;
    Object.keys(inj).forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.setAttribute('data-step', String(inj[id]));
    });
  }

  function scanSteps(){
    const vals = [];
    Array.prototype.forEach.call(panel.children, function(el){
      const v = el.getAttribute('data-step');
      if(v === null || v === 'all') return;
      const n = Number(v);
      if(Number.isNaN(n)) return;
      if(vals.indexOf(n) === -1) vals.push(n);
    });
    vals.sort(function(a,b){ return a - b; });
    steps = vals;
  }

  // data-step-order：有此屬性的子元素設 style.order；沒有的維持 0（DOM 順序）。搭配 CSS 的
  // body.ss-on #panel{display:flex;flex-direction:column} 讓 Summary 步能「規格→價格→Your details」
  // 排序而不搬 DOM。
  function applyOrder(){
    Array.prototype.forEach.call(panel.children, function(el){
      const o = el.getAttribute('data-step-order');
      el.style.order = (o !== null) ? o : '0';
    });
  }

  // 只用 class 切顯示，不碰 inline style——EDIT_MODE 用 style.display='none' 藏掉的群組不受步驟影響。
  function applyDisplay(){
    Array.prototype.forEach.call(panel.children, function(el){
      const v = el.getAttribute('data-step');
      if(v === null || v === 'all' || Number(v) === cur){
        el.classList.remove('ss-hide');
      } else {
        el.classList.add('ss-hide');
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.studio-strip .btns .btn[data-step-show]'), function(btn){
      const list = btn.getAttribute('data-step-show').split(',').map(function(s){ return s.trim(); });
      if(list.indexOf(String(cur)) === -1){
        btn.classList.add('ss-hide');
      } else {
        btn.classList.remove('ss-hide');
      }
    });
  }

  function buildIndicator(){
    if(document.getElementById('ssBar')) return;
    panel.insertAdjacentHTML('afterbegin', '<div id="ssBar" class="group" data-step="all"><div class="ss-top"><span class="ss-label"></span><span class="ss-dots"></span></div><div class="ss-title"></div></div>');
    panel.insertAdjacentHTML('beforeend', '<div id="ssNav" data-step="all"><button type="button" id="ssBack" class="ss-btn ss-back"></button><button type="button" id="ssNext" class="ss-btn ss-next"></button></div>');
    document.getElementById('ssBack').addEventListener('click', function(){ back(); });
    document.getElementById('ssNext').addEventListener('click', function(){ next(); });
  }

  // 指示器與導覽列文字節點每次 render() 重寫（不註冊進 i18nNodes）；語言切換由 applyLang() 尾端呼叫本函式。
  function render(){
    // S8a(2026-09-04)：重繪每個已初始化子步容器的文字（語言切換）；單步模式也要跑
    Array.prototype.forEach.call(panel.querySelectorAll(':scope > [data-substeps]'), function(container){
      if(container.dataset.subInit === '1') subGo(container, Number(container.dataset.subCur));
    });
    if(!multiStep) return;
    const posSteps = steps.filter(function(s){ return s >= 1; });
    const label = panel.querySelector('#ssBar .ss-label');
    if(label){
      if(cur >= 1){
        const i = posSteps.indexOf(cur) + 1;
        label.textContent = t('Step') + ' ' + i + ' ' + t('of') + ' ' + posSteps.length;
      } else {
        label.textContent = t('Guided design');
      }
    }
    const dotsWrap = panel.querySelector('#ssBar .ss-dots');
    if(dotsWrap){
      dotsWrap.innerHTML = '';
      posSteps.forEach(function(s){
        const dot = document.createElement('span');
        dot.className = 'ss-dot' + (s === cur ? ' on' : '') + (s < cur ? ' done' : '');
        dot.setAttribute('data-go', String(s));
        // L4(2026-09-05)：無障礙——鍵盤可達＋朗讀文字
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', t('Step') + ' ' + (posSteps.indexOf(s) + 1));
        dot.addEventListener('click', function(){ go(s); });
        dot.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); go(s); } });
        dotsWrap.appendChild(dot);
      });
    }
    const titleEl = panel.querySelector('#ssBar .ss-title');
    if(titleEl){
      const titles = window.PAGE_STEP_TITLES;
      titleEl.textContent = (titles && titles[cur]) ? t(titles[cur]) : '';
    }
    const backBtn = document.getElementById('ssBack');
    if(backBtn){
      if(cur === steps[0]) backBtn.classList.add('ss-hide'); else backBtn.classList.remove('ss-hide');
      backBtn.textContent = '← ' + t('Back');
    }
    const nextBtn = document.getElementById('ssNext');
    if(nextBtn){
      if(cur === steps[steps.length - 1]) nextBtn.classList.add('ss-hide'); else nextBtn.classList.remove('ss-hide');
      nextBtn.textContent = (cur === 0) ? (t("Skip, I'll set it myself") + ' →') : (t('Next') + ' →');
    }
  }

  function go(step){
    if(steps.indexOf(step) === -1) return;
    cur = step;
    applyDisplay();
    render();
    panel.scrollTop = 0;
    history.replaceState(null, '', location.pathname + location.search + '#step=' + step);
    document.body.classList.toggle('ss-summary', step === steps[steps.length - 1]);
    window.dispatchEvent(new CustomEvent('studiostep', {detail:{step: step}}));
  }

  function next(){
    const i = steps.indexOf(cur);
    if(i === -1 || i >= steps.length - 1) return;
    go(steps[i + 1]);
  }

  function back(){
    const i = steps.indexOf(cur);
    if(i <= 0) return;
    go(steps[i - 1]);
  }

  // 找 el 最近的 #panel 直系子元素，讀其 data-step，非 all 就 go 過去；回傳 boolean。
  function reveal(el){
    if(!el) return false;
    let node = el;
    while(node && node.parentElement !== panel) node = node.parentElement;
    if(!node) return false;
    const v = node.getAttribute('data-step');
    if(v === null || v === 'all') return false;
    const n = Number(v);
    if(Number.isNaN(n) || steps.indexOf(n) === -1) return false;
    go(n);
    return true;
  }

  function initialStep(){
    const h = location.hash;
    if(h.indexOf('#step=') === 0){
      const n = Number(h.slice(6));
      if(!Number.isNaN(n) && steps.indexOf(n) !== -1) return n;
    }
    return steps[0];
  }

  function onHashChange(){
    const h = location.hash;
    if(h.indexOf('#step=') !== 0) return;
    const n = Number(h.slice(6));
    if(!Number.isNaN(n) && steps.indexOf(n) !== -1 && n !== cur) go(n);
  }

  // 重掃 data-step／PAGE_STEP_INJECTED，重建指示器與 dots；供 S2 起與監督驗收（執行期臨時加屬性）用。
  function refresh(){
    applyInjected();
    scanSteps();
    multiStep = steps.length > 1;
    // S8a(2026-09-04)：單步模式也要初始化子步（Basic 若哪天拿掉主步驟仍可用）
    Array.prototype.forEach.call(panel.querySelectorAll(':scope > [data-substeps]'), initSubsteps);
    applyA11y();   // L4(2026-09-05)：單步／多步都要補無障礙屬性
    if(!multiStep) return;
    if(!document.getElementById('ssBar')){
      document.body.classList.add('ss-on');
      buildIndicator();
    }
    if(steps.indexOf(cur) === -1) cur = steps[0];
    applyOrder();
    applyDisplay();
    render();
  }

  function setup(){
    applyInjected();
    scanSteps();
    multiStep = steps.length > 1;
    // S8a(2026-09-04)：單步模式也要初始化子步（Basic 若哪天拿掉主步驟仍可用）
    Array.prototype.forEach.call(panel.querySelectorAll(':scope > [data-substeps]'), initSubsteps);
    applyA11y();   // L4(2026-09-05)：單步／多步都要補無障礙屬性
    // steps.length <= 1 → 單步模式：不插入任何 DOM、不加任何 class，只暴露 API。
    if(!multiStep) return;
    document.body.classList.add('ss-on');
    applyOrder();
    buildIndicator();
    cur = initialStep();
    applyDisplay();
    render();
    window.addEventListener('hashchange', onHashChange);
  }

  // S8a(2026-09-04)：群組內子步（一題一屏）
  function getSubVals(container){
    const vals = [];
    Array.prototype.forEach.call(container.querySelectorAll(':scope > [data-substep]'), function(el){
      const n = Number(el.getAttribute('data-substep'));
      if(!Number.isNaN(n) && vals.indexOf(n) === -1) vals.push(n);
    });
    vals.sort(function(a,b){ return a - b; });
    return vals;
  }

  // 只切 ss-hide，不捲動、不碰 P、不觸發任何 input 事件。
  function subGo(container, n){
    const subs = getSubVals(container);
    if(subs.indexOf(n) === -1) return;
    Array.prototype.forEach.call(container.querySelectorAll(':scope > [data-substep]'), function(el){
      if(Number(el.getAttribute('data-substep')) === n) el.classList.remove('ss-hide');
      else el.classList.add('ss-hide');
    });
    const i = subs.indexOf(n) + 1;
    const label = container.querySelector(':scope > .ss-sub .ss-sub-label');
    if(label) label.textContent = t('Question') + ' ' + i + ' ' + t('of') + ' ' + subs.length;
    const dotsWrap = container.querySelector(':scope > .ss-sub .ss-sub-dots');
    if(dotsWrap){
      dotsWrap.innerHTML = '';
      subs.forEach(function(s){
        const dot = document.createElement('span');
        dot.className = 'ss-dot' + (s === n ? ' on' : '') + (s < n ? ' done' : '');
        dot.setAttribute('data-go', String(s));
        // L4(2026-09-05)：無障礙——鍵盤可達＋朗讀文字
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', t('Question') + ' ' + (subs.indexOf(s) + 1));
        dot.addEventListener('click', function(){ subGo(container, s); });
        dot.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); subGo(container, s); } });
        dotsWrap.appendChild(dot);
      });
    }
    const backBtn = container.querySelector(':scope > .ss-subnav .ss-sub-back');
    if(backBtn){
      if(n === subs[0]) backBtn.classList.add('ss-hide'); else backBtn.classList.remove('ss-hide');
      backBtn.textContent = '← ' + t('Back');
    }
    const nextBtn = container.querySelector(':scope > .ss-subnav .ss-sub-next');
    if(nextBtn){
      if(n === subs[subs.length - 1]) nextBtn.classList.add('ss-hide'); else nextBtn.classList.remove('ss-hide');
      nextBtn.textContent = t('Next') + ' →';
    }
    container.dataset.subCur = String(n);
  }

  function subNext(container){
    const subs = getSubVals(container);
    const i = subs.indexOf(Number(container.dataset.subCur));
    if(i === -1 || i >= subs.length - 1) return;
    subGo(container, subs[i + 1]);
  }

  function subBack(container){
    const subs = getSubVals(container);
    const i = subs.indexOf(Number(container.dataset.subCur));
    if(i <= 0) return;
    subGo(container, subs[i - 1]);
  }

  function initSubsteps(container){
    if(container.dataset.subInit === '1') return;
    const subs = getSubVals(container);
    if(subs.length <= 1) return;
    container.dataset.subInit = '1';
    const h3 = container.querySelector(':scope > h3');
    const subHtml = '<div class="ss-sub"><span class="ss-sub-label"></span><span class="ss-sub-dots"></span></div>';
    if(h3) h3.insertAdjacentHTML('afterend', subHtml);
    else container.insertAdjacentHTML('afterbegin', subHtml);
    container.insertAdjacentHTML('beforeend', '<div class="ss-subnav"><button type="button" class="ss-btn ss-back ss-sub-back"></button><button type="button" class="ss-btn ss-next ss-sub-next"></button></div>');
    const backBtn = container.querySelector(':scope > .ss-subnav .ss-sub-back');
    const nextBtn = container.querySelector(':scope > .ss-subnav .ss-sub-next');
    if(backBtn) backBtn.addEventListener('click', function(){ subBack(container); });
    if(nextBtn) nextBtn.addEventListener('click', function(){ subNext(container); });
    subGo(container, subs[0]);
  }

  // 找 el 最近的 [data-substep] 祖先與其 [data-substeps] 容器 → subGo(容器, n)；再呼叫既有 reveal(容器) 切主步驟。
  function revealSub(el){
    if(!el) return false;
    let sub = el;
    while(sub && !sub.hasAttribute('data-substep')) sub = sub.parentElement;
    if(!sub) return false;
    const container = sub.closest('[data-substeps]');
    if(!container) return false;
    const n = Number(sub.getAttribute('data-substep'));
    if(Number.isNaN(n)) return false;
    subGo(container, n);
    return reveal(container);
  }

  // L4(2026-09-05)：無障礙——鍵盤／螢幕閱讀器替代。只補屬性與 keydown，不改既有點擊行為。
  function applyA11y(){
    // 滑桿與數字框：無 aria-label 者補同列 label 文字
    Array.prototype.forEach.call(panel.querySelectorAll('.row'), function(row){
      const lbl = row.querySelector('label');
      const labelText = lbl ? lbl.textContent.trim() : '';
      if(!labelText) return;
      const range = row.querySelector('input[type=range]');
      if(range && !range.hasAttribute('aria-label')) range.setAttribute('aria-label', labelText);
      const valInput = row.querySelector('.val input');
      if(valInput && !valInput.hasAttribute('aria-label')) valInput.setAttribute('aria-label', labelText);
    });
    // 色票：補按鈕語意＋鍵盤 Enter/Space 觸發既有 click 行為
    Array.prototype.forEach.call(panel.querySelectorAll('.sw'), function(sw){
      if(sw.getAttribute('role') === 'button') return;
      sw.setAttribute('role', 'button');
      sw.setAttribute('tabindex', '0');
      const title = sw.getAttribute('title');
      if(title) sw.setAttribute('aria-label', title);
      sw.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); sw.click(); }
      });
    });
    // 步驟列：地標角色
    const ssBar = document.getElementById('ssBar');
    if(ssBar && ssBar.getAttribute('role') !== 'navigation'){
      ssBar.setAttribute('role', 'navigation');
      ssBar.setAttribute('aria-label', 'Design steps');
    }
  }

  // 選項按鈕：點擊→同組 active＋設 #<data-target>.value；不 dispatch 事件（避免觸發 unlockQuoteBtn）。
  document.addEventListener('click', function(e){
    const b = e.target.closest('.ss-opts > button[data-val]');
    if(!b) return;
    const wrap = b.parentElement;
    const tgt = document.getElementById(wrap.dataset.target);
    if(!tgt) return;
    Array.prototype.forEach.call(wrap.querySelectorAll('button'), function(x){ x.classList.toggle('active', x === b); });
    tgt.value = b.dataset.val;
  });

  // 送出前自動露出 email：capture，在 sendQuote 之前跑；既有 email 守門與紅框/focus 照舊生效。
  document.addEventListener('click', function(e){
    if(!e.target.closest('#quoteBtn')) return;
    const em = document.getElementById('custEmail');
    if(em && (!em.value.trim() || em.value.indexOf('@') < 1)) revealSub(em);
  }, true);

  setup();

  window.StudioSteps = {
    steps: function(){ return steps.slice(); },
    current: function(){ return cur; },
    go: go,
    next: next,
    back: back,
    reveal: reveal,
    refresh: refresh,
    render: render,
    revealSub: revealSub,
    subGo: subGo
  };
})();
