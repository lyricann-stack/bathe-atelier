/* sitekit.js — shared page behaviour for the Bathe Atelier site:
   trilingual text swap (reads i18n.js) + scroll-reveal. */

export async function initLang() {
  const cache = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while (n = w.nextNode()) {
    const t = n.nodeValue.trim();
    if (t) cache.push({ node:n, en:t, l:n.nodeValue.match(/^\s*/)[0], r:n.nodeValue.match(/\s*$/)[0] });
  }
  const ph = Array.from(document.querySelectorAll('[placeholder]')).map(el => ({ el, en: el.getAttribute('placeholder') }));
  let DICT = {};
  try { DICT = (await import('./i18n.js')).DICT || {}; } catch (e) {}
  function apply(lang) {
    const d = DICT[lang] || null;
    cache.forEach(c => { c.node.nodeValue = c.l + ((d && d[c.en]) ? d[c.en] : c.en) + c.r; });
    ph.forEach(p => p.el.setAttribute('placeholder', (d && d[p.en]) ? d[p.en] : p.en));
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : (lang === 'th' ? 'th' : 'en');
    const s = document.getElementById('langSel'); if (s) s.value = lang;
  }
  const sel = document.getElementById('langSel');
  let saved = 'en'; try { saved = localStorage.getItem('site_lang') || 'en'; } catch (e) {}
  if (sel) sel.addEventListener('change', () => { try { localStorage.setItem('site_lang', sel.value); } catch (e) {} apply(sel.value); var tl=sel.value==='zh'?'zh':(sel.value==='th'?'th':'en'); if(window.tidioChatApi&&typeof window.tidioChatApi.setLanguage==='function'){window.tidioChatApi.setLanguage(tl);}else{window.tidioChatLang=tl;} });
  if (saved !== 'en') apply(saved); else if (sel) sel.value = 'en';
  return { apply, lang: saved, DICT };
}

export function initReveal() {
  const els = Array.from(document.querySelectorAll('[data-reveal]'));
  els.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(30px)'; el.style.transition = 'opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1)'; });
  const show = el => { el.style.opacity = '1'; el.style.transform = 'none'; };
  if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
  els.forEach(el => io.observe(el));
  setTimeout(() => els.forEach(el => { if (el.style.opacity === '0') show(el); }), 2600);
}
