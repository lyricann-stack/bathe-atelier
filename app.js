/* Bathe Atelier — shared script with i18n (default English, switch to Simplified Chinese) */
(function(){
  "use strict";

  /* persistence: remember chosen language across pages; default English on first visit */
  function storeLang(l){try{localStorage.setItem("site_lang",l);}catch(e){}try{document.cookie="site_lang="+l+";path=/;max-age=31536000";}catch(e){}}
  function readLang(){try{var v=localStorage.getItem("site_lang");if(v)return v;}catch(e){}var m=document.cookie.match(/(?:^|;\s*)site_lang=([a-z]+)/);return m?m[1]:null;}

  /* ===================== i18n dictionary (EN text -> 简体中文) ===================== */
  var DICT={
    /* nav + footer + common */
    "Home":"首页","Customize":"定制","Why Acrylic":"为什么选亚克力","How It Works":"流程介绍",
    "For Designers":"设计师专区","Portfolio":"作品集","Start Your Design":"开始你的设计",
    "Explore":"浏览","More":"更多","Contact":"联系我们","Acrylic vs Stone Resin":"亚克力 vs 石树脂",
    "Bespoke acrylic bathtubs, made one at a time. Factory-direct. Made & serviced in Australia.":"定制亚克力浴缸，一次只做一件。工厂直供，澳洲制造与服务。",
    "Factory-direct OEM · Made in Australia":"工厂直供 OEM · 澳洲制造",
    "Chat with our design concierge":"与设计顾问对话",
    /* buttons / CTAs */
    "Customize Your Own Bathtub →":"定制你的专属浴缸 →","See how it works":"看看运作流程",
    "Open the Design Studio →":"打开设计工作室 →","Talk to the atelier":"联系工作室",
    "Apply for trade pricing →":"申请批发价 →","See the portfolio":"查看作品集",
    "Request a sample kit":"索取样品包","Send my request →":"送出我的需求 →",
    "Send this design to our atelier →":"把这个设计送到工作室 →",
    /* home hero */
    "Custom Acrylic Bathtubs · Made in Australia · Factory-Direct":"定制亚克力浴缸 · 澳洲制造 · 工厂直供",
    "Your client imagined it.":"你的客户想象了它。","We make it":"我们把它打造成","the only one":"全世界唯一","in the world.":"的存在。",
    "Premium acrylic is the most shapeable bathtub material there is — lighter to install and":"高级亚克力是可塑性最强的浴缸材料——更轻、更易安装，而且",
    "30–50% less than stone resin":"比石树脂便宜 30–50%",
    ". Sketch it, shape it, and our AI atelier turns your concept into a manufacturing-ready 3D model. We build it in our own factory and ship across Australia. No catalogue limits. No MOQ — every tub is a one-off.":"。画出草图、定好造型，我们的 AI 工作室就把你的概念变成可直接量产的 3D 模型。我们在自有工厂制造，并配送全澳洲。没有型录限制，也没有最低订量——每一个浴缸都独一无二。",
    "concept → 3D render":"概念 → 3D 渲染图","No MOQ":"无最低订量","single-piece production":"单件即可生产",
    "Any curve":"任意曲线","built from your CAD":"依你的 CAD 制造","AU-made":"澳洲制造","local service":"在地服务",
    /* why section (home + why-acrylic) */
    "Why Bathe Atelier":"为什么选 Bathe Atelier",
    "The only brand combining acrylic, true shape customisation, and B2C online ordering.":"唯一同时结合亚克力、真正外形定制与 B2C 线上下单的品牌。",
    "No competitor occupies this space. Premium players push stone resin and call acrylic \"cheap\" — but on the things that matter to a real project, acrylic wins.":"没有竞争者占据这块市场。高端品牌主推石树脂、把亚克力说成「便宜货」——但在真正影响项目的关键上，亚克力更胜一筹。",
    "One in the world":"全世界唯一",
    "Your sketch, photo or CAD becomes a real, one-of-a-kind bathtub. No MOQ — single-piece production, nothing off-the-shelf.":"你的草图、照片或 CAD 都能变成真实、独一无二的浴缸。无最低订量——单件即可生产，绝非现货。",
    "Built from your CAD":"依你的 CAD 制造",
    "Any curve, any dimension — we manufacture directly from your design files. Competitors won't even accept external CAD; we start there.":"任意曲线、任意尺寸——我们直接依你的设计文件制造。同行连外部 CAD 都不收，我们却从这里开始。",
    "Lighter, simpler install":"更轻、更好安装",
    "Acrylic is the lightest tub material. No 200–350 lb stone slab, no 3–4-person curbside crew — it just goes in.":"亚克力是最轻的浴缸材料。没有 200–350 磅的石板，不必 3–4 人在路边搬运——直接就能装。",
    "30–50% less + financing":"便宜 30–50% ＋可分期",
    "Premium look for a fraction of stone resin. Spread it from ~AUD $130/month with Afterpay or Zip.":"高端质感，价格只是石树脂的一小部分。透过 Afterpay 或 Zip，每月约 AUD $130 起。",
    "Made & serviced in Australia":"澳洲制造与服务",
    "Local production, turnaround and after-sales — a moat US brands can't match for AU/NZ.":"在地生产、在地交期与售后——这是美国品牌在澳纽无法匹敌的护城河。",
    "Easy to repair":"易于修复",
    "Surface scratches and chips in acrylic are simple to fix; stone resin damage often isn't.":"亚克力表面的刮痕与缺角很好修补；石树脂的损伤往往做不到。",
    "See the full acrylic vs stone-resin comparison →":"查看完整的亚克力 vs 石树脂对照 →",
    "Your sketch, photo or CAD becomes a real, one-of-a-kind bathtub. No MOQ — single-piece production.":"你的草图、照片或 CAD 都能变成真实、独一无二的浴缸。无最低订量——单件即可生产。",
    "Any curve, any dimension — straight from your design files. Competitors won't accept external CAD; we start there.":"任意曲线、任意尺寸——直接源自你的设计文件。同行不收外部 CAD，我们却从这里开始。",
    "Acrylic is the lightest tub material. No 200–350 lb slab, no 3–4-person curbside crew.":"亚克力是最轻的浴缸材料。没有 200–350 磅的石板，不必 3–4 人在路边搬运。",
    "A designer delivers a photoreal 3D render plus a":"设计师交付一张拟真 3D 渲染图，外加一份",
    "signed design specification sheet":"签署的设计规格书",
    "within 48 hours. Unlike a stone-resin brand's flat fee, this buys":"，48 小时内完成。不同于石树脂品牌的固定费用，这笔费用买到的是",
    /* steps (home) */
    "From Concept to Delivery":"从概念到交付",
    "You give us a starting point. We carry it to the finish.":"你给我们一个起点，我们带它走到终点。",
    "Sketch your idea":"画出你的想法",
    "Use the design studio, or upload a sketch, photo, floor plan or CAD file.":"使用设计工作室，或上传草图、照片、平面图或 CAD 文件。",
    "You · 5 min":"你 · 5 分钟",
    "3D in 48 hours":"48 小时出 3D",
    "A photoreal 3D render plus a signed design spec sheet. The $399 fee is credited to your order.":"拟真 3D 渲染图＋签署的设计规格书。$399 费用可折抵订单。",
    "Us · 48h":"我们 · 48 小时","Refine together":"一起细修",
    "Tweak curves, edges and dimensions over 2–3 quick rounds until it's exactly right.":"用 2–3 个快速回合微调曲线、边缘与尺寸，直到完全到位。",
    "Together":"协作","Built & shipped":"制造并配送",
    "We open the mould, build it with progress photos throughout, and deliver across Australia.":"我们开模制造，全程提供进度照片，并配送全澳洲。",
    "Us · production":"我们 · 生产","See the full process & pricing →":"查看完整流程与报价 →",
    "Ready to design the only one in the world?":"准备好设计全世界唯一的那一个了吗？",
    "Build it in the studio, or send us a sketch — get a 3D render back in 48 hours.":"在工作室里打造，或寄给我们一张草图——48 小时内拿到 3D 渲染图。",
    /* customize page */
    "The Design Studio":"设计工作室","Shape it your way — watch it come to life.":"照你的方式塑形——看着它成形。",
    "Give us a starting point: a silhouette, a finish, a size. That's all we need. Our team takes your concept the rest of the way to a finished, installable bathtub.":"给我们一个起点：一个外形、一种饰面、一个尺寸，这样就够了。剩下的，我们团队会把你的概念一路做成可安装的成品浴缸。",
    "Live preview":"即时预览","Silhouette":"外形","Finish":"饰面","Size":"尺寸","Capacity":"容量","Dimensions":"尺寸","Add-ons":"加值选项",
    "1 · Silhouette":"1 · 外形","2 · Finish & Colour":"2 · 饰面与颜色","3 · Dimensions":"3 · 尺寸","4 · Add-ons":"4 · 加值选项",
    "Freestanding Oval":"独立式椭圆","Modern Rectangle":"现代矩形","Slipper":"斜背式","Round Drum":"圆桶式","Japanese Soaking":"日式深泡",
    "Gloss White":"亮面白","Matte Black":"哑光黑","Gold Leaf":"金箔","Marble":"大理石","Custom":"定制",
    "Length":"长度","Width":"宽度","Depth":"深度",
    "Slotted overflow":"隐藏式溢水口","Freestanding tap":"落地龙头","Chromotherapy LED":"七彩 LED","Air massage":"气泡按摩","Headrest":"头枕",
    "Your selections travel with you to the next page. Acrylic's light density means our 3D and AR previews are faster than stone resin.":"你的选择会一起带到下一页。亚克力密度轻，我们的 3D 与 AR 预览比石树脂更快。",
    /* why-acrylic page */
    "The premium players don't want this comparison made.":"高端品牌不希望有人做这个对照。",
    "Stone-resin brands market acrylic as \"cheaper material.\" It's an SEO tactic, not a fact. On the things a client actually lives with, premium acrylic wins — and we're the only brand pairing it with genuine shape customisation and online ordering.":"石树脂品牌把亚克力宣传成「较便宜的材料」。那是 SEO 手法，不是事实。在客户真正天天使用的层面，高级亚克力更胜一筹——而我们是唯一将它与真正外形定制和线上下单结合的品牌。",
    "How the two actually stack up.":"两者实际比一比。",
    "Bathe — Custom Acrylic":"Bathe — 定制亚克力","Typical stone-resin brand":"典型石树脂品牌",
    "Shape customisation":"外形定制","Weight & install":"重量与安装","Price":"价格","Returns":"退货","Service area":"服务范围","Repairs":"维修",
    "Genuine":"真正的","— any curve from your sketch or CAD":"——任意曲线，源自你的草图或 CAD",
    "Size & colour only; \"custom builder\" is a relabelled catalogue":"只有尺寸与颜色；所谓「定制工具」只是换了名字的型录",
    "Light":"轻","— two-person install, fits standard floors":"——两人即可安装，适用标准楼板",
    "200–350 lb; curbside-only, needs a 3–4-person crew":"200–350 磅；仅送到路边，需 3–4 人搬运",
    "30–50% less":"便宜 30–50%",", financing from ~$130/mo":"，每月约 $130 起可分期",
    "Premium pricing, US-style checkout":"高价定位，美式结账",
    "Fair":"合理","— bespoke spec signed off before we build":"——制造前先确认并签署定制规格",
    "14-day window + both-way freight + 10% restock ($600–$900 on a $3k tub)":"14 天期限＋来回运费＋10% 重新上架费（$3,000 浴缸要花 $600–$900）",
    "US / Canada only — no AU/NZ shipping or support":"仅限美国／加拿大——不配送澳纽，也无在地支援",
    "Easy":"轻松","surface repair on acrylic":"亚克力表面修复","Chips in stone resin are hard to fix":"石树脂的缺角很难修复",
    "Read the full guide: Acrylic vs Stone Resin →":"阅读完整指南：亚克力 vs 石树脂 →",
    "See it in your finish, your size.":"用你的饰面、你的尺寸看看效果。",
    "Open the design studio and watch your one-of-a-kind tub take shape.":"打开设计工作室，看着你独一无二的浴缸成形。",
    /* how-it-works page */
    "A rough direction is all we need. Here's exactly what happens — and what it costs — from first sketch to a finished tub installed in your client's bathroom.":"一个大致方向就够了。以下是从第一张草图到成品浴缸装进客户浴室，整个流程与费用的明细。",
    "Use the design studio, upload a sketch, photo, floor plan or CAD file — or request the free sample kit first. A rough direction is enough.":"使用设计工作室，上传草图、照片、平面图或 CAD 文件——或先索取免费样品包。大致方向就够了。",
    "Our AI atelier turns your concept into a photoreal 3D render plus a signed design spec sheet. The $399 consultation fee is credited to your order.":"我们的 AI 工作室把你的概念变成拟真 3D 渲染图，并附上签署的设计规格书。$399 设计咨询费可折抵订单。",
    "Tweak curves, edges and dimensions over 2–3 quick rounds until it's exactly right — then we lock the manufacturing files.":"用 2–3 个快速回合微调曲线、边缘与尺寸，直到完全到位——接着我们锁定生产文件。",
    "We open the mould and build it, sending production progress photos throughout. One bathtub, delivered across Australia.":"我们开模制造，全程提供生产进度照片。一个浴缸，配送全澳洲。",
    "Two Easy Ways to Start":"两种轻松的开始方式","Touch it first, or go straight to a 3D design.":"先摸摸看，或直接进入 3D 设计。",
    "Lead magnet":"引流好礼","Free Sample Kit":"免费样品包","FREE":"免费",
    "Acrylic finish swatches (gloss, matte, colours) plus a life-size paper floor template so you can lay out the tub in the actual room — shipped to your door. Acrylic's lighter density also makes our 3D and AR previews faster than stone resin.":"亚克力饰面色卡（亮面、哑光、彩色）＋实尺纸本地面范本，让你在真实空间里摆位——直送到府。亚克力密度更轻，也让我们的 3D 与 AR 预览比石树脂更快。",
    "Best for serious projects":"适合认真的项目","Paid Design Consultation":"付费设计咨询",
    "— fully credited to your order":"——可全额折抵订单",
    "A designer delivers a photoreal 3D render plus a signed design specification sheet within 48 hours. Unlike a stone-resin brand's flat fee, this buys":"设计师在 48 小时内交付拟真 3D 渲染图，外加一份签署的设计规格书。不同于石树脂品牌的固定费用，这笔费用买到的是",
    "genuine shape customisation":"真正的外形定制","— and the fee comes straight off your final price.":"——而且可直接从最终价格扣除。",
    "💳 Financing available — a $4,000 custom tub from ~AUD $130/month with Afterpay or Zip.":"💳 提供分期——一个 $4,000 的定制浴缸，透过 Afterpay 或 Zip，每月约 AUD $130 起。",
    "Start with a 5-minute design.":"用 5 分钟开始设计。",
    "Build it in the studio, then send it over — or request your free sample kit.":"在工作室里打造，然后送过来——或索取你的免费样品包。",
    /* designers page */
    "For Interior Designers & Architects":"给室内设计师与建筑师",
    "Make the bathtub your signature, not your bottleneck.":"让浴缸成为你的招牌，而不是你的瓶颈。",
    "You decide what belongs in your client's home. We become the silent workshop behind your most ambitious pieces — fast, discreet, and trade-priced.":"客户家里该放什么，由你决定。我们是你最大胆作品背后那间低调的工坊——快速、保密、批发价。",
    "The Trade Programme":"批发合作方案","Built for the way designers actually work.":"为设计师真实的工作方式而打造。",
    "No catalogue limits, no external-CAD refusals, no waiting in a general queue. Bring the curve you've been told is \"not possible\" — that's our starting point.":"没有型录限制、不拒收外部 CAD、不必排在一般队伍里。把别人告诉你「做不到」的那条曲线带来——那正是我们的起点。",
    "Trade pricing — 15–25% off retail, factory-direct":"批发价——零售价 15–25% 折扣，工厂直供",
    "We build directly from your CAD — any curve, any dimension":"直接依你的 CAD 制造——任意曲线、任意尺寸",
    "Sample priority + a dedicated account contact, not a queue":"样品优先＋专属对接窗口，而非排队",
    "White-glove 3D rounds you can present straight to your client":"白手套级 3D 回合，可直接呈现给客户",
    "Specialty finishes: gold leaf, matte, stone-look, custom colour-match":"特殊饰面：金箔、哑光、仿石、定制配色",
    "$500 credit when you share the finished installation photos":"分享完工安装照，即享 $500 折抵",
    "How we fit your studio":"我们如何融入你的工作室","Three ways designers use Bathe Atelier.":"设计师使用 Bathe Atelier 的三种方式。",
    "CAD-to-production":"CAD 直接生产",
    "Send your Rhino, SketchUp or DWG file. We manufacture to it directly — the structural advantage stone-resin brands can't offer.":"寄来你的 Rhino、SketchUp 或 DWG 文件，我们直接照做——这是石树脂品牌给不了的结构性优势。",
    "White-label storefront":"白标店面",
    "Showcase your own bathtub designs; we manufacture only when your client orders. You keep the relationship and the margin.":"展示你自己的浴缸设计；客户下单我们才制造。客户关系与利润都归你。",
    "One-off statement pieces":"单件代表作",
    "A single sculptural tub for a hero project — no MOQ, full spec sign-off, progress photos throughout.":"为重点项目打造一件雕塑感浴缸——无最低订量、完整规格签署、全程进度照片。",
    "Let's make your next signature piece.":"一起做出你的下一件招牌作品。",
    "Apply for trade pricing, or send a project brief — we'll reply with next steps and a sample kit.":"申请批发价，或寄来项目简报——我们会回覆后续步骤并附上样品包。",
    /* portfolio page */
    "Every piece made for a single project.":"每一件都为单一项目打造。",
    "A selection of silhouettes, finishes and configurations we've shaped. Each one is unique — none is a catalogue item. Yours will be too.":"这是我们打造过的一些外形、饰面与配置精选。每一件都独一无二——没有一件是型录品。你的也会是。",
    "Renders shown are configuration concepts from our design studio. Replace with real project photography as installs complete (e.g. via the $500 install-photo credit).":"此处为设计工作室的配置概念渲染图。待安装完成后可换成真实项目照片（例如透过 $500 安装照折抵机制）。",
    "Picture yours here.":"想象你的作品出现在这里。",
    "Start in the design studio and we'll turn it into a 3D render within 48 hours.":"从设计工作室开始，我们会在 48 小时内变成 3D 渲染图。",
    /* article */
    "Buying Guide":"选购指南","Acrylic vs Stone Resin Bathtubs: Which Is Right for You?":"亚克力 vs 石树脂浴缸：哪一种适合你？",
    "Premium brands have spent years framing acrylic as the \"cheap\" option. Here's the honest, point-by-point comparison so you can decide for your own bathroom — not theirs.":"高端品牌花了多年把亚克力塑造成「便宜」的选项。以下是诚实、逐点的对照，让你为自己的浴室做决定——而不是为他们。",
    "Updated June 2026 · ~6 min read · Bathe Atelier":"更新于 2026 年 6 月 · 约 6 分钟阅读 · Bathe Atelier",
    "In this guide":"本指南内容","1. Shape customisation":"1. 外形定制","2. Weight & installation":"2. 重量与安装",
    "3. Price & financing":"3. 价格与分期","4. Warmth, comfort & repairs":"4. 保温、舒适与维修",
    "5. Returns & delivery":"5. 退货与配送","6. The verdict":"6. 结论",
    "Both acrylic and stone resin (also called cast stone or \"cultured stone\") make beautiful freestanding bathtubs. The marketing around them, however, is far from neutral. Several premium stone-resin brands explicitly position against acrylic in their own content to justify higher prices. That's a sales tactic — and it has quietly shaped how a lot of buyers think. Let's look at what actually differs.":"亚克力与石树脂（又称铸石或「人造石」）都能做出漂亮的独立式浴缸。然而围绕它们的营销远谈不上中立。多个高端石树脂品牌在自家内容里明确把亚克力当对照来抬高价格。那是一种销售手法——并悄悄影响了许多买家的想法。我们来看看实际差异。",
    "This is the biggest practical difference, and it rarely makes the brochure. Most \"custom\" bathtub builders online only let you change size and colour; the silhouette is fixed. Acrylic, by contrast, is the most":"这是最大的实际差异，却很少出现在宣传册上。网络上多数「定制」浴缸工具只让你改尺寸与颜色，外形是固定的。相较之下，亚克力是可塑性",
    "formable":"最强",
    "bathtub material there is — it's heat-formed over a mould, so a genuinely new curve is a question of tooling, not chemistry.":"的浴缸材料——它在模具上加热成型，所以真正全新的曲线只是开模与否的问题，而非材料化学的限制。",
    "That's why we manufacture directly from a customer's or designer's CAD file. Any curve, any dimension. Stone-resin processes can technically be moulded too, but most brands won't accept external design files at all — so in practice your shape options are whatever is already in their range.":"这就是为什么我们直接依客户或设计师的 CAD 文件制造。任意曲线、任意尺寸。石树脂工艺在技术上也能开模，但多数品牌根本不收外部设计文件——所以实际上你的外形选择就只有他们既有的那些。",
    "If a brand's \"custom tub builder\" only offers size and colour, it isn't really customisation — it's a relabelled catalogue.":"如果一个品牌的「定制浴缸工具」只给尺寸与颜色，那并不是真的定制——只是换了名字的型录。",
    "Stone resin is heavy — commonly 200–350 lb (90–160 kg) empty. That has real consequences: many brands deliver curbside only, leaving you to arrange a 3–4-person crew to move the tub inside and upstairs, and your floor structure may need checking for a second-storey install.":"石树脂很重——空缸通常 200–350 磅（90–160 公斤）。这有实际后果：许多品牌只送到路边，你得自己找 3–4 人把浴缸搬进室内、搬上楼，二楼安装时楼板结构可能还得检查。",
    "Acrylic is the lightest tub material by a wide margin. A typical freestanding acrylic tub is a comfortable two-person lift, fits standard residential floors without reinforcement, and is far simpler (and cheaper) to freight.":"亚克力是远远最轻的浴缸材料。典型的独立式亚克力浴缸两人就能轻松抬起，不需补强即可放在标准住宅楼板上，运输也简单（且便宜）得多。",
    "For a comparable size and finish, custom acrylic typically runs":"在尺寸与饰面相当的情况下，定制亚克力通常",
    "than stone resin — partly the material, partly lighter freight, partly cutting out middlemen with factory-direct production. Lower entry price also makes financing realistic: a $4,000 custom tub can sit around ~AUD $130/month with Afterpay or Zip, which removes the biggest hesitation for mid-market buyers.":"比石树脂——一部分是材料，一部分是更轻的运费，一部分是工厂直供省去中间商。较低的入手价也让分期变得实际：一个 $4,000 的定制浴缸透过 Afterpay 或 Zip，每月约 AUD $130，这消除了中端买家最大的犹豫。",
    "Acrylic has naturally low thermal conductivity, so it feels warm to the touch and holds heat well during a soak. Stone resin feels more substantial and \"solid,\" which some buyers prefer, but it can feel colder initially and is heavier to live with.":"亚克力本身导热低，摸起来温润，泡澡时也很保温。石树脂手感更厚实、「扎实」，有些买家偏好这点，但初触时偏凉，日常使用也更笨重。",
    "On durability, both wear well. The difference shows up in":"在耐用度上两者都不错。差别出现在",
    "repairs":"维修",
    ": a scratch or surface chip in acrylic can usually be polished or filled and blended; damage in stone resin is harder to fix invisibly. For a piece you'll keep for years, easy repairability matters.":"：亚克力的刮痕或表面缺角通常可以抛光或填补、融合处理；石树脂的损伤则较难修到看不出来。对一件你会用上好几年的物件，好不好修很重要。",
    "Read the returns policy before you buy anything in this category. Heavy stone-resin tubs often carry punishing terms — a short return window, customer-paid freight both ways, and a restocking fee. On a $3,000 tub, sending it back can cost the buyer $600–$900. Many of these brands also ship only within the US and Canada, with no support in Australia or New Zealand.":"在这个品类买任何东西前，先看退货政策。笨重的石树脂浴缸常有苛刻条款——退货期限短、来回运费由客户负担、还有重新上架费。一个 $3,000 的浴缸退回去，买家可能要花 $600–$900。这些品牌很多还只配送美国与加拿大，在澳洲或新西兰没有支援。",
    "Our approach is different by design: because every tub is bespoke, we sign off a design specification with you":"我们的做法刻意不同：因为每个浴缸都是定制，我们会在生产前与你确认并签署设计规格",
    "before":"（在生产之前）",
    "production, so there are no surprises to return. And being made and serviced in Australia means local turnaround and after-sales — not an international freight claim.":"，所以没有需要退货的意外。而且澳洲制造与服务意味着在地交期与售后——而不是一桩跨国运费索赔。",
    "Choose":"选择","stone resin":"石树脂","custom acrylic":"定制亚克力",
    "if you specifically want the dense, monolithic feel of cast stone and you're happy to work within a fixed catalogue of shapes, accept the weight and install logistics, and pay a premium.":"——如果你特别想要铸石那种厚重、整体的质感，且乐于在固定外形型录里选择、接受重量与安装的麻烦、并支付高价。",
    "if you want a genuinely original shape, a lighter and simpler installation, easier repairs, a warmer soak, a lower price with financing — and, if you're in Australia or New Zealand, local production and service.":"——如果你想要真正原创的外形、更轻更简单的安装、更好修复、更保温的泡澡、更低的价格还能分期——而且若你在澳洲或新西兰，还有在地生产与服务。",
    "That second list is exactly what we built Bathe Atelier to deliver: the only brand pairing premium acrylic with true shape customisation and online ordering.":"第二份清单正是我们打造 Bathe Atelier 要交付的：唯一将高级亚克力与真正外形定制和线上下单结合的品牌。",
    "Design yours in five minutes.":"五分钟设计出你的浴缸。",
    "Try the studio, or read why acrylic wins on the things that matter.":"试试工作室，或读读亚克力为何在关键处胜出。",
    /* contact page */
    "Draw us the bathtub your client wants — get 3D back in 48 hours.":"把你客户想要的浴缸画给我们——48 小时内拿回 3D。",
    "If you came from the design studio, your selections are attached below. The $399 design fee is fully credited to your order, or start with a free sample kit. Financing from ~AUD $130/month.":"如果你是从设计工作室过来的，你的选择已附在下方。$399 设计费可全额折抵订单，或从免费样品包开始。每月约 AUD $130 起可分期。",
    "Your design":"你的设计","Carried over from the design studio":"从设计工作室带过来",
    "🔒 We never share your project. Renders are for your eyes and your client's only.":"🔒 我们绝不外泄你的项目。渲染图只给你和你的客户看。",
    "What would you like?":"你想要什么？","Name":"姓名","You are a…":"你的身份…","Email":"电子邮件","Country / City":"国家／城市",
    "Tell us about the project (optional)":"跟我们说说这个项目（选填）","Reference sketch / photo (optional)":"参考草图／照片（选填）",
    "A photoreal 3D design — start my consultation ($399, credited to order)":"拟真 3D 设计——开始我的设计咨询（$399，可折抵订单）",
    "Free sample kit + life-size floor template":"免费样品包＋实尺地面范本",
    "Trade pricing — I'm a designer / architect":"批发价——我是设计师／建筑师","Just an estimate for now":"先要个估价就好",
    "Interior Designer":"室内设计师","Architect":"建筑师","Marketer / Brand":"行销／品牌","Homeowner":"屋主","Other":"其他",
    "Click to attach a sketch, photo or floor plan":"点击附上草图、照片或平面图",
    "⚡ A reply usually lands within hours. Our AI concierge confirms instantly, then a designer follows up with your first 3D render.":"⚡ 通常几小时内回覆。AI 助理会即时确认，接着设计师会带着你的第一张 3D 渲染图跟进。",
    "Materials Guide":"材质指南",
    "Acrylic, stone resin or copper? An honest materials guide.":"亚克力、石树脂还是铜？一份诚实的材质指南。",
    "Three materials dominate the freestanding bathtub world: acrylic, stone resin (cast stone), and copper. Each has a place — but for most real bathrooms, premium acrylic quietly wins on the things you live with every day. Here's a fair, evidence-based comparison.":"独立式浴缸主要由三种材质主导：亚克力、石树脂（铸石）与铜。每种都有它的位置——但对大多数真实的浴室而言，在你每天相处的那些点上，高级亚克力悄悄地胜出。以下是公正、有依据的比较。",
    "Updated June 2026 · ~5 min read · Bathe Atelier":"更新于 2026 年 6 月 · 约 5 分钟阅读 · Bathe Atelier",
    "Weight & installation":"重量与安装",
    "Warmth & comfort":"保温与舒适",
    "Design freedom":"设计自由度",
    "Price & value":"价格与价值",
    "Maintenance & hygiene":"维护与卫生",
    "The honest verdict":"诚实的结论",
    "Acrylic":"亚克力","Stone resin":"石树脂","Copper":"铜",
    "Weight":"重量","Heat retention":"保温性","Maintenance":"维护",
    "Lightest (27–45 kg)":"最轻（27–45 公斤）","Heavy (90–160 kg)":"重（90–160 公斤）","Very heavy (160–270 kg)":"非常重（160–270 公斤）",
    "Warm to touch, good insulator":"触感温润，隔热好","Holds a long soak longest":"长时间泡澡保温最久","Holds heat, cold to first touch":"能保温，但初触偏凉",
    "Highest — any thermoformed shape":"最高——任意热塑成型","Limited cast shapes":"铸型形状有限","Handcrafted classic forms":"手工打造的经典造型",
    "Most affordable":"最实惠","Premium":"偏高价","Most expensive":"最贵",
    "Non-porous; scratches polish out":"无孔；刮痕可抛除","Tough; chips hard to fix":"坚固；缺角难修","May patina; needs polishing":"易生铜锈；需抛光",
    "This is where the gap is widest. A freestanding acrylic tub typically weighs 27–45 kg (60–100 lb), so two people can carry it up a staircase and it sits on standard floors without reinforcement. A stone-resin tub runs 90–160 kg (200–350 lb) and a copper tub can reach 160–270 kg (350–600 lb) — both often need reinforced floors, professional handling, and curbside-only freight. For upper floors, apartments and renovations, acrylic is simply easier and cheaper to live with.":"差距最大的就在这里。独立式亚克力浴缸通常重 27–45 公斤（60–100 磅），两个人就能搬上楼梯，放在标准楼板上也不必补强。石树脂浴缸约 90–160 公斤（200–350 磅），铜浴缸更可达 160–270 公斤（350–600 磅）——两者往往需要补强楼板、专业搬运，且只送到路边。对楼上、公寓与翻修而言，亚克力就是更省事也更省钱。",
    "Acrylic has very low thermal conductivity (around 0.2 W/m·K), so the surface feels warm — never icy — the moment you touch it, and it insulates the water well. Copper and stone feel cold to first touch and draw heat away from your skin. Stone resin's one genuine edge is thermal mass: on a very long soak it can hold bathwater temperature longer. For everyday baths the difference is small, and a deeper or double-skinned acrylic design closes most of the gap.":"亚克力的导热系数很低（约 0.2 W/m·K），所以一触碰表面就觉得温润、绝不冰冷，对水也保温良好。铜与石材初触偏凉，会把热量从皮肤带走。石树脂唯一真正的优势是热质量：在很长时间的泡澡中能让水温保持更久。对日常泡澡而言差异不大，而更深或双层结构的亚克力设计能补上大部分差距。",
    "Acrylic is thermoformed over a mould, making it the most shapeable bathtub material there is — almost any curve or silhouette is achievable, which is exactly why true customisation is possible. Stone resin is limited to a fixed range of cast shapes, and copper is hand-formed by artisans into a relatively narrow set of classic forms. If you want a one-of-a-kind shape designed for a specific room, acrylic is the only material that makes it practical and affordable.":"亚克力是在模具上热塑成型，因此是可塑性最强的浴缸材料——几乎任何曲线或外形都做得到，这正是能做到真正定制的原因。石树脂只限于固定范围的铸型形状，铜则由工匠手工打造成相对有限的几款经典造型。如果你想要为特定空间设计的独一无二外形，亚克力是唯一能让它既可行又负担得起的材料。",
    "Acrylic is the most affordable premium tub material, while stone resin sits at a premium and copper is the most expensive — commonly AUD $3,000 to $15,000+ before installation. Because acrylic costs less to make and ship, you get a designer look for a fraction of the price, and financing brings it within reach of the mid-market. You spend on the design, not the dead weight.":"亚克力是最实惠的高级浴缸材料，石树脂偏高价，铜则最贵——通常在安装前就要 AUD $3,000 到 $15,000 以上。由于亚克力制造与运输成本更低，你能以一小部分的价格得到设计师级的外观，分期付款更让中端市场也负担得起。你的钱花在设计上，而不是花在死重上。",
    "Acrylic's surface is smooth and non-porous, so it resists mildew, soap scum and discolouration and wipes clean easily. Light scratches can be polished out and chips repaired invisibly at low cost. Copper needs care: raw copper patinas quickly and may need periodic polishing (sealed finishes help), and stone resin, while tough, is hard to repair seamlessly if it chips. Day to day, acrylic is the lowest-maintenance of the three.":"亚克力表面光滑且无孔，因此能抵抗霉斑、皂垢与变色，擦拭即净。轻微刮痕可抛除，缺角也能以低成本修到看不出来。铜需要照顾：原色铜很快产生铜锈，可能需定期抛光（封层处理有帮助）；石树脂虽坚固，缺角后却难以无痕修复。日常使用上，亚克力是三者中最省维护的。",
    "Choose copper if you want a statement heirloom piece and budget is no object. Choose stone resin if you specifically want maximum thermal mass and a dense, monolithic feel, and your floor can take the weight. For everyone else — and especially for a custom shape, an upper-floor bathroom, easy maintenance and a sensible budget — premium acrylic is the smart choice. It's why we build exclusively in acrylic: it gives designers the most freedom and clients the best everyday experience.":"如果你想要一件彰显身份、传家级的作品而且预算无上限，选铜。如果你特别想要最大的热质量与厚重、整体的质感，而且楼板撑得住重量，选石树脂。至于其他所有人——尤其是想要定制外形、楼上浴室、好维护又预算合理的——高级亚克力才是聪明之选。这也是我们只用亚克力打造的原因：它给设计师最大的自由，也给客户最好的日常体验。",
    "Design yours in acrylic.":"用亚克力设计你的浴缸。",
    "Try the studio, or read the deep-dive on acrylic vs stone resin.":"试试设计工作室，或阅读亚克力 vs 石树脂的深入解析。"
  };
  var DICTTH={
    "Home":"หน้าแรก","Customize":"ออกแบบเอง","Why Acrylic":"ทำไมต้องอะคริลิก","How It Works":"ขั้นตอนการทำงาน",
    "For Designers":"สำหรับนักออกแบบ","Portfolio":"ผลงาน","Start Your Design":"เริ่มออกแบบของคุณ",
    "Explore":"สำรวจ","More":"เพิ่มเติม","Contact":"ติดต่อเรา","Acrylic vs Stone Resin":"อะคริลิก เทียบกับ สโตนเรซิน",
    "Bespoke acrylic bathtubs, made one at a time. Factory-direct. Made & serviced in Australia.":"อ่างอาบน้ำอะคริลิกสั่งทำเฉพาะ ทีละใบ ส่งตรงจากโรงงาน ผลิตและบริการในออสเตรเลีย",
    "Factory-direct OEM · Made in Australia":"OEM ส่งตรงจากโรงงาน · ผลิตในออสเตรเลีย",
    "Chat with our design concierge":"คุยกับที่ปรึกษาด้านการออกแบบ",
    "Customize Your Own Bathtub →":"ออกแบบอ่างอาบน้ำของคุณเอง →","See how it works":"ดูขั้นตอนการทำงาน",
    "Open the Design Studio →":"เปิดสตูดิโอออกแบบ →","Talk to the atelier":"พูดคุยกับสตูดิโอ",
    "Apply for trade pricing →":"สมัครราคาสำหรับมืออาชีพ →","See the portfolio":"ดูผลงาน",
    "Request a sample kit":"ขอชุดตัวอย่าง","Send my request →":"ส่งคำขอของฉัน →",
    "Send this design to our atelier →":"ส่งแบบนี้ไปยังสตูดิโอของเรา →",
    "Custom Acrylic Bathtubs · Made in Australia · Factory-Direct":"อ่างอาบน้ำอะคริลิกสั่งทำ · ผลิตในออสเตรเลีย · ส่งตรงจากโรงงาน",
    "Your client imagined it.":"ลูกค้าของคุณจินตนาการมันขึ้นมา","We make it":"เราทำให้มันเป็น","the only one":"หนึ่งเดียว","in the world.":"ในโลก",
    "Premium acrylic is the most shapeable bathtub material there is — lighter to install and":"อะคริลิกพรีเมียมคือวัสดุอ่างอาบน้ำที่ขึ้นรูปได้ดีที่สุด — ติดตั้งเบากว่า และ",
    "30–50% less than stone resin":"ถูกกว่าสโตนเรซิน 30–50%",
    ". Sketch it, shape it, and our AI atelier turns your concept into a manufacturing-ready 3D model. We build it in our own factory and ship across Australia. No catalogue limits. No MOQ — every tub is a one-off.":"。แค่ร่างและกำหนดรูปทรง สตูดิโอ AI ของเราจะเปลี่ยนไอเดียของคุณให้เป็นโมเดล 3D ที่พร้อมผลิต เราผลิตในโรงงานของเราเองและจัดส่งทั่วออสเตรเลีย ไม่จำกัดแคตตาล็อก ไม่มีขั้นต่ำ — ทุกใบเป็นชิ้นเดียวในโลก",
    "concept → 3D render":"คอนเซ็ปต์ → ภาพ 3D","No MOQ":"ไม่มีขั้นต่ำ","single-piece production":"ผลิตทีละชิ้นได้",
    "Any curve":"ทุกเส้นโค้ง","built from your CAD":"สร้างจากไฟล์ CAD ของคุณ","AU-made":"ผลิตในออสเตรเลีย","local service":"บริการในพื้นที่",
    "Why Bathe Atelier":"ทำไมต้อง Bathe Atelier",
    "The only brand combining acrylic, true shape customisation, and B2C online ordering.":"แบรนด์เดียวที่รวมอะคริลิก การปรับแต่งรูปทรงอย่างแท้จริง และการสั่งซื้อออนไลน์แบบ B2C",
    "No competitor occupies this space. Premium players push stone resin and call acrylic \"cheap\" — but on the things that matter to a real project, acrylic wins.":"ไม่มีคู่แข่งครองพื้นที่นี้ แบรนด์พรีเมียมดันสโตนเรซินและบอกว่าอะคริลิก \"ถูก\" — แต่ในสิ่งที่สำคัญต่อโครงการจริง อะคริลิกชนะ",
    "One in the world":"หนึ่งเดียวในโลก",
    "Your sketch, photo or CAD becomes a real, one-of-a-kind bathtub. No MOQ — single-piece production, nothing off-the-shelf.":"ภาพร่าง รูปถ่าย หรือ CAD ของคุณกลายเป็นอ่างอาบน้ำจริงหนึ่งเดียว ไม่มีขั้นต่ำ — ผลิตทีละชิ้น ไม่ใช่ของสำเร็จรูป",
    "Built from your CAD":"สร้างจาก CAD ของคุณ",
    "Any curve, any dimension — we manufacture directly from your design files. Competitors won't even accept external CAD; we start there.":"ทุกเส้นโค้ง ทุกขนาด — เราผลิตจากไฟล์ออกแบบของคุณโดยตรง คู่แข่งไม่รับไฟล์ CAD ภายนอกด้วยซ้ำ แต่เราเริ่มจากตรงนั้น",
    "Lighter, simpler install":"เบากว่า ติดตั้งง่ายกว่า",
    "Acrylic is the lightest tub material. No 200–350 lb stone slab, no 3–4-person curbside crew — it just goes in.":"อะคริลิกเป็นวัสดุอ่างที่เบาที่สุด ไม่ต้องแผ่นหิน 200–350 ปอนด์ ไม่ต้องใช้คน 3–4 คนขนหน้าบ้าน — ติดตั้งได้เลย",
    "30–50% less + financing":"ถูกกว่า 30–50% + ผ่อนได้",
    "Premium look for a fraction of stone resin. Spread it from ~AUD $130/month with Afterpay or Zip.":"ลุคพรีเมียมในราคาเพียงเศษเสี้ยวของสโตนเรซิน ผ่อนเริ่มต้น ~AUD $130/เดือน ด้วย Afterpay หรือ Zip",
    "Made & serviced in Australia":"ผลิตและบริการในออสเตรเลีย",
    "Local production, turnaround and after-sales — a moat US brands can't match for AU/NZ.":"ผลิตในพื้นที่ รอบงานเร็ว และบริการหลังการขาย — กำแพงที่แบรนด์สหรัฐฯ สู้ไม่ได้ในออสเตรเลีย/นิวซีแลนด์",
    "Easy to repair":"ซ่อมง่าย",
    "Surface scratches and chips in acrylic are simple to fix; stone resin damage often isn't.":"รอยขีดข่วนและรอยบิ่นบนอะคริลิกซ่อมง่าย ส่วนความเสียหายของสโตนเรซินมักทำไม่ได้",
    "See the full acrylic vs stone-resin comparison →":"ดูตารางเปรียบเทียบอะคริลิกกับสโตนเรซินฉบับเต็ม →",
    "Your sketch, photo or CAD becomes a real, one-of-a-kind bathtub. No MOQ — single-piece production.":"ภาพร่าง รูปถ่าย หรือ CAD ของคุณกลายเป็นอ่างอาบน้ำจริงหนึ่งเดียว ไม่มีขั้นต่ำ — ผลิตทีละชิ้น",
    "Any curve, any dimension — straight from your design files. Competitors won't accept external CAD; we start there.":"ทุกเส้นโค้ง ทุกขนาด — ตรงจากไฟล์ออกแบบของคุณ คู่แข่งไม่รับ CAD ภายนอก แต่เราเริ่มจากตรงนั้น",
    "Acrylic is the lightest tub material. No 200–350 lb slab, no 3–4-person curbside crew.":"อะคริลิกเป็นวัสดุอ่างที่เบาที่สุด ไม่ต้องแผ่น 200–350 ปอนด์ ไม่ต้องใช้คน 3–4 คนขนหน้าบ้าน",
    "A designer delivers a photoreal 3D render plus a":"นักออกแบบส่งมอบภาพเรนเดอร์ 3D เสมือนจริง พร้อม",
    "signed design specification sheet":"เอกสารข้อกำหนดการออกแบบที่ลงนาม",
    "within 48 hours. Unlike a stone-resin brand's flat fee, this buys":" ภายใน 48 ชั่วโมง ต่างจากค่าธรรมเนียมคงที่ของแบรนด์สโตนเรซิน เงินนี้ซื้อ",
    "From Concept to Delivery":"จากคอนเซ็ปต์สู่การส่งมอบ",
    "You give us a starting point. We carry it to the finish.":"คุณให้จุดเริ่มต้น เราพาไปจนจบ",
    "Sketch your idea":"ร่างไอเดียของคุณ",
    "Use the design studio, or upload a sketch, photo, floor plan or CAD file.":"ใช้สตูดิโอออกแบบ หรืออัปโหลดภาพร่าง รูปถ่าย แปลนพื้น หรือไฟล์ CAD",
    "You · 5 min":"คุณ · 5 นาที","3D in 48 hours":"3D ใน 48 ชั่วโมง",
    "A photoreal 3D render plus a signed design spec sheet. The $399 fee is credited to your order.":"ภาพเรนเดอร์ 3D เสมือนจริง พร้อมเอกสารข้อกำหนดที่ลงนาม ค่าธรรมเนียม $399 หักคืนเข้าออร์เดอร์ของคุณ",
    "Us · 48h":"เรา · 48 ชม.","Refine together":"ปรับแต่งร่วมกัน",
    "Tweak curves, edges and dimensions over 2–3 quick rounds until it's exactly right.":"ปรับเส้นโค้ง ขอบ และขนาด 2–3 รอบจนลงตัวพอดี",
    "Together":"ร่วมกัน","Built & shipped":"ผลิตและจัดส่ง",
    "We open the mould, build it with progress photos throughout, and deliver across Australia.":"เราเปิดแม่พิมพ์ ผลิตพร้อมส่งรูปความคืบหน้าตลอดทาง และจัดส่งทั่วออสเตรเลีย",
    "Us · production":"เรา · การผลิต","See the full process & pricing →":"ดูขั้นตอนและราคาฉบับเต็ม →",
    "Ready to design the only one in the world?":"พร้อมออกแบบชิ้นเดียวในโลกหรือยัง?",
    "Build it in the studio, or send us a sketch — get a 3D render back in 48 hours.":"สร้างในสตูดิโอ หรือส่งภาพร่างมาให้เรา — รับภาพ 3D กลับใน 48 ชั่วโมง",
    "The Design Studio":"สตูดิโอออกแบบ","Shape it your way — watch it come to life.":"กำหนดรูปทรงในแบบของคุณ — แล้วดูมันเป็นจริง",
    "Give us a starting point: a silhouette, a finish, a size. That's all we need. Our team takes your concept the rest of the way to a finished, installable bathtub.":"ให้จุดเริ่มต้นแก่เรา: รูปทรง พื้นผิว ขนาด เท่านี้ก็พอ ทีมของเราจะพาคอนเซ็ปต์ของคุณไปจนเป็นอ่างอาบน้ำที่ติดตั้งได้จริง",
    "Live preview":"ตัวอย่างเรียลไทม์","Silhouette":"รูปทรง","Finish":"พื้นผิว","Size":"ขนาด","Capacity":"ความจุ","Dimensions":"ขนาด","Add-ons":"ออปชันเสริม",
    "1 · Silhouette":"1 · รูปทรง","2 · Finish & Colour":"2 · พื้นผิวและสี","3 · Dimensions":"3 · ขนาด","4 · Add-ons":"4 · ออปชันเสริม",
    "Freestanding Oval":"วงรีตั้งพื้น","Modern Rectangle":"สี่เหลี่ยมโมเดิร์น","Slipper":"ทรงสลิปเปอร์","Round Drum":"ทรงกลม","Japanese Soaking":"แช่แบบญี่ปุ่น",
    "Gloss White":"ขาวเงา","Matte Black":"ดำด้าน","Gold Leaf":"ทองคำเปลว","Marble":"หินอ่อน","Custom":"กำหนดเอง",
    "Length":"ความยาว","Width":"ความกว้าง","Depth":"ความลึก",
    "Slotted overflow":"ช่องน้ำล้นแบบร่อง","Freestanding tap":"ก๊อกตั้งพื้น","Chromotherapy LED":"ไฟ LED บำบัด","Air massage":"นวดด้วยฟองอากาศ","Headrest":"ที่รองศีรษะ",
    "Your selections travel with you to the next page. Acrylic's light density means our 3D and AR previews are faster than stone resin.":"ตัวเลือกของคุณจะถูกส่งต่อไปหน้าถัดไป ความหนาแน่นที่เบาของอะคริลิกทำให้ตัวอย่าง 3D และ AR ของเราเร็วกว่าสโตนเรซิน",
    "The premium players don't want this comparison made.":"แบรนด์พรีเมียมไม่อยากให้มีการเปรียบเทียบนี้",
    "Stone-resin brands market acrylic as \"cheaper material.\" It's an SEO tactic, not a fact. On the things a client actually lives with, premium acrylic wins — and we're the only brand pairing it with genuine shape customisation and online ordering.":"แบรนด์สโตนเรซินโฆษณาอะคริลิกว่าเป็น \"วัสดุที่ถูกกว่า\" นั่นคือกลยุทธ์ SEO ไม่ใช่ข้อเท็จจริง ในสิ่งที่ลูกค้าใช้งานจริงทุกวัน อะคริลิกพรีเมียมชนะ — และเราคือแบรนด์เดียวที่จับคู่มันกับการปรับแต่งรูปทรงอย่างแท้จริงและการสั่งซื้อออนไลน์",
    "How the two actually stack up.":"ทั้งสองเทียบกันจริง ๆ อย่างไร",
    "Bathe — Custom Acrylic":"Bathe — อะคริลิกสั่งทำ","Typical stone-resin brand":"แบรนด์สโตนเรซินทั่วไป",
    "Shape customisation":"การปรับแต่งรูปทรง","Weight & install":"น้ำหนักและการติดตั้ง","Price":"ราคา","Returns":"การคืนสินค้า","Service area":"พื้นที่บริการ","Repairs":"การซ่อม",
    "Genuine":"แท้จริง","— any curve from your sketch or CAD":"— ทุกเส้นโค้งจากภาพร่างหรือ CAD ของคุณ",
    "Size & colour only; \"custom builder\" is a relabelled catalogue":"มีแค่ขนาดและสี \"ตัวช่วยออกแบบ\" คือแคตตาล็อกที่เปลี่ยนชื่อ",
    "Light":"เบา","— two-person install, fits standard floors":"— สองคนติดตั้งได้ รองรับพื้นมาตรฐาน",
    "200–350 lb; curbside-only, needs a 3–4-person crew":"200–350 ปอนด์ ส่งถึงหน้าบ้านเท่านั้น ต้องใช้คน 3–4 คน",
    "30–50% less":"ถูกกว่า 30–50%",", financing from ~$130/mo":" ผ่อนเริ่มต้น ~$130/เดือน",
    "Premium pricing, US-style checkout":"ราคาพรีเมียม ชำระเงินแบบสหรัฐฯ",
    "Fair":"เป็นธรรม","— bespoke spec signed off before we build":"— ยืนยันและลงนามสเปกก่อนเริ่มผลิต",
    "14-day window + both-way freight + 10% restock ($600–$900 on a $3k tub)":"คืนได้ 14 วัน + ค่าขนส่งสองทาง + ค่าวางสต็อก 10% (อ่าง $3,000 เสีย $600–$900)",
    "US / Canada only — no AU/NZ shipping or support":"เฉพาะสหรัฐฯ/แคนาดา — ไม่ส่งหรือซัพพอร์ตออสเตรเลีย/นิวซีแลนด์",
    "Easy":"ง่าย","surface repair on acrylic":"ซ่อมผิวอะคริลิกได้","Chips in stone resin are hard to fix":"รอยบิ่นบนสโตนเรซินซ่อมยาก",
    "Read the full guide: Acrylic vs Stone Resin →":"อ่านคู่มือฉบับเต็ม: อะคริลิก เทียบกับ สโตนเรซิน →",
    "See it in your finish, your size.":"ดูในพื้นผิวและขนาดของคุณ",
    "Open the design studio and watch your one-of-a-kind tub take shape.":"เปิดสตูดิโอออกแบบ แล้วดูอ่างหนึ่งเดียวของคุณเป็นรูปเป็นร่าง",
    "A rough direction is all we need. Here's exactly what happens — and what it costs — from first sketch to a finished tub installed in your client's bathroom.":"แค่ทิศทางคร่าว ๆ ก็พอ นี่คือสิ่งที่จะเกิดขึ้น — และค่าใช้จ่าย — ตั้งแต่ภาพร่างแรกจนถึงอ่างที่ติดตั้งเสร็จในห้องน้ำลูกค้าของคุณ",
    "Use the design studio, upload a sketch, photo, floor plan or CAD file — or request the free sample kit first. A rough direction is enough.":"ใช้สตูดิโอออกแบบ อัปโหลดภาพร่าง รูปถ่าย แปลนพื้น หรือไฟล์ CAD — หรือขอชุดตัวอย่างฟรีก่อน แค่ทิศทางคร่าว ๆ ก็พอ",
    "Our AI atelier turns your concept into a photoreal 3D render plus a signed design spec sheet. The $399 consultation fee is credited to your order.":"สตูดิโอ AI ของเราเปลี่ยนคอนเซ็ปต์ของคุณเป็นภาพเรนเดอร์ 3D เสมือนจริง พร้อมเอกสารข้อกำหนดที่ลงนาม ค่าที่ปรึกษา $399 หักคืนเข้าออร์เดอร์",
    "Tweak curves, edges and dimensions over 2–3 quick rounds until it's exactly right — then we lock the manufacturing files.":"ปรับเส้นโค้ง ขอบ และขนาด 2–3 รอบจนลงตัว — จากนั้นเราล็อกไฟล์สำหรับผลิต",
    "We open the mould and build it, sending production progress photos throughout. One bathtub, delivered across Australia.":"เราเปิดแม่พิมพ์และผลิต พร้อมส่งรูปความคืบหน้าตลอด หนึ่งอ่าง จัดส่งทั่วออสเตรเลีย",
    "Two Easy Ways to Start":"สองวิธีง่าย ๆ ในการเริ่ม","Touch it first, or go straight to a 3D design.":"สัมผัสก่อน หรือไปที่การออกแบบ 3D เลย",
    "Lead magnet":"ของแถมดึงดูด","Free Sample Kit":"ชุดตัวอย่างฟรี","FREE":"ฟรี",
    "Acrylic finish swatches (gloss, matte, colours) plus a life-size paper floor template so you can lay out the tub in the actual room — shipped to your door. Acrylic's lighter density also makes our 3D and AR previews faster than stone resin.":"แผ่นตัวอย่างพื้นผิวอะคริลิก (เงา ด้าน สีต่าง ๆ) พร้อมแบบกระดาษขนาดเท่าจริงเพื่อจัดวางอ่างในห้องจริง — ส่งถึงบ้าน ความหนาแน่นที่เบาของอะคริลิกยังทำให้ตัวอย่าง 3D และ AR ของเราเร็วกว่าสโตนเรซิน",
    "Best for serious projects":"เหมาะกับโครงการจริงจัง","Paid Design Consultation":"บริการที่ปรึกษาออกแบบ (มีค่าใช้จ่าย)",
    "— fully credited to your order":"— หักคืนเข้าออร์เดอร์เต็มจำนวน",
    "genuine shape customisation":"การปรับแต่งรูปทรงอย่างแท้จริง","— and the fee comes straight off your final price.":"— และค่าธรรมเนียมหักออกจากราคาสุดท้ายโดยตรง",
    "💳 Financing available — a $4,000 custom tub from ~AUD $130/month with Afterpay or Zip.":"💳 ผ่อนได้ — อ่างสั่งทำ $4,000 เริ่มต้น ~AUD $130/เดือน ด้วย Afterpay หรือ Zip",
    "Start with a 5-minute design.":"เริ่มด้วยการออกแบบ 5 นาที",
    "Build it in the studio, then send it over — or request your free sample kit.":"สร้างในสตูดิโอ แล้วส่งมา — หรือขอชุดตัวอย่างฟรีของคุณ",
    "For Interior Designers & Architects":"สำหรับนักออกแบบภายในและสถาปนิก",
    "Make the bathtub your signature, not your bottleneck.":"ทำให้อ่างอาบน้ำเป็นลายเซ็นของคุณ ไม่ใช่คอขวด",
    "You decide what belongs in your client's home. We become the silent workshop behind your most ambitious pieces — fast, discreet, and trade-priced.":"คุณตัดสินใจว่าอะไรควรอยู่ในบ้านลูกค้า เราคือเวิร์กช็อปเงียบ ๆ เบื้องหลังผลงานที่ทะเยอทะยานที่สุดของคุณ — รวดเร็ว เป็นความลับ และราคามืออาชีพ",
    "The Trade Programme":"โปรแกรมสำหรับมืออาชีพ","Built for the way designers actually work.":"ออกแบบมาเพื่อวิธีทำงานจริงของนักออกแบบ",
    "No catalogue limits, no external-CAD refusals, no waiting in a general queue. Bring the curve you've been told is \"not possible\" — that's our starting point.":"ไม่จำกัดแคตตาล็อก ไม่ปฏิเสธ CAD ภายนอก ไม่ต้องรอคิวทั่วไป เอาเส้นโค้งที่เคยถูกบอกว่า \"ทำไม่ได้\" มา — นั่นคือจุดเริ่มต้นของเรา",
    "Trade pricing — 15–25% off retail, factory-direct":"ราคามืออาชีพ — ลด 15–25% จากราคาขายปลีก ส่งตรงจากโรงงาน",
    "We build directly from your CAD — any curve, any dimension":"เราผลิตจาก CAD ของคุณโดยตรง — ทุกเส้นโค้ง ทุกขนาด",
    "Sample priority + a dedicated account contact, not a queue":"ตัวอย่างได้ก่อน + มีผู้ดูแลบัญชีเฉพาะ ไม่ใช่คิวรวม",
    "White-glove 3D rounds you can present straight to your client":"งาน 3D ระดับพรีเมียมที่นำเสนอลูกค้าได้ทันที",
    "Specialty finishes: gold leaf, matte, stone-look, custom colour-match":"พื้นผิวพิเศษ: ทองคำเปลว ด้าน เลียนแบบหิน จับคู่สีตามต้องการ",
    "$500 credit when you share the finished installation photos":"รับเครดิต $500 เมื่อแชร์รูปติดตั้งที่เสร็จแล้ว",
    "How we fit your studio":"เราเข้ากับสตูดิโอของคุณอย่างไร","Three ways designers use Bathe Atelier.":"สามวิธีที่นักออกแบบใช้ Bathe Atelier",
    "CAD-to-production":"จาก CAD สู่การผลิต",
    "Send your Rhino, SketchUp or DWG file. We manufacture to it directly — the structural advantage stone-resin brands can't offer.":"ส่งไฟล์ Rhino, SketchUp หรือ DWG ของคุณ เราผลิตตามนั้นโดยตรง — ข้อได้เปรียบเชิงโครงสร้างที่แบรนด์สโตนเรซินให้ไม่ได้",
    "White-label storefront":"หน้าร้านแบบไวต์เลเบล",
    "Showcase your own bathtub designs; we manufacture only when your client orders. You keep the relationship and the margin.":"จัดแสดงแบบอ่างของคุณเอง เราผลิตเมื่อลูกค้าสั่งเท่านั้น คุณรักษาความสัมพันธ์และกำไรไว้",
    "One-off statement pieces":"ผลงานชิ้นเดียวโดดเด่น",
    "A single sculptural tub for a hero project — no MOQ, full spec sign-off, progress photos throughout.":"อ่างประติมากรรมหนึ่งใบสำหรับโครงการเด่น — ไม่มีขั้นต่ำ ลงนามสเปกครบ ส่งรูปความคืบหน้าตลอด",
    "Let's make your next signature piece.":"มาสร้างผลงานลายเซ็นชิ้นต่อไปของคุณกัน",
    "Apply for trade pricing, or send a project brief — we'll reply with next steps and a sample kit.":"สมัครราคามืออาชีพ หรือส่งบรีฟโครงการ — เราจะตอบกลับพร้อมขั้นตอนถัดไปและชุดตัวอย่าง",
    "Every piece made for a single project.":"ทุกชิ้นทำเพื่อโครงการเดียว",
    "A selection of silhouettes, finishes and configurations we've shaped. Each one is unique — none is a catalogue item. Yours will be too.":"ตัวอย่างรูปทรง พื้นผิว และการกำหนดค่าที่เราเคยทำ แต่ละชิ้นไม่ซ้ำใคร — ไม่มีชิ้นไหนเป็นสินค้าแคตตาล็อก ของคุณก็จะเป็นเช่นนั้น",
    "Renders shown are configuration concepts from our design studio. Replace with real project photography as installs complete (e.g. via the $500 install-photo credit).":"ภาพที่แสดงเป็นคอนเซ็ปต์จากสตูดิโอออกแบบของเรา จะแทนที่ด้วยภาพถ่ายโครงการจริงเมื่อติดตั้งเสร็จ (เช่น ผ่านเครดิตรูปติดตั้ง $500)",
    "Picture yours here.":"ลองนึกภาพผลงานของคุณตรงนี้",
    "Start in the design studio and we'll turn it into a 3D render within 48 hours.":"เริ่มในสตูดิโอออกแบบ แล้วเราจะเปลี่ยนเป็นภาพ 3D ภายใน 48 ชั่วโมง",
    "Buying Guide":"คู่มือการเลือกซื้อ","Acrylic vs Stone Resin Bathtubs: Which Is Right for You?":"อ่างอะคริลิก เทียบกับ สโตนเรซิน: แบบไหนเหมาะกับคุณ?",
    "Premium brands have spent years framing acrylic as the \"cheap\" option. Here's the honest, point-by-point comparison so you can decide for your own bathroom — not theirs.":"แบรนด์พรีเมียมใช้เวลาหลายปีวางภาพอะคริลิกให้เป็นตัวเลือก \"ราคาถูก\" นี่คือการเปรียบเทียบอย่างตรงไปตรงมาทีละข้อ เพื่อให้คุณตัดสินใจเพื่อห้องน้ำของคุณเอง — ไม่ใช่ของพวกเขา",
    "Updated June 2026 · ~6 min read · Bathe Atelier":"อัปเดตมิถุนายน 2026 · อ่าน ~6 นาที · Bathe Atelier",
    "In this guide":"ในคู่มือนี้","1. Shape customisation":"1. การปรับแต่งรูปทรง","2. Weight & installation":"2. น้ำหนักและการติดตั้ง",
    "3. Price & financing":"3. ราคาและการผ่อน","4. Warmth, comfort & repairs":"4. ความอุ่น ความสบาย และการซ่อม",
    "5. Returns & delivery":"5. การคืนและการจัดส่ง","6. The verdict":"6. บทสรุป",
    "Both acrylic and stone resin (also called cast stone or \"cultured stone\") make beautiful freestanding bathtubs. The marketing around them, however, is far from neutral. Several premium stone-resin brands explicitly position against acrylic in their own content to justify higher prices. That's a sales tactic — and it has quietly shaped how a lot of buyers think. Let's look at what actually differs.":"ทั้งอะคริลิกและสโตนเรซิน (หรือที่เรียกว่าหินหล่อหรือ \"หินเทียม\") ต่างก็ทำอ่างอาบน้ำตั้งพื้นที่สวยงามได้ แต่การตลาดรอบ ๆ มันกลับไม่เป็นกลาง แบรนด์สโตนเรซินพรีเมียมหลายเจ้าจงใจวางตำแหน่งต้านอะคริลิกในเนื้อหาของตนเพื่อสร้างความชอบธรรมให้ราคาที่สูงกว่า นั่นเป็นกลยุทธ์การขาย — และมันค่อย ๆ หล่อหลอมความคิดของผู้ซื้อจำนวนมาก มาดูกันว่าจริง ๆ แล้วต่างกันตรงไหน",
    "This is the biggest practical difference, and it rarely makes the brochure. Most \"custom\" bathtub builders online only let you change size and colour; the silhouette is fixed. Acrylic, by contrast, is the most":"นี่คือความแตกต่างที่สำคัญที่สุดในทางปฏิบัติ แต่แทบไม่เคยอยู่ในโบรชัวร์ ตัวช่วยออกแบบอ่าง \"สั่งทำ\" ออนไลน์ส่วนใหญ่ให้เปลี่ยนแค่ขนาดและสี รูปทรงถูกล็อกไว้ ในทางกลับกัน อะคริลิกคือวัสดุที่",
    "formable":"ขึ้นรูปได้ดีที่สุด",
    "bathtub material there is — it's heat-formed over a mould, so a genuinely new curve is a question of tooling, not chemistry.":"— มันขึ้นรูปด้วยความร้อนบนแม่พิมพ์ ดังนั้นเส้นโค้งใหม่จริง ๆ จึงเป็นเรื่องของแม่พิมพ์ ไม่ใช่เคมีของวัสดุ",
    "That's why we manufacture directly from a customer's or designer's CAD file. Any curve, any dimension. Stone-resin processes can technically be moulded too, but most brands won't accept external design files at all — so in practice your shape options are whatever is already in their range.":"นั่นคือเหตุผลที่เราผลิตจากไฟล์ CAD ของลูกค้าหรือนักออกแบบโดยตรง ทุกเส้นโค้ง ทุกขนาด กระบวนการสโตนเรซินก็หล่อแม่พิมพ์ได้ในทางเทคนิค แต่แบรนด์ส่วนใหญ่ไม่รับไฟล์ออกแบบภายนอกเลย — ในทางปฏิบัติตัวเลือกรูปทรงของคุณจึงมีแค่ที่มีอยู่แล้วในไลน์ของพวกเขา",
    "If a brand's \"custom tub builder\" only offers size and colour, it isn't really customisation — it's a relabelled catalogue.":"ถ้า \"ตัวช่วยออกแบบอ่าง\" ของแบรนด์ให้แค่ขนาดและสี นั่นไม่ใช่การสั่งทำจริง — แต่เป็นแคตตาล็อกที่เปลี่ยนชื่อ",
    "Stone resin is heavy — commonly 200–350 lb (90–160 kg) empty. That has real consequences: many brands deliver curbside only, leaving you to arrange a 3–4-person crew to move the tub inside and upstairs, and your floor structure may need checking for a second-storey install.":"สโตนเรซินหนัก — โดยทั่วไป 200–350 ปอนด์ (90–160 กก.) ตอนเปล่า นั่นมีผลจริง: หลายแบรนด์ส่งถึงหน้าบ้านเท่านั้น คุณต้องจัดหาคน 3–4 คนยกอ่างเข้าบ้านและขึ้นชั้นบน และโครงสร้างพื้นอาจต้องตรวจสอบสำหรับการติดตั้งชั้นสอง",
    "Acrylic is the lightest tub material by a wide margin. A typical freestanding acrylic tub is a comfortable two-person lift, fits standard residential floors without reinforcement, and is far simpler (and cheaper) to freight.":"อะคริลิกเป็นวัสดุอ่างที่เบาที่สุดอย่างชัดเจน อ่างอะคริลิกตั้งพื้นทั่วไปสองคนยกสบาย รองรับพื้นที่อยู่อาศัยมาตรฐานโดยไม่ต้องเสริม และขนส่งง่าย (และถูก) กว่ามาก",
    "For a comparable size and finish, custom acrylic typically runs":"สำหรับขนาดและพื้นผิวที่ใกล้เคียงกัน อะคริลิกสั่งทำมักจะ",
    "than stone resin — partly the material, partly lighter freight, partly cutting out middlemen with factory-direct production. Lower entry price also makes financing realistic: a $4,000 custom tub can sit around ~AUD $130/month with Afterpay or Zip, which removes the biggest hesitation for mid-market buyers.":"กว่าสโตนเรซิน — ส่วนหนึ่งเพราะวัสดุ ส่วนหนึ่งเพราะค่าขนส่งที่เบากว่า ส่วนหนึ่งเพราะตัดคนกลางด้วยการผลิตส่งตรงจากโรงงาน ราคาเริ่มต้นที่ต่ำกว่ายังทำให้การผ่อนเป็นจริงได้: อ่างสั่งทำ $4,000 อยู่ที่ราว ~AUD $130/เดือน ด้วย Afterpay หรือ Zip ซึ่งขจัดความลังเลที่ใหญ่ที่สุดของผู้ซื้อตลาดกลาง",
    "Acrylic has naturally low thermal conductivity, so it feels warm to the touch and holds heat well during a soak. Stone resin feels more substantial and \"solid,\" which some buyers prefer, but it can feel colder initially and is heavier to live with.":"อะคริลิกนำความร้อนต่ำโดยธรรมชาติ จึงสัมผัสอุ่นและเก็บความร้อนได้ดีระหว่างแช่ สโตนเรซินให้สัมผัสที่หนักแน่นและ \"ตัน\" กว่า ซึ่งผู้ซื้อบางคนชอบ แต่ตอนแรกอาจรู้สึกเย็นกว่าและหนักกว่าในการใช้ชีวิตประจำวัน",
    "On durability, both wear well. The difference shows up in":"ด้านความทนทาน ทั้งคู่ทนดี ความต่างปรากฏที่",
    "repairs":"การซ่อม",
    ": a scratch or surface chip in acrylic can usually be polished or filled and blended; damage in stone resin is harder to fix invisibly. For a piece you'll keep for years, easy repairability matters.":": รอยขีดข่วนหรือรอยบิ่นบนอะคริลิกมักขัดหรืออุดและเกลี่ยให้เนียนได้ ส่วนความเสียหายของสโตนเรซินซ่อมให้มองไม่เห็นได้ยากกว่า สำหรับของที่จะใช้หลายปี ความง่ายในการซ่อมสำคัญ",
    "Read the returns policy before you buy anything in this category. Heavy stone-resin tubs often carry punishing terms — a short return window, customer-paid freight both ways, and a restocking fee. On a $3,000 tub, sending it back can cost the buyer $600–$900. Many of these brands also ship only within the US and Canada, with no support in Australia or New Zealand.":"อ่านนโยบายการคืนก่อนซื้ออะไรในหมวดนี้ อ่างสโตนเรซินที่หนักมักมีเงื่อนไขที่โหด — ระยะเวลาคืนสั้น ลูกค้าจ่ายค่าขนส่งทั้งสองทาง และค่าวางสต็อกใหม่ อ่าง $3,000 ส่งคืนอาจทำให้ผู้ซื้อเสีย $600–$900 แบรนด์เหล่านี้หลายเจ้ายังส่งเฉพาะในสหรัฐฯ และแคนาดา โดยไม่มีบริการในออสเตรเลียหรือนิวซีแลนด์",
    "Our approach is different by design: because every tub is bespoke, we sign off a design specification with you":"แนวทางของเราต่างโดยตั้งใจ: เพราะทุกอ่างเป็นงานสั่งทำ เราจึงยืนยันและลงนามข้อกำหนดการออกแบบร่วมกับคุณ",
    "before":"(ก่อนการผลิต)",
    "production, so there are no surprises to return. And being made and serviced in Australia means local turnaround and after-sales — not an international freight claim.":" ดังนั้นจึงไม่มีเรื่องเซอร์ไพรส์ให้ต้องคืน และการผลิตและบริการในออสเตรเลียหมายถึงรอบงานและบริการหลังการขายในพื้นที่ — ไม่ใช่การเคลมค่าขนส่งข้ามประเทศ",
    "Choose":"เลือก","stone resin":"สโตนเรซิน","custom acrylic":"อะคริลิกสั่งทำ",
    "if you specifically want the dense, monolithic feel of cast stone and you're happy to work within a fixed catalogue of shapes, accept the weight and install logistics, and pay a premium.":" หากคุณต้องการสัมผัสที่หนักแน่นเป็นเนื้อเดียวของหินหล่อโดยเฉพาะ และยินดีเลือกจากแคตตาล็อกรูปทรงที่ตายตัว ยอมรับน้ำหนักและการขนส่งติดตั้ง และจ่ายราคาพรีเมียม",
    "if you want a genuinely original shape, a lighter and simpler installation, easier repairs, a warmer soak, a lower price with financing — and, if you're in Australia or New Zealand, local production and service.":" หากคุณต้องการรูปทรงที่เป็นต้นฉบับจริง ๆ การติดตั้งที่เบาและง่ายกว่า ซ่อมง่ายกว่า แช่อุ่นกว่า ราคาถูกกว่าพร้อมผ่อนได้ — และถ้าคุณอยู่ในออสเตรเลียหรือนิวซีแลนด์ ก็มีการผลิตและบริการในพื้นที่",
    "That second list is exactly what we built Bathe Atelier to deliver: the only brand pairing premium acrylic with true shape customisation and online ordering.":"รายการที่สองนั้นคือสิ่งที่เราสร้าง Bathe Atelier ขึ้นมาเพื่อมอบให้: แบรนด์เดียวที่จับคู่อะคริลิกพรีเมียมกับการปรับแต่งรูปทรงอย่างแท้จริงและการสั่งซื้อออนไลน์",
    "Design yours in five minutes.":"ออกแบบของคุณใน 5 นาที",
    "Try the studio, or read why acrylic wins on the things that matter.":"ลองใช้สตูดิโอ หรืออ่านว่าทำไมอะคริลิกชนะในสิ่งที่สำคัญ",
    "Draw us the bathtub your client wants — get 3D back in 48 hours.":"วาดอ่างที่ลูกค้าของคุณต้องการมาให้เรา — รับ 3D กลับใน 48 ชั่วโมง",
    "If you came from the design studio, your selections are attached below. The $399 design fee is fully credited to your order, or start with a free sample kit. Financing from ~AUD $130/month.":"ถ้าคุณมาจากสตูดิโอออกแบบ ตัวเลือกของคุณแนบอยู่ด้านล่าง ค่าออกแบบ $399 หักคืนเข้าออร์เดอร์เต็มจำนวน หรือเริ่มด้วยชุดตัวอย่างฟรี ผ่อนเริ่มต้น ~AUD $130/เดือน",
    "Your design":"แบบของคุณ","Carried over from the design studio":"นำมาจากสตูดิโอออกแบบ",
    "🔒 We never share your project. Renders are for your eyes and your client's only.":"🔒 เราไม่เปิดเผยโครงการของคุณ ภาพเรนเดอร์มีไว้สำหรับคุณและลูกค้าของคุณเท่านั้น",
    "What would you like?":"คุณต้องการอะไร?","Name":"ชื่อ","You are a…":"คุณคือ…","Email":"อีเมล","Country / City":"ประเทศ / เมือง",
    "Tell us about the project (optional)":"เล่าเกี่ยวกับโครงการ (ไม่บังคับ)","Reference sketch / photo (optional)":"ภาพร่าง / รูปอ้างอิง (ไม่บังคับ)",
    "A photoreal 3D design — start my consultation ($399, credited to order)":"งานออกแบบ 3D เสมือนจริง — เริ่มการปรึกษา ($399 หักคืนเข้าออร์เดอร์)",
    "Free sample kit + life-size floor template":"ชุดตัวอย่างฟรี + แบบพื้นขนาดเท่าจริง",
    "Trade pricing — I'm a designer / architect":"ราคามืออาชีพ — ฉันเป็นนักออกแบบ / สถาปนิก","Just an estimate for now":"ขอแค่ประเมินราคาก่อน",
    "Interior Designer":"นักออกแบบภายใน","Architect":"สถาปนิก","Marketer / Brand":"นักการตลาด / แบรนด์","Homeowner":"เจ้าของบ้าน","Other":"อื่น ๆ",
    "Click to attach a sketch, photo or floor plan":"คลิกเพื่อแนบภาพร่าง รูปถ่าย หรือแปลนพื้น",
    "⚡ A reply usually lands within hours. Our AI concierge confirms instantly, then a designer follows up with your first 3D render.":"⚡ ปกติตอบกลับภายในไม่กี่ชั่วโมง ผู้ช่วย AI ยืนยันทันที จากนั้นนักออกแบบจะติดตามพร้อมภาพ 3D แรกของคุณ",
    "Materials Guide":"คู่มือวัสดุ",
    "Acrylic, stone resin or copper? An honest materials guide.":"อะคริลิก สโตนเรซิน หรือทองแดง? คู่มือวัสดุอย่างตรงไปตรงมา",
    "Three materials dominate the freestanding bathtub world: acrylic, stone resin (cast stone), and copper. Each has a place — but for most real bathrooms, premium acrylic quietly wins on the things you live with every day. Here's a fair, evidence-based comparison.":"โลกของอ่างอาบน้ำตั้งพื้นมีสามวัสดุหลัก: อะคริลิก สโตนเรซิน (หินหล่อ) และทองแดง แต่ละอย่างมีที่ของมัน — แต่สำหรับห้องน้ำจริงส่วนใหญ่ อะคริลิกพรีเมียมชนะอย่างเงียบ ๆ ในสิ่งที่คุณใช้งานทุกวัน นี่คือการเปรียบเทียบอย่างเป็นธรรมและมีหลักฐาน",
    "Updated June 2026 · ~5 min read · Bathe Atelier":"อัปเดตมิถุนายน 2026 · อ่าน ~5 นาที · Bathe Atelier",
    "Weight & installation":"น้ำหนักและการติดตั้ง",
    "Warmth & comfort":"ความอุ่นและความสบาย",
    "Design freedom":"อิสระในการออกแบบ",
    "Price & value":"ราคาและความคุ้มค่า",
    "Maintenance & hygiene":"การดูแลและสุขอนามัย",
    "The honest verdict":"บทสรุปอย่างตรงไปตรงมา",
    "Acrylic":"อะคริลิก","Stone resin":"สโตนเรซิน","Copper":"ทองแดง",
    "Weight":"น้ำหนัก","Heat retention":"การเก็บความร้อน","Maintenance":"การดูแล",
    "Lightest (27–45 kg)":"เบาที่สุด (27–45 กก.)","Heavy (90–160 kg)":"หนัก (90–160 กก.)","Very heavy (160–270 kg)":"หนักมาก (160–270 กก.)",
    "Warm to touch, good insulator":"สัมผัสอุ่น เป็นฉนวนดี","Holds a long soak longest":"เก็บความร้อนการแช่นานได้นานสุด","Holds heat, cold to first touch":"เก็บความร้อนได้ แต่สัมผัสแรกเย็น",
    "Highest — any thermoformed shape":"สูงสุด — ขึ้นรูปด้วยความร้อนได้ทุกทรง","Limited cast shapes":"รูปทรงหล่อจำกัด","Handcrafted classic forms":"งานทำมือทรงคลาสสิก",
    "Most affordable":"คุ้มค่าที่สุด","Premium":"ราคาสูง","Most expensive":"แพงที่สุด",
    "Non-porous; scratches polish out":"ไม่มีรูพรุน ขัดรอยขีดข่วนออกได้","Tough; chips hard to fix":"แข็งแรง แต่รอยบิ่นซ่อมยาก","May patina; needs polishing":"อาจเกิดคราบ ต้องขัดเงา",
    "This is where the gap is widest. A freestanding acrylic tub typically weighs 27–45 kg (60–100 lb), so two people can carry it up a staircase and it sits on standard floors without reinforcement. A stone-resin tub runs 90–160 kg (200–350 lb) and a copper tub can reach 160–270 kg (350–600 lb) — both often need reinforced floors, professional handling, and curbside-only freight. For upper floors, apartments and renovations, acrylic is simply easier and cheaper to live with.":"นี่คือจุดที่ต่างกันมากที่สุด อ่างอะคริลิกตั้งพื้นทั่วไปหนัก 27–45 กก. (60–100 ปอนด์) สองคนยกขึ้นบันไดได้ และวางบนพื้นมาตรฐานได้โดยไม่ต้องเสริมโครงสร้าง อ่างสโตนเรซินหนัก 90–160 กก. (200–350 ปอนด์) และอ่างทองแดงอาจถึง 160–270 กก. (350–600 ปอนด์) — ทั้งคู่มักต้องเสริมพื้น ใช้ทีมขนมืออาชีพ และส่งถึงหน้าบ้านเท่านั้น สำหรับชั้นบน คอนโด และงานรีโนเวต อะคริลิกง่ายและประหยัดกว่าชัดเจน",
    "Acrylic has very low thermal conductivity (around 0.2 W/m·K), so the surface feels warm — never icy — the moment you touch it, and it insulates the water well. Copper and stone feel cold to first touch and draw heat away from your skin. Stone resin's one genuine edge is thermal mass: on a very long soak it can hold bathwater temperature longer. For everyday baths the difference is small, and a deeper or double-skinned acrylic design closes most of the gap.":"อะคริลิกนำความร้อนต่ำมาก (ราว 0.2 W/m·K) พื้นผิวจึงสัมผัสอุ่น — ไม่เย็นเฉียบ — ตั้งแต่แตะ และเป็นฉนวนให้น้ำได้ดี ทองแดงและหินสัมผัสแรกเย็นและดึงความร้อนออกจากผิว ข้อได้เปรียบจริงข้อเดียวของสโตนเรซินคือมวลความร้อน: ในการแช่ที่นานมากมันเก็บอุณหภูมิน้ำได้นานกว่า สำหรับการอาบน้ำทั่วไปความต่างเล็กน้อย และดีไซน์อะคริลิกที่ลึกกว่าหรือผนังสองชั้นช่วยปิดช่องว่างได้เกือบหมด",
    "Acrylic is thermoformed over a mould, making it the most shapeable bathtub material there is — almost any curve or silhouette is achievable, which is exactly why true customisation is possible. Stone resin is limited to a fixed range of cast shapes, and copper is hand-formed by artisans into a relatively narrow set of classic forms. If you want a one-of-a-kind shape designed for a specific room, acrylic is the only material that makes it practical and affordable.":"อะคริลิกขึ้นรูปด้วยความร้อนบนแม่พิมพ์ จึงเป็นวัสดุอ่างที่ขึ้นรูปได้ดีที่สุด — แทบทุกเส้นโค้งหรือรูปทรงทำได้ ซึ่งเป็นเหตุผลที่การสั่งทำจริงเป็นไปได้ สโตนเรซินจำกัดอยู่ที่รูปทรงหล่อตายตัว ส่วนทองแดงขึ้นรูปด้วยมือช่างเป็นทรงคลาสสิกไม่กี่แบบ หากคุณต้องการรูปทรงหนึ่งเดียวที่ออกแบบเพื่อห้องเฉพาะ อะคริลิกเป็นวัสดุเดียวที่ทำให้เป็นจริงได้และจ่ายไหว",
    "Acrylic is the most affordable premium tub material, while stone resin sits at a premium and copper is the most expensive — commonly AUD $3,000 to $15,000+ before installation. Because acrylic costs less to make and ship, you get a designer look for a fraction of the price, and financing brings it within reach of the mid-market. You spend on the design, not the dead weight.":"อะคริลิกเป็นวัสดุอ่างพรีเมียมที่คุ้มค่าที่สุด ขณะที่สโตนเรซินราคาสูงและทองแดงแพงที่สุด — โดยทั่วไป AUD $3,000 ถึง $15,000 ขึ้นไปก่อนติดตั้ง เพราะอะคริลิกผลิตและขนส่งถูกกว่า คุณจึงได้ลุคระดับดีไซเนอร์ในราคาเพียงเศษเสี้ยว และการผ่อนทำให้ตลาดกลางเอื้อมถึง คุณจ่ายไปกับการออกแบบ ไม่ใช่กับน้ำหนักที่ไร้ประโยชน์",
    "Acrylic's surface is smooth and non-porous, so it resists mildew, soap scum and discolouration and wipes clean easily. Light scratches can be polished out and chips repaired invisibly at low cost. Copper needs care: raw copper patinas quickly and may need periodic polishing (sealed finishes help), and stone resin, while tough, is hard to repair seamlessly if it chips. Day to day, acrylic is the lowest-maintenance of the three.":"พื้นผิวอะคริลิกเรียบและไม่มีรูพรุน จึงต้านเชื้อรา คราบสบู่ และการเปลี่ยนสี เช็ดทำความสะอาดง่าย รอยขีดข่วนเล็กน้อยขัดออกได้ และรอยบิ่นซ่อมให้มองไม่เห็นได้ในราคาต่ำ ทองแดงต้องดูแล: ทองแดงดิบเกิดคราบเร็วและอาจต้องขัดเงาเป็นระยะ (ผิวเคลือบช่วยได้) ส่วนสโตนเรซินแม้แข็งแรงแต่ซ่อมให้เนียนยากเมื่อบิ่น ในชีวิตประจำวัน อะคริลิกดูแลง่ายที่สุดในสามอย่าง",
    "Choose copper if you want a statement heirloom piece and budget is no object. Choose stone resin if you specifically want maximum thermal mass and a dense, monolithic feel, and your floor can take the weight. For everyone else — and especially for a custom shape, an upper-floor bathroom, easy maintenance and a sensible budget — premium acrylic is the smart choice. It's why we build exclusively in acrylic: it gives designers the most freedom and clients the best everyday experience.":"เลือกทองแดงถ้าคุณต้องการชิ้นงานตกทอดที่โดดเด่นและไม่จำกัดงบ เลือกสโตนเรซินถ้าคุณต้องการมวลความร้อนสูงสุดและสัมผัสที่หนักแน่นเป็นเนื้อเดียว และพื้นรับน้ำหนักไหว สำหรับคนอื่น ๆ ทั้งหมด — โดยเฉพาะรูปทรงสั่งทำ ห้องน้ำชั้นบน การดูแลที่ง่าย และงบที่สมเหตุผล — อะคริลิกพรีเมียมคือทางเลือกที่ฉลาด นี่คือเหตุผลที่เราผลิตด้วยอะคริลิกเท่านั้น: มันให้อิสระแก่ดีไซเนอร์มากที่สุด และให้ลูกค้าได้ประสบการณ์ประจำวันที่ดีที่สุด",
    "Design yours in acrylic.":"ออกแบบของคุณด้วยอะคริลิก",
    "Try the studio, or read the deep-dive on acrylic vs stone resin.":"ลองใช้สตูดิโอ หรืออ่านบทวิเคราะห์เชิงลึกอะคริลิก vs สโตนเรซิน"
  };
  var TITLES={
    "Bathe Atelier — Custom Acrylic Bathtubs, Made in Australia":"Bathe Atelier — 定制亚克力浴缸，澳洲制造",
    "Design Studio — Customize Your Own Bathtub | Bathe Atelier":"设计工作室 — 定制你的专属浴缸 | Bathe Atelier",
    "Why Acrylic — Lighter, Shapeable, 30–50% Less | Bathe Atelier":"为什么选亚克力 — 更轻、可塑、便宜 30–50% | Bathe Atelier",
    "How It Works — Concept to Delivery in 4 Steps | Bathe Atelier":"流程介绍 — 从概念到交付四步骤 | Bathe Atelier",
    "For Designers — Trade Programme | Bathe Atelier":"设计师专区 — 批发合作方案 | Bathe Atelier",
    "Portfolio — One-of-a-Kind Acrylic Bathtubs | Bathe Atelier":"作品集 — 独一无二的亚克力浴缸 | Bathe Atelier",
    "Acrylic vs Stone Resin Bathtubs: Which Is Right for You? (2026 Guide)":"亚克力 vs 石树脂浴缸：哪一种适合你？（2026 指南）",
    "Start Your Design — Contact | Bathe Atelier":"开始你的设计 — 联系我们 | Bathe Atelier",
    "Acrylic vs Stone Resin vs Copper Bathtubs — Materials Guide | Bathe Atelier":"亚克力 vs 石树脂 vs 铜浴缸 — 材质指南 | Bathe Atelier"
  };
  var TITLES_TH={
    "Bathe Atelier — Custom Acrylic Bathtubs, Made in Australia":"Bathe Atelier — อ่างอะคริลิกสั่งทำ ผลิตในออสเตรเลีย",
    "Design Studio — Customize Your Own Bathtub | Bathe Atelier":"สตูดิโอออกแบบ — ออกแบบอ่างอาบน้ำของคุณเอง | Bathe Atelier",
    "Why Acrylic — Lighter, Shapeable, 30–50% Less | Bathe Atelier":"ทำไมต้องอะคริลิก — เบากว่า ขึ้นรูปได้ ถูกกว่า 30–50% | Bathe Atelier",
    "How It Works — Concept to Delivery in 4 Steps | Bathe Atelier":"ขั้นตอนการทำงาน — จากคอนเซ็ปต์สู่การส่งมอบใน 4 ขั้น | Bathe Atelier",
    "For Designers — Trade Programme | Bathe Atelier":"สำหรับนักออกแบบ — โปรแกรมมืออาชีพ | Bathe Atelier",
    "Portfolio — One-of-a-Kind Acrylic Bathtubs | Bathe Atelier":"ผลงาน — อ่างอะคริลิกหนึ่งเดียว | Bathe Atelier",
    "Acrylic vs Stone Resin Bathtubs: Which Is Right for You? (2026 Guide)":"อ่างอะคริลิก เทียบกับ สโตนเรซิน: แบบไหนเหมาะกับคุณ? (คู่มือ 2026)",
    "Start Your Design — Contact | Bathe Atelier":"เริ่มออกแบบของคุณ — ติดต่อเรา | Bathe Atelier",
    "Acrylic vs Stone Resin vs Copper Bathtubs — Materials Guide | Bathe Atelier":"อ่างอะคริลิก vs สโตนเรซิน vs ทองแดง — คู่มือวัสดุ | Bathe Atelier"
  };
  /* dynamic-name maps */
  var shapeEN={oval:"Freestanding Oval",rect:"Modern Rectangle",slipper:"Slipper",round:"Round Drum",japanese:"Japanese Soaking"};
  var shapeZH={oval:"独立式椭圆",rect:"现代矩形",slipper:"斜背式",round:"圆桶式",japanese:"日式深泡"};
  var finishZH={"Gloss White":"亮面白","Matte Black":"哑光黑","Gold Leaf":"金箔","Stone / Marble":"石纹／大理石"};
  var addonZH={"Slotted overflow":"隐藏式溢水口","Freestanding filler tap":"独立式落地龙头","Chromotherapy LED":"七彩疗愈 LED","Air massage jets":"气泡按摩喷头","Integrated headrest":"一体式头枕"};
  var tagZH={"Rectangle":"矩形","Matte Black":"哑光黑","Oval":"椭圆","Gold Leaf":"金箔","Japanese":"日式","Custom colour":"定制色","Round":"圆桶","Gloss White":"亮面白","Slipper":"斜背","Marble":"大理石"};
  var shapeTH={oval:"วงรีตั้งพื้น",rect:"สี่เหลี่ยมโมเดิร์น",slipper:"ทรงสลิปเปอร์",round:"ทรงกลม",japanese:"แช่แบบญี่ปุ่น"};
  var finishTH={"Gloss White":"ขาวเงา","Matte Black":"ดำด้าน","Gold Leaf":"ทองคำเปลว","Stone / Marble":"หิน / หินอ่อน"};
  var addonTH={"Slotted overflow":"ช่องน้ำล้นแบบร่อง","Freestanding filler tap":"ก๊อกตั้งพื้น","Chromotherapy LED":"ไฟ LED บำบัด","Air massage jets":"หัวนวดฟองอากาศ","Integrated headrest":"ที่รองศีรษะในตัว"};
  var tagTH={"Rectangle":"สี่เหลี่ยม","Matte Black":"ดำด้าน","Oval":"วงรี","Gold Leaf":"ทองคำเปลว","Japanese":"ญี่ปุ่น","Custom colour":"สีกำหนดเอง","Round":"ทรงกลม","Gloss White":"ขาวเงา","Slipper":"สลิปเปอร์","Marble":"หินอ่อน"};
  var MSG={
    en:{thanks:function(n){return "✅ Thank you, "+n+"! Your request is in. Our AI concierge has logged it and a designer will follow up within 48 hours.";},
        captured:"Captured:",mailto:"Open this as an email instead →",
        bullets:["Silhouette","Finish","Dimensions","Capacity","Add-ons"],
        none:"None",nohint:"No design selected yet — describe it below, or build one in the Design Studio first.",
        concierge:"👋 Hi! I'm your design concierge.\n\nTell me what you're picturing — a shape, a vibe, a reference — and I'll get a 3D render started. (Live chat connects to the team; this button is a demo placeholder.)"},
    zh:{thanks:function(n){return "✅ 谢谢你，"+n+"！你的需求已送出。我们的 AI 助理已记录，设计师会在 48 小时内跟进。";},
        captured:"已记录：",mailto:"改用 email 寄出 →",
        bullets:["外形","饰面","尺寸","容量","加值选项"],
        none:"无",nohint:"还没有选好设计——可在下方描述，或先到设计工作室打造一个。",
        concierge:"👋 你好！我是你的设计顾问。\n\n告诉我你的想法——外形、风格或参考图，我就帮你启动 3D 渲染。（实际聊天会接到团队；此按钮为示范用。）"},
    th:{thanks:function(n){return "✅ ขอบคุณ "+n+"! เราได้รับคำขอของคุณแล้ว ผู้ช่วย AI บันทึกไว้แล้ว และนักออกแบบจะติดตามภายใน 48 ชั่วโมง";},
        captured:"บันทึกไว้:",mailto:"เปิดเป็นอีเมลแทน →",
        bullets:["รูปทรง","พื้นผิว","ขนาด","ความจุ","ออปชันเสริม"],
        none:"ไม่มี",nohint:"ยังไม่ได้เลือกแบบ — อธิบายด้านล่าง หรือไปสร้างในสตูดิโอออกแบบก่อน",
        concierge:"👋 สวัสดี! ฉันคือที่ปรึกษาด้านการออกแบบของคุณ\n\nบอกสิ่งที่คุณนึกภาพ — รูปทรง สไตล์ หรือภาพอ้างอิง แล้วฉันจะเริ่มทำภาพ 3D ให้ (แชตจริงเชื่อมต่อกับทีม ปุ่มนี้เป็นตัวอย่างสาธิต)"}
  };

  var I18N={lang:"en"};
  function dictFor(l){return l==="zh"?DICT:(l==="th"?DICTTH:null);}
  function titleFor(l){return l==="zh"?TITLES:(l==="th"?TITLES_TH:null);}
  function tr(en){var d=dictFor(I18N.lang);return (d&&d[en])?d[en]:en;}
  var shapeMaps={zh:shapeZH,th:shapeTH},finishMaps={zh:finishZH,th:finishTH},addonMaps={zh:addonZH,th:addonTH},tagMaps={zh:tagZH,th:tagTH};
  function localShape(sh){var m=shapeMaps[I18N.lang];return (m&&m[sh])?m[sh]:shapeEN[sh];}
  function localFinish(f){var m=finishMaps[I18N.lang];if(!m)return f;if(m[f])return m[f];if(f.indexOf("Custom — ")===0)return f.replace("Custom — ",I18N.lang==="th"?"สีกำหนดเอง — ":"定制色 — ");return f;}
  function localAddon(a){var m=addonMaps[I18N.lang];return (m&&m[a])?m[a]:a;}

  /* ===================== mobile nav + language selector ===================== */
  var nav=document.querySelector("nav.site");
  if(nav){
    var wrap=nav.querySelector(".wrap");
    var navlinks=wrap.querySelector(".navlinks");
    var toggle=wrap.querySelector(".menu-toggle");
    var right=document.createElement("div");right.className="nav-right";
    if(navlinks)right.appendChild(navlinks);
    if(toggle)right.appendChild(toggle);
    var sel=document.createElement("select");sel.className="lang-select";sel.setAttribute("aria-label","Language");
    sel.innerHTML='<option value="en">English</option><option value="zh">简体中文</option><option value="th">ไทย</option>';
    right.appendChild(sel);
    wrap.appendChild(right);
    if(toggle)toggle.addEventListener("click",function(){navlinks.classList.toggle("open");});
    sel.addEventListener("change",function(){storeLang(this.value);applyLang(this.value);});
  }

  /* inject "Materials Guide" link into the footer "More" column on every page */
  var avsr=document.querySelector('footer.site a[href="acrylic-vs-stone-resin.html"]');
  if(avsr){var mg=document.createElement("a");mg.href="materials-guide.html";mg.textContent="Materials Guide";avsr.insertAdjacentElement("afterend",mg);}

  /* ===================== i18n apply ===================== */
  var textCache=[],phCache=[],origTitle=document.title;
  (function initCache(){
    if(!document.body)return;
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
    var n;
    while(n=w.nextNode()){
      var v=n.nodeValue,t=v.trim();
      if(!t)continue;
      var lead=v.match(/^\s*/)[0],trail=v.match(/\s*$/)[0];
      textCache.push({node:n,en:t,l:lead,r:trail});
    }
    var els=document.querySelectorAll("[placeholder]");
    for(var i=0;i<els.length;i++)phCache.push({el:els[i],en:els[i].getAttribute("placeholder")});
  })();

  function applyLang(lang){
    I18N.lang=lang;
    var dd=dictFor(lang);
    for(var i=0;i<textCache.length;i++){
      var c=textCache[i];
      var txt=(dd&&dd[c.en])?dd[c.en]:c.en;
      c.node.nodeValue=c.l+txt+c.r;
    }
    for(var j=0;j<phCache.length;j++){
      var p=phCache[j];
      p.el.setAttribute("placeholder",(dd&&dd[p.en])?dd[p.en]:p.en);
    }
    var tt=titleFor(lang);document.title=(tt&&tt[origTitle])?tt[origTitle]:origTitle;
    document.documentElement.lang=lang==="zh"?"zh-CN":(lang==="th"?"th":"en");
    rerender();
    var s=document.querySelector(".lang-select");if(s)s.value=lang;
    // Sync Tidio chat language
    var tidioLang=lang==="zh"?"zh":(lang==="th"?"th":"en");
    if(window.tidioChatApi&&typeof window.tidioChatApi.setLanguage==="function"){
      window.tidioChatApi.setLanguage(tidioLang);
    } else {
      window.tidioChatLang=tidioLang;
    }
  }
  var rerenderFns=[];
  function rerender(){for(var i=0;i<rerenderFns.length;i++)rerenderFns[i]();}

  /* ===================== shared tub model ===================== */
  function shade(hex,amt){
    hex=String(hex).replace("#","");
    if(hex.length===3)hex=hex.split("").map(function(c){return c+c;}).join("");
    var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);
    function adj(v){return Math.max(0,Math.min(255,Math.round(amt<0?v*(1+amt):v+(255-v)*amt)));}
    function h(v){var s=v.toString(16);return s.length<2?"0"+s:s;}
    return "#"+h(adj(r))+h(adj(g))+h(adj(b));
  }
  function capacityOf(s){
    var l=s.len/1000,w=s.wid/1000,d=(s.dep-150)/1000;if(d<0.05)d=0.05;
    var fill={oval:0.42,rect:0.5,slipper:0.36,round:0.4,japanese:0.55}[s.shape];
    return Math.round(l*w*d*fill*1000/5)*5;
  }
  function fmtSize(s){return s.len+" × "+s.wid+" × "+s.dep+" mm";}
  function fmtAddons(s){if(!s.addons||!s.addons.length)return MSG[I18N.lang].none;return s.addons.map(localAddon).join(I18N.lang==="zh"?"、":", ");}

  function buildTubSVG(s){
    var W=600,H=360;
    var base=s.base,light=shade(base,0.55),lighter=shade(base,0.8),dark=shade(base,-0.32),darker=shade(base,-0.55);
    var lenK=(s.len-1300)/900,widK=(s.wid-650)/450,depK=(s.dep-400)/350;
    var bodyW=300+lenK*150,bodyH=120+depK*70;
    var cx=W/2,topY=120,ellH=46+widK*34;
    var leftX=cx-bodyW/2,rightX=cx+bodyW/2,floorY=topY+bodyH;
    var gid="g"+Math.random().toString(36).slice(2,7);
    var defs='<defs>'+
      '<linearGradient id="body'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+light+'"/><stop offset="0.5" stop-color="'+base+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient>'+
      '<linearGradient id="rim'+gid+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="'+dark+'"/><stop offset="0.5" stop-color="'+lighter+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient>'+
      '<radialGradient id="basin'+gid+'" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="'+darker+'"/><stop offset="1" stop-color="'+dark+'"/></radialGradient>'+
      '<linearGradient id="floor'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.05)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></linearGradient>'+
    '</defs>';
    var shadowEl='<ellipse cx="'+cx+'" cy="'+(floorY+34)+'" rx="'+(bodyW/2+20)+'" ry="22" fill="rgba(0,0,0,0.45)"/>';
    var veins=(s.finish==="Stone / Marble")?'<g stroke="rgba(120,120,120,0.35)" stroke-width="1.4" fill="none" opacity="0.7"><path d="M'+(leftX+30)+' '+(topY+30)+' q60 25 120 5 q70 -20 150 25"/><path d="M'+(leftX+60)+' '+(topY+80)+' q90 -15 180 30 q40 18 90 5"/><path d="M'+(leftX+20)+' '+(topY+110)+' q120 30 240 -10"/></g>':'';
    var sparkle=(s.finish==="Gold Leaf")?'<g fill="rgba(255,248,220,0.85)"><circle cx="'+(cx-60)+'" cy="'+(topY+40)+'" r="2.2"/><circle cx="'+(cx+40)+'" cy="'+(topY+70)+'" r="1.6"/><circle cx="'+(cx+90)+'" cy="'+(topY+30)+'" r="1.8"/><circle cx="'+(cx-30)+'" cy="'+(topY+100)+'" r="1.4"/></g>':'';
    var body="";
    if(s.shape==="oval"||s.shape==="round"){
      var rx=(s.shape==="round")?bodyW/2*0.7:bodyW/2;
      if(s.shape==="round"){leftX=cx-rx;rightX=cx+rx;}
      body='<ellipse cx="'+cx+'" cy="'+floorY+'" rx="'+rx+'" ry="'+ellH+'" fill="url(#body'+gid+')"/>'+
        '<rect x="'+(cx-rx)+'" y="'+topY+'" width="'+(2*rx)+'" height="'+bodyH+'" fill="url(#body'+gid+')"/>'+
        '<ellipse cx="'+cx+'" cy="'+topY+'" rx="'+rx+'" ry="'+ellH+'" fill="url(#rim'+gid+')"/>'+
        '<ellipse cx="'+cx+'" cy="'+topY+'" rx="'+(rx-22)+'" ry="'+(ellH-15)+'" fill="url(#basin'+gid+')"/>';
    } else if(s.shape==="rect"||s.shape==="japanese"){
      var r=(s.shape==="japanese")?10:26;
      var bw=(s.shape==="japanese")?bodyW*0.78:bodyW;
      leftX=cx-bw/2;rightX=cx+bw/2;
      var bh=(s.shape==="japanese")?bodyH+30:bodyH;
      body='<path d="M'+leftX+' '+topY+' h'+bw+' v'+bh+' q0 18 -18 18 h'+(-(bw-36))+' q-18 0 -18 -18 z" fill="url(#body'+gid+')"/>'+
        '<rect x="'+leftX+'" y="'+(topY-ellH*0.5)+'" width="'+bw+'" height="'+ellH+'" rx="'+r+'" fill="url(#rim'+gid+')"/>'+
        '<rect x="'+(leftX+20)+'" y="'+(topY-ellH*0.5+10)+'" width="'+(bw-40)+'" height="'+(ellH-16)+'" rx="'+(r-4)+'" fill="url(#basin'+gid+')"/>';
    } else if(s.shape==="slipper"){
      var rx2=bodyW/2,backTop=topY-72;
      body='<ellipse cx="'+cx+'" cy="'+floorY+'" rx="'+rx2+'" ry="'+ellH+'" fill="url(#body'+gid+')"/>'+
        '<rect x="'+(cx-rx2)+'" y="'+topY+'" width="'+(2*rx2)+'" height="'+bodyH+'" fill="url(#body'+gid+')"/>'+
        '<path d="M'+(cx-rx2)+' '+(topY+6)+' Q'+(cx-rx2-8)+' '+backTop+' '+(cx-rx2+52)+' '+(backTop-2)+' Q'+(cx-rx2+110)+' '+backTop+' '+(cx-rx2+96)+' '+(topY+4)+' Z" fill="url(#body'+gid+')" stroke="'+shade(base,-0.12)+'" stroke-width="1"/>'+
        '<ellipse cx="'+cx+'" cy="'+topY+'" rx="'+rx2+'" ry="'+ellH+'" fill="url(#rim'+gid+')"/>'+
        '<ellipse cx="'+cx+'" cy="'+topY+'" rx="'+(rx2-22)+'" ry="'+(ellH-15)+'" fill="url(#basin'+gid+')"/>';
    }
    var extras="",addons=s.addons||[];
    if(addons.indexOf("Freestanding filler tap")>-1)extras+='<g stroke="'+shade(base,-0.1)+'" stroke-width="6" fill="none" stroke-linecap="round"><path d="M'+(rightX+30)+' '+(floorY+30)+' V'+(topY-30)+' q0 -18 -26 -18"/></g>';
    if(addons.indexOf("Chromotherapy LED")>-1)extras+='<ellipse cx="'+cx+'" cy="'+topY+'" rx="'+((rightX-leftX)/2)+'" ry="'+ellH+'" fill="none" stroke="rgba(120,200,255,0.8)" stroke-width="2.5"><animate attributeName="stroke" values="rgba(120,200,255,.8);rgba(200,140,255,.8);rgba(140,255,190,.8);rgba(120,200,255,.8)" dur="4s" repeatCount="indefinite"/></ellipse>';
    if(addons.indexOf("Integrated headrest")>-1)extras+='<rect x="'+(leftX+14)+'" y="'+(topY-6)+'" width="46" height="14" rx="7" fill="'+shade(base,-0.2)+'"/>';
    return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bathtub preview">'+
      defs+shadowEl+body+veins+sparkle+extras+
      '<rect x="0" y="'+(floorY+50)+'" width="'+W+'" height="40" fill="url(#floor'+gid+')"/></svg>';
  }
  function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}

  /* ===================== home hero preview ===================== */
  var heroArt=document.getElementById("heroArt");
  if(heroArt)heroArt.innerHTML=buildTubSVG({shape:"oval",finish:"Gloss White",base:"#f4f6f8",len:1700,wid:800,dep:580,addons:["Freestanding filler tap"]});

  /* ===================== configurator ===================== */
  var preview=document.getElementById("preview");
  if(preview){
    var state={shape:"oval",finish:"Gloss White",base:"#f4f6f8",len:1700,wid:800,dep:580,addons:[]};
    function toQuery(){
      return "contact.html?shape="+state.shape+"&finish="+encodeURIComponent(state.finish)+"&base="+encodeURIComponent(state.base)+"&len="+state.len+"&wid="+state.wid+"&dep="+state.dep+"&addons="+encodeURIComponent(state.addons.join("|"));
    }
    function renderStudio(){
      preview.innerHTML=buildTubSVG(state);
      setText("sp-shape",localShape(state.shape));setText("sp-finish",localFinish(state.finish));
      setText("sp-size",fmtSize(state));setText("sp-cap","≈ "+capacityOf(state)+" L");
      setText("v-len",state.len);setText("v-wid",state.wid);setText("v-dep",state.dep);
      var link=document.getElementById("toContact");if(link)link.setAttribute("href",toQuery());
    }
    rerenderFns.push(renderStudio);
    var so=document.getElementById("shapeOpts");
    if(so)so.addEventListener("click",function(e){var t=e.target.closest(".opt");if(!t)return;
      so.querySelectorAll(".opt").forEach(function(o){o.classList.remove("active");});t.classList.add("active");
      state.shape=t.getAttribute("data-shape");renderStudio();});
    var fs=document.getElementById("finishSwatches");
    if(fs)fs.addEventListener("click",function(e){var sw=e.target.closest(".sw");if(!sw)return;
      fs.querySelectorAll(".sw").forEach(function(o){o.classList.remove("active");});sw.classList.add("active");
      state.finish=sw.getAttribute("data-finish");state.base=sw.getAttribute("data-base");renderStudio();});
    var cc=document.getElementById("customColor");
    if(cc)cc.addEventListener("input",function(){
      document.querySelectorAll("#finishSwatches .sw").forEach(function(o){o.classList.remove("active");});
      state.finish="Custom — "+this.value.toUpperCase();state.base=this.value;renderStudio();});
    ["len","wid","dep"].forEach(function(k){var el=document.getElementById(k);
      if(el)el.addEventListener("input",function(){state[k]=parseInt(this.value,10);renderStudio();});});
    var ad=document.getElementById("addons");
    if(ad)ad.addEventListener("click",function(e){var c=e.target.closest(".chip");if(!c)return;
      var a=c.getAttribute("data-addon"),i=state.addons.indexOf(a);
      if(i>-1){state.addons.splice(i,1);c.classList.remove("active");}else{state.addons.push(a);c.classList.add("active");}renderStudio();});
    renderStudio();
  }

  /* ===================== portfolio ===================== */
  var gal=document.getElementById("gallery");
  if(gal){
    var pieces=[
      {t_en:"The Monolith",t_zh:"巨石",t_th:"โมโนลิธ",d_en:"Matte-black rectangle for a Melbourne penthouse ensuite.",d_zh:"为墨尔本顶层套房主浴打造的哑光黑矩形浴缸。",d_th:"อ่างสี่เหลี่ยมดำด้านสำหรับห้องน้ำเพนต์เฮาส์ในเมลเบิร์น",tags:["Rectangle","Matte Black"],s:{shape:"rect",finish:"Matte Black",base:"#22252b",len:1900,wid:900,dep:600,addons:["Integrated headrest"]}},
      {t_en:"Aurelia",t_zh:"奥蕾莉亚",t_th:"ออเรเลีย",d_en:"Gold-leaf oval centrepiece for a heritage Sydney bathroom.",d_zh:"为雪梨古迹浴室打造的金箔椭圆主角浴缸。",d_th:"อ่างวงรีทองคำเปลวชิ้นเอกสำหรับห้องน้ำมรดกในซิดนีย์",tags:["Oval","Gold Leaf"],s:{shape:"oval",finish:"Gold Leaf",base:"#cBa45a",len:1750,wid:850,dep:600,addons:["Freestanding filler tap"]}},
      {t_en:"Ofuro No.7",t_zh:"汤屋七号",t_th:"โอฟุโระ หมายเลข 7",d_en:"Deep Japanese soaking tub, compact footprint, cedar-tone interior.",d_zh:"日式深泡浴缸，占地精巧，雪松色内壁。",d_th:"อ่างแช่ญี่ปุ่นทรงลึก ขนาดกะทัดรัด ผนังในโทนไม้ซีดาร์",tags:["Japanese","Custom colour"],s:{shape:"japanese",finish:"Custom",base:"#7a5c43",len:1400,wid:1000,dep:720,addons:["Integrated headrest"]}},
      {t_en:"Pearl Drum",t_zh:"珍珠鼓",t_th:"เพิร์ลดรัม",d_en:"Round gloss-white drum tub for a wellness studio.",d_zh:"为养生工作室打造的亮面白圆桶浴缸。",d_th:"อ่างทรงกลมขาวเงาสำหรับสตูดิโอเพื่อสุขภาพ",tags:["Round","Gloss White"],s:{shape:"round",finish:"Gloss White",base:"#f4f6f8",len:1500,wid:1100,dep:680,addons:["Chromotherapy LED"]}},
      {t_en:"Carrara Slip",t_zh:"卡拉拉斜背",t_th:"คาร์รารา สลิป",d_en:"Stone-look slipper tub with chromotherapy lighting.",d_zh:"仿石斜背浴缸，搭配七彩疗愈灯光。",d_th:"อ่างสลิปเปอร์เลียนแบบหิน พร้อมไฟบำบัด",tags:["Slipper","Marble"],s:{shape:"slipper",finish:"Stone / Marble",base:"#e7e3da",len:1700,wid:800,dep:620,addons:["Chromotherapy LED"]}},
      {t_en:"Coastline",t_zh:"海岸线",t_th:"โคสต์ไลน์",d_en:"Soft-blue custom colour-match oval for a Gold Coast villa.",d_zh:"为黄金海岸别墅定制配色的浅蓝椭圆浴缸。",d_th:"อ่างวงรีสีฟ้าอ่อนจับคู่สีเฉพาะสำหรับวิลล่าโกลด์โคสต์",tags:["Oval","Custom colour"],s:{shape:"oval",finish:"Custom",base:"#7aa6c2",len:1800,wid:820,dep:560,addons:["Freestanding filler tap"]}}
    ];
    function renderGallery(){
      gal.innerHTML=pieces.map(function(p){
        var title=I18N.lang==="zh"?p.t_zh:(I18N.lang==="th"?p.t_th:p.t_en);
        var desc=I18N.lang==="zh"?p.d_zh:(I18N.lang==="th"?p.d_th:p.d_en);
        var tm=tagMaps[I18N.lang];
        var tags=p.tags.map(function(x){return "<span>"+((tm&&tm[x])?tm[x]:x)+"</span>";}).join("");
        return '<div class="tile"><div class="pic">'+buildTubSVG(p.s)+'</div><div class="meta"><h3>'+title+'</h3><p>'+desc+'</p><div class="tags">'+tags+'</div></div></div>';
      }).join("");
    }
    rerenderFns.push(renderGallery);
    renderGallery();
  }

  /* ===================== contact page ===================== */
  var form=document.getElementById("leadForm");
  if(form){
    var params=new URLSearchParams(location.search);
    var has=params.has("shape");
    var cs={
      shape:params.get("shape")||"oval",
      finish:params.get("finish")||"Gloss White",
      base:params.get("base")||"#f4f6f8",
      len:parseInt(params.get("len"),10)||1700,
      wid:parseInt(params.get("wid"),10)||800,
      dep:parseInt(params.get("dep"),10)||580,
      addons:(params.get("addons")?params.get("addons").split("|").filter(Boolean):[])
    };
    function fillSummary(){
      setText("f-shape",localShape(cs.shape));setText("f-finish",localFinish(cs.finish));
      setText("f-size",fmtSize(cs));setText("f-cap","≈ "+capacityOf(cs)+" L");setText("f-addons",fmtAddons(cs));
      var pv=document.getElementById("contactPreview");if(pv)pv.innerHTML=buildTubSVG(cs);
      var hint=document.getElementById("designHint");if(hint&&!has)hint.textContent=MSG[I18N.lang].nohint;
    }
    rerenderFns.push(fillSummary);
    fillSummary();
    var ref=document.getElementById("ref");
    if(ref)ref.addEventListener("change",function(){setText("fileLabel",this.files.length?this.files[0].name:tr("Click to attach a sketch, photo or floor plan"));});
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var m=MSG[I18N.lang],el=function(n){return form.elements.namedItem(n);};
      var name=(el("name")&&el("name").value)||(I18N.lang==="zh"?"你":"there");
      var b=m.bullets;
      var disp="• "+b[0]+": "+localShape(cs.shape)+"\n• "+b[1]+": "+localFinish(cs.finish)+"\n• "+b[2]+": "+fmtSize(cs)+"\n• "+b[3]+": ≈"+capacityOf(cs)+" L\n• "+b[4]+": "+fmtAddons(cs);
      var bodyEN="Hi Bathe Atelier,\n\nMy custom bathtub design:\n• Silhouette: "+shapeEN[cs.shape]+"\n• Finish: "+cs.finish+"\n• Dimensions: "+fmtSize(cs)+"\n• Capacity: ≈"+capacityOf(cs)+" L\n• Add-ons: "+(cs.addons.length?cs.addons.join(", "):"None")+"\n\nInterested in: "+(el("want")?el("want").value:"")+"\nName: "+name+"\nRole: "+(el("role")?el("role").value:"")+"\nEmail: "+(el("email")?el("email").value:"")+"\nCountry: "+(el("country")?el("country").value:"")+"\nProject: "+(el("brief")?el("brief").value:"");
      var banner=document.getElementById("okBanner");
      banner.style.display="block";
      banner.innerHTML=m.thanks(name.replace(/[<>]/g,""))+"<br><br><b>"+m.captured+"</b><br>"+disp.replace(/\n/g,"<br>")+'<br><br><a style="color:#e0c790;text-decoration:underline" href="mailto:hello@batheatelier.com?subject=Custom%20Bathtub%20Design%20Request&body='+encodeURIComponent(bodyEN)+'">'+m.mailto+'</a>';
      if(banner.scrollIntoView)banner.scrollIntoView({behavior:"smooth",block:"center"});
    });
  }


  /* apply saved language (default English on first visit) */
  var savedLang=readLang();
  if(savedLang&&savedLang!=="en"){applyLang(savedLang);}
  else{var ls=document.querySelector(".lang-select");if(ls)ls.value="en";}

})();
