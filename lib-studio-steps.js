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
        dot.addEventListener('click', function(){ go(s); });
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

  setup();

  window.StudioSteps = {
    steps: function(){ return steps.slice(); },
    current: function(){ return cur; },
    go: go,
    next: next,
    back: back,
    reveal: reveal,
    refresh: refresh,
    render: render
  };
})();
