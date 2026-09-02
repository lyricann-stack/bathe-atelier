// ===================== lib-site-nav.js =====================
// 共用導覽列元件(2026-09-02，Lyric要求：每頁各自複製一份nav標籤+CSS，改一次容易漏改
// 其他頁，導致樣式/連結位置對不齊——改成全部頁面讀同一份，只有一個地方要維護)。
// 使用方式：頁面本身不寫<nav>，只在<body>最前面放
//   <script src="lib-site-nav.js"></script>
// 由這支腳本注入CSS(<head>)與<nav>(body最前面)。首頁(home-motion.html)右側是真的
// 「Open the Design Studio」按鈕(連#studio)；其餘5頁右側是同樣大小但看不到、不能點的
// 佔位元素，純粹讓flexbox space-between把5個連結排在跟首頁完全相同的位置。
(function(){
  var PAGES = [
    {href:'atelier-way.html', label:'The Atelier Way'},
    {href:'collection.html', label:'Collection'},
    {href:'materials.html', label:'Materials'},
    {href:'how-it-works.html', label:'How it works'},
    {href:'guides.html', label:'Guides'},
  ];

  var css = ''
    + 'nav{position:fixed;inset:0 0 auto 0;z-index:60;display:flex;align-items:center;justify-content:space-between;'
    + '  padding:22px clamp(18px,4vw,56px);transition:background .3s ease,padding .3s ease,border-color .3s ease,box-shadow .3s ease;'
    + '  background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border-bottom:1px solid transparent}'
    + 'nav.solid{border-bottom-color:rgba(16,16,16,.10);box-shadow:0 1px 0 rgba(16,16,16,.10);padding-block:15px}'
    + 'nav .links{display:flex;gap:clamp(14px,3vw,40px)}'
    + 'nav .links a{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;transition:opacity .2s;color:inherit;text-decoration:none}'
    + 'nav .links a:hover{opacity:1}'
    + 'nav .links a.on{opacity:1;color:#9a7b43}'
    + 'nav .brand{font-size:16px;font-weight:700;letter-spacing:.01em;color:inherit;text-decoration:none}'
    + 'nav .cta{border:1px solid #101010;border-radius:999px;padding:9px 18px;color:#101010;'
    + '  font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;transition:background .25s,color .25s;text-decoration:none;white-space:nowrap}'
    + 'nav .cta:hover{background:#101010;color:#fff}'
    + '@media(max-width:720px){nav .links{display:none}}'
    + '@media(max-width:480px){nav{padding-inline:16px}nav .brand{font-size:14px}nav .cta{font-size:9.5px;letter-spacing:.06em;padding:8px 12px}}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var here = (location.pathname.split('/').pop() || 'home-motion.html');
  var isHome = here === 'home-motion.html' || here === '';

  var linksHtml = PAGES.map(function(p){
    return '<a' + (p.href === here ? ' class="on"' : '') + ' href="' + p.href + '">' + p.label + '</a>';
  }).join('');

  var ctaHtml = isHome
    ? '<a class="cta" href="#studio">Open the Design Studio</a>'
    : '<span class="cta" style="visibility:hidden;pointer-events:none" aria-hidden="true">Open the Design Studio</span>';

  var nav = document.createElement('nav');
  nav.id = 'nav';
  nav.innerHTML = '<a class="brand" href="home-motion.html">Bathe Atelier</a>'
    + '<div class="links">' + linksHtml + '</div>'
    + ctaHtml;
  document.body.insertBefore(nav, document.body.firstChild);

  window.addEventListener('scroll', function(){
    nav.classList.toggle('solid', window.scrollY > 40);
  }, {passive:true});
})();
