// ===================== lib-site-nav.js =====================
// 共用導覽列元件(2026-09-02，Lyric要求：每頁各自複製一份nav標籤+CSS，改一次容易漏改
// 其他頁，導致樣式/連結位置對不齊——改成全部頁面讀同一份，只有一個地方要維護)。
// 使用方式：頁面本身不寫<nav>，只在<body>最前面放
//   <script src="lib-site-nav.js"></script>
// 由這支腳本注入CSS(<head>)與<nav>(body最前面)。「Open the Design Studio」在全部6頁
// 都是同一顆真的可點按鈕、固定右上角(2026-09-02，Lyric要求：不要只有首頁能點，全部頁面
// 都要一樣)——首頁連#studio(頁內錨點)，其餘5頁連home-motion.html#studio(跨頁錨點)，
// 目的地都是首頁的Basic/Medium/Pro三入口選擇區。
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
    + '@media(max-width:480px){nav{padding-inline:16px}nav .brand{font-size:14px}nav .cta{font-size:9.5px;letter-spacing:.06em;padding:8px 12px}}'
    + 'nav.site-nav-studio{position:relative;inset:auto;flex:none;height:70px;padding:0 clamp(20px,5vw,56px);background:rgba(244,241,234,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid #ddd8cc;box-shadow:none}'
    + 'nav.site-nav-studio .right{display:flex;align-items:center;gap:14px}'
    + 'nav .site-lang{appearance:none;-webkit-appearance:none;background:transparent;border:1px solid #ddd8cc;border-radius:999px;padding:7px 14px;font-size:12.5px;font-family:inherit;color:#4a463d;cursor:pointer}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var here = (location.pathname.split('/').pop() || 'home-motion.html');
  var isHome = here === 'home-motion.html' || here === '';

  var linksHtml = PAGES.map(function(p){
    return '<a' + (p.href === here ? ' class="on"' : '') + ' href="' + p.href + '">' + p.label + '</a>';
  }).join('');

  var ctaHtml = '<a class="cta" href="' + (isHome ? '#studio' : 'home-motion.html#studio') + '">Open the Design Studio</a>';

  // N1(2026-09-05)：工作室頁以 <nav data-site-nav="studio"> 當宿主，lib 取代其內容（不再 fixed，保留 #langSel）
  var host = document.querySelector('nav[data-site-nav="studio"]');
  var langHtml = '<select id="langSel" class="site-lang" aria-label="Language"><option value="en">EN</option><option value="zh">简中</option><option value="th">ไทย</option></select>';

  var nav = host || document.createElement('nav');
  if(host){
    host.removeAttribute('style');
    host.className = 'site-nav-studio';
    if(!host.id) host.id = 'nav';
    host.innerHTML = '<a class="brand" href="home-motion.html">Bathe Atelier</a>' + '<div class="links">' + linksHtml + '</div>' + '<div class="right">' + langHtml + ctaHtml + '</div>';
  } else {
    nav.id = 'nav';
    nav.innerHTML = '<a class="brand" href="home-motion.html">Bathe Atelier</a>'
      + '<div class="links">' + linksHtml + '</div>'
      + ctaHtml;
    document.body.insertBefore(nav, document.body.firstChild);
  }

  if(!host) window.addEventListener('scroll', function(){
    nav.classList.toggle('solid', window.scrollY > 40);
  }, {passive:true});
})();
